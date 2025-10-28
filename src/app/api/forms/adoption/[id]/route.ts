import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  fillAdoptionApplicationPdf,
  type AdoptionApplicationValues,
  type PhotoInput,
} from "@/lib/fillAdoptionForm";
import { PET_MEDIA_BUCKET } from "@/data/supabaseApi";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readPublicAsset(relPath: string): Promise<ArrayBuffer> {
  const full = path.join(process.cwd(), "public", relPath.replace(/^\//, ""));
  const buf = await fs.readFile(full);
  const base = buf.buffer as ArrayBuffer; // ensure ArrayBuffer (not SharedArrayBuffer)
  return base.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const url = new URL(req.url);
  const flatten = url.searchParams.get("flatten") !== "0"; // default true
  const persist = url.searchParams.get("persist") === "1";
  const download = url.searchParams.get("download") === "1";
  const photoFieldsParam = url.searchParams.get("photoFields");
  const petPhotoField = url.searchParams.get("petPhotoField") || undefined;
  const gridFallback = url.searchParams.get("gridFallback") === "1";
  const photoFieldNames = photoFieldsParam
    ? photoFieldsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
    : undefined;

  try {
    // Prefer service role; gracefully fall back to anon client if not configured
    let supabase: SupabaseClient;
    try {
      supabase = createServerSupabaseClient();
    } catch {
      const supabaseUrl =
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          { error: "Supabase env vars missing" },
          { status: 500 }
        );
      }
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });
    }

    const { data, error } = await supabase
      .from("adoption_applications")
      .select("*, adoption_pets:pet_id ( * )")
      .eq("id", id)
      .maybeSingle();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const template = await readPublicAsset("/pdfs/PawSagip_Form.pdf");

    // Prepare up to 6 home photos for embedding
    const photos: PhotoInput[] = [];
    const paths = Array.isArray((data as any)?.home_photo_paths)
      ? ((data as any).home_photo_paths as string[])
      : [];
    const limited = paths.filter(Boolean).slice(0, 3);
    for (const p of limited) {
      try {
        const { data: file, error: dlErr } = await supabase.storage
          .from(PET_MEDIA_BUCKET)
          .download(p);
        if (dlErr || !file) continue;
        const buf = await file.arrayBuffer();
        const mime =
          (file as any).type ||
          (p.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
        photos.push({ data: buf, mimeType: mime });
      } catch {
        // skip any failed photo
      }
    }

    // Prepare pet photo if available (from adoption_pets.photo_path)
    let petPhoto: PhotoInput | null = null;
    try {
      const ap = (data as any)?.adoption_pets;
      const pet = Array.isArray(ap) ? ap[0] ?? null : ap;
      const pathCandidates: string[] = [
        pet?.photo_path,
        pet?.main_photo_path,
        pet?.primary_photo_path,
        pet?.cover_photo_path,
        pet?.image_path,
      ].filter(Boolean);
      for (const pth of pathCandidates) {
        const { data: file, error: pErr } = await supabase.storage
          .from(PET_MEDIA_BUCKET)
          .download(pth);
        if (!pErr && file) {
          const buf = await file.arrayBuffer();
          const mime =
            (file as any).type ||
            (pth.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
          petPhoto = { data: buf, mimeType: mime };
          break;
        }
      }
      if (!petPhoto) {
        const urlCandidates: string[] = [
          pet?.photo_url,
          pet?.main_photo_url,
          pet?.primary_photo_url,
          pet?.cover_photo_url,
          pet?.image_url,
        ].filter((u: any) => typeof u === "string");
        for (const u of urlCandidates) {
          try {
            const resp = await fetch(u);
            if (resp.ok) {
              const buf = await resp.arrayBuffer();
              const mime = resp.headers.get("content-type") || null;
              petPhoto = { data: buf, mimeType: mime };
              break;
            }
          } catch {}
        }
      }
    } catch {
      // ignore pet photo errors
    }

    // If pet photo not found, fallback to the first home photo
    if (!petPhoto && photos.length > 0) {
      petPhoto = photos[0];
    }

    const bytes = await fillAdoptionApplicationPdf(
      template,
      data as AdoptionApplicationValues,
      {
        flatten,
        photos,
        photoFieldNames,
        petPhoto,
        petPhotoFieldName: petPhotoField || "Pet_Photo",
        allowGridFallback: gridFallback,
      }
    );

    // Create a Blob once so we can reuse for storage + HTTP response
    const pdfBlob = new Blob([bytes], { type: "application/pdf" });

    // Optionally persist to Supabase Storage (bucket: generated-pdfs)
    let savedPath: string | null = null;
    if (persist) {
      try {
        const uploadPath = `adoptions/${id}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("generated-pdfs")
          .upload(uploadPath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (!upErr) savedPath = uploadPath;
      } catch {
        // ignore persistence errors; still return the PDF
      }
    }

    const res = new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          download ? "attachment" : "inline"
        }; filename="PawSagip-Application-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
    if (savedPath) res.headers.set("X-Persisted-Path", savedPath);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
