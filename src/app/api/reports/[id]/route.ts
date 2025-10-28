import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PET_MEDIA_BUCKET } from "@/data/supabaseApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrivileged(user: any): boolean {
  try {
    const meta = user?.app_metadata || user?.user_metadata || {};
    const single = (meta.role as string | undefined)?.toLowerCase?.();
    const many = Array.isArray(meta.roles)
      ? (meta.roles as string[]).map((r) => r.toLowerCase())
      : [];
    const set = new Set([single, ...many].filter(Boolean));
    return set.has("admin") || set.has("moderator") || set.has("staff");
  } catch {
    return false;
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  // Service client (for storage) and DB-as-user client (RLS enforced)
  const storageAdmin = createServerSupabaseClient();
  let dbAsUser: SupabaseClient | null = null;

  // Resolve current user from cookies
  let currentUser: any = null;
  try {
    const jar = cookies();
    // Prefer Authorization header if the client provided it
    const headerAuth = request.headers.get("authorization") || request.headers.get("Authorization");
    const headerToken = headerAuth && /^Bearer\s+(.+)$/i.test(headerAuth)
      ? (headerAuth.match(/^Bearer\s+(.+)$/i)![1] ?? null)
      : null;
    const getFromAuthTokenCookie = (): string | null => {
      // Look for the cookie used by supabase-js: sb-<project-ref>-auth-token
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

    const accessToken =
      headerToken || jar.get("sb-access-token")?.value || getFromAuthTokenCookie();
    if (accessToken) {
      // Also build a DB client that runs with the user's token (so RLS applies)
      const supabaseUrl =
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
          { error: "Supabase env vars missing" },
          { status: 500 }
        );
      }
      dbAsUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false },
      });
      const { data } = await storageAdmin.auth.getUser(accessToken);
      currentUser = data?.user ?? null;
    }
  } catch {
    // keep null
  }

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!dbAsUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete the report via RLS as the user and return media paths to clean up
  const { data: deletedRow, error: delErr, status } = await dbAsUser
    .from("reports")
    .delete()
    .eq("id", id)
    .select("photo_path, landmark_media_paths")
    .maybeSingle();
  if (delErr) {
    if (status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (status === 401 || status === 403)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Best-effort: delete storage files AFTER DB delete succeeded
  try {
    const toRemove: string[] = [];
    if (deletedRow?.photo_path) toRemove.push(deletedRow.photo_path as string);
    if (Array.isArray(deletedRow?.landmark_media_paths)) {
      for (const p of deletedRow.landmark_media_paths) if (p) toRemove.push(p);
    }
    if (toRemove.length) {
      await storageAdmin.storage.from(PET_MEDIA_BUCKET).remove(toRemove);
    }
  } catch {
    // ignore storage failures
  }

  return NextResponse.json({ success: true });
}
