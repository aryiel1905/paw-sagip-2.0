import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveScopeFromRequest, isSuper } from "@/lib/adminScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensurePetScoped(petId: string, scope: Awaited<ReturnType<typeof resolveScopeFromRequest>> | null, supabase: ReturnType<typeof createServerSupabaseClient>) {
  if (!scope || isSuper(scope)) return true;
  if (!scope.teamIds.length) return false;
  const { data: rep } = await supabase
    .from("reports")
    .select("id, team_id")
    .eq("promoted_to_pet_id", petId)
    .maybeSingle();
  if (!rep) return false;
  return (scope.teamIds || []).includes(String((rep as any).team_id));
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const scope = await resolveScopeFromRequest(request);
  if (!scope && !process.env.ALLOW_UNSCOPED_ADMIN) {
    return NextResponse.json({ error: "Missing x-profile-id" }, { status: 401 });
  }
  const url = new URL(request.url);
  const petId = url.searchParams.get("petId");
  if (!petId) return NextResponse.json({ error: "petId is required" }, { status: 400 });

  const ok = await ensurePetScoped(petId, scope, supabase);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("adoption_applications")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: Array.isArray(data) ? data : [] });
}

type PatchPayload = {
  id: string;
  // applicant + questionnaire fields (subset to update)
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
  occupation?: string | null;
  company?: string | null;
  social_profile?: string | null;
  civil_status?: string | null;
  pronouns?: string | null;
  adopted_before?: boolean | null;
  prompted_by?: string[] | null;
  id_document_type?: string | null;
  id_document_path?: string | null;
  adopt_what?: string | null;
  home_type?: string | null;
  rents?: boolean | null;
  move_plan?: string | null;
  live_with?: string[] | null;
  allergies?: boolean | null;
  family_supports?: boolean | null;
  daily_care_by?: string | null;
  financial_responsible?: string | null;
  vacation_caregiver?: string | null;
  hours_alone?: string | null;
  intro_steps?: string | null;
  has_pets_now?: boolean | null;
  had_pets_past?: boolean | null;
  status?: "pending" | "approved" | "rejected";
};

export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClient();
  const scope = await resolveScopeFromRequest(request);
  if (!scope && !process.env.ALLOW_UNSCOPED_ADMIN) {
    return NextResponse.json({ error: "Missing x-profile-id" }, { status: 401 });
  }
  let body: PatchPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Read existing application to determine pet scope
  const { data: existing, error: readErr } = await supabase
    .from("adoption_applications")
    .select("id, pet_id, status")
    .eq("id", body.id)
    .maybeSingle();
  if (readErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const petId = String((existing as any).pet_id);
  const ok = await ensurePetScoped(petId, scope, supabase);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Whitelist fields for update
  const allowed: Record<string, unknown> = {};
  const keys: (keyof PatchPayload)[] = [
    "first_name",
    "last_name",
    "address",
    "phone",
    "email",
    "birth_date",
    "occupation",
    "company",
    "social_profile",
    "civil_status",
    "pronouns",
    "adopted_before",
    "prompted_by",
    "id_document_type",
    "id_document_path",
    "adopt_what",
    "home_type",
    "rents",
    "move_plan",
    "live_with",
    "allergies",
    "family_supports",
    "daily_care_by",
    "financial_responsible",
    "vacation_caregiver",
    "hours_alone",
    "intro_steps",
    "has_pets_now",
    "had_pets_past",
    "status",
  ];
  for (const k of keys) if (k in body) (allowed as any)[k] = (body as any)[k];

  const { error: updErr } = await supabase
    .from("adoption_applications")
    .update(allowed)
    .eq("id", body.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // Side-effect: if approved, resolve the linked report
  try {
    if (allowed.status === "approved") {
      await supabase
        .from("reports")
        .update({ status: "resolved" })
        .eq("promoted_to_pet_id", petId);
    }
  } catch {}

  return NextResponse.json({ success: true });
}

