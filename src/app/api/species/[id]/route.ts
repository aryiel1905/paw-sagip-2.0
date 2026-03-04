import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveScopeFromRequest, isSuper } from "@/lib/adminScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function requireSuperAdmin(request: Request) {
  const scope = await resolveScopeFromRequest(request);
  if (!scope && !process.env.ALLOW_UNSCOPED_ADMIN) {
    return { ok: false as const, response: NextResponse.json({ error: "Missing x-profile-id" }, { status: 401 }) };
  }
  if (scope && !isSuper(scope)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(request);
  if (!admin.ok) return admin.response;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, any> = {};
  if (payload?.canonicalName !== undefined || payload?.canonical_name !== undefined) {
    patch.canonical_name = String(payload?.canonicalName ?? payload?.canonical_name ?? "").trim();
  }
  if (payload?.normalizedName !== undefined || payload?.normalized_name !== undefined) {
    patch.normalized_name = normalize(String(payload?.normalizedName ?? payload?.normalized_name ?? ""));
  } else if (patch.canonical_name) {
    patch.normalized_name = normalize(patch.canonical_name);
  }
  if (payload?.isDomesticAdoptable !== undefined || payload?.is_domestic_adoptable !== undefined) {
    patch.is_domestic_adoptable = Boolean(
      payload?.isDomesticAdoptable ?? payload?.is_domestic_adoptable
    );
  }
  if (payload?.careProfile !== undefined || payload?.care_profile !== undefined) {
    patch.care_profile = String(payload?.careProfile ?? payload?.care_profile ?? "standard");
  }
  if (payload?.active !== undefined) patch.active = Boolean(payload.active);
  if (payload?.sortOrder !== undefined || payload?.sort_order !== undefined) {
    patch.sort_order = Number(payload?.sortOrder ?? payload?.sort_order ?? 100);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("animal_species")
    .update(patch)
    .eq("id", id)
    .select("id, canonical_name, normalized_name, is_domestic_adoptable, care_profile, active, sort_order, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

