import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PET_MEDIA_BUCKET } from "@/data/supabaseApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Service client for storage cleanup; dbAsUser for RLS-enforced delete
  const storageAdmin = createServerSupabaseClient();
  let dbAsUser: SupabaseClient | null = null;

  try {
    const jar = cookies();
    // Prefer Authorization header if provided by the client
    const headerAuth = request.headers.get("authorization") || request.headers.get("Authorization");
    const headerToken = headerAuth && /^Bearer\s+(.+)$/i.test(headerAuth)
      ? (headerAuth.match(/^Bearer\s+(.+)$/i)![1] ?? null)
      : null;

    const getFromAuthTokenCookie = (): string | null => {
      try {
        const all = (jar as any).getAll?.() || [];
        const match = all.find((c: any) => /sb-.*-auth-token/.test(c?.name));
        const raw = match?.value as string | undefined;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === "string") return parsed[0];
          if (parsed[0]?.access_token) return parsed[0].access_token as string;
        }
        if (parsed && typeof parsed === "object" && parsed.access_token) {
          return parsed.access_token as string;
        }
      } catch {}
      return null;
    };

    const accessToken = headerToken || jar.get("sb-access-token")?.value || getFromAuthTokenCookie();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }
    dbAsUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Perform delete via RLS as the current user; return media paths for cleanup
  const { data: deletedRow, error: delErr, status } = await dbAsUser!
    .from("adoption_applications")
    .delete()
    .eq("id", id)
    .select("home_photo_paths, id_document_path")
    .maybeSingle();

  if (delErr) {
    if (status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (status === 401 || status === 403)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Best-effort storage cleanup
  try {
    const toRemove: string[] = [];
    if (deletedRow?.id_document_path) toRemove.push(deletedRow.id_document_path as string);
    if (Array.isArray(deletedRow?.home_photo_paths)) {
      for (const p of deletedRow.home_photo_paths) if (p) toRemove.push(p);
    }
    if (toRemove.length) {
      await storageAdmin.storage.from(PET_MEDIA_BUCKET).remove(toRemove);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true });
}

