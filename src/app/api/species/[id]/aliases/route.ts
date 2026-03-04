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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin(request);
  if (!admin.ok) return admin.response;

  const { id: speciesId } = await context.params;
  if (!speciesId) return NextResponse.json({ error: "Missing species id" }, { status: 400 });

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const alias = String(payload?.alias || "").trim();
  const aliasNormalized = normalize(payload?.aliasNormalized || payload?.alias_normalized || alias);
  if (!alias || !aliasNormalized) {
    return NextResponse.json({ error: "alias is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("animal_species_aliases")
    .insert([
      {
        species_id: speciesId,
        alias,
        alias_normalized: aliasNormalized,
      },
    ])
    .select("id, species_id, alias, alias_normalized")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

