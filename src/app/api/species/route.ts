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

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";

  let query = supabase
    .from("animal_species")
    .select("id, canonical_name, normalized_name, is_domestic_adoptable, care_profile, active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("canonical_name", { ascending: true });

  if (!includeInactive) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  return NextResponse.json({ items: Array.isArray(data) ? data : [] });
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin.ok) return admin.response;

  const supabase = createServerSupabaseClient();
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const canonicalName = String(payload?.canonicalName || payload?.canonical_name || "").trim();
  const normalizedInput = String(payload?.normalizedName || payload?.normalized_name || "").trim();
  const normalizedName = normalize(normalizedInput || canonicalName);

  if (!canonicalName || !normalizedName) {
    return NextResponse.json({ error: "canonicalName is required" }, { status: 400 });
  }

  const insertRow = {
    canonical_name: canonicalName,
    normalized_name: normalizedName,
    is_domestic_adoptable:
      typeof payload?.isDomesticAdoptable === "boolean"
        ? payload.isDomesticAdoptable
        : typeof payload?.is_domestic_adoptable === "boolean"
        ? payload.is_domestic_adoptable
        : true,
    care_profile: String(payload?.careProfile || payload?.care_profile || "standard"),
    active:
      typeof payload?.active === "boolean"
        ? payload.active
        : true,
    sort_order:
      typeof payload?.sortOrder === "number"
        ? payload.sortOrder
        : typeof payload?.sort_order === "number"
        ? payload.sort_order
        : 100,
  };

  const { data, error } = await supabase
    .from("animal_species")
    .insert([insertRow])
    .select("id, canonical_name, normalized_name, is_domestic_adoptable, care_profile, active, sort_order, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

