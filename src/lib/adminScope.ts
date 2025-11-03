import { createServerSupabaseClient } from "@/lib/supabaseServer";

export type AdminScope = {
  profileId: string;
  role: string | null;
  barangayId: string | null;
  shelterId: string | null;
  teamIds: string[];
};

export async function resolveScopeFromRequest(req: Request): Promise<AdminScope | null> {
  const supabase = createServerSupabaseClient();
  const profileId =
    req.headers.get("x-profile-id") || req.headers.get("X-Profile-Id");
  if (!profileId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, barangay_id, shelter_id")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return null;

  // Prefer explicit barangay_id; fall back via shelter->barangay_id
  let barangayId: string | null = (profile as any).barangay_id ?? null;
  if (!barangayId && (profile as any).shelter_id) {
    const { data: shelter } = await supabase
      .from("shelters")
      .select("barangay_id")
      .eq("id", (profile as any).shelter_id as string)
      .maybeSingle();
    barangayId = (shelter as any)?.barangay_id ?? null;
  }

  let teamIds: string[] = [];
  if (barangayId) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("barangay_id", barangayId);
    teamIds = Array.isArray(teams)
      ? (teams as any[]).map((t) => String((t as any).id)).filter(Boolean)
      : [];
  }

  return {
    profileId,
    role: ((profile as any).role as string | null) ?? null,
    barangayId,
    shelterId: ((profile as any).shelter_id as string | null) ?? null,
    teamIds,
  };
}

export function isSuper(scope: AdminScope | null): boolean {
  const r = (scope?.role || "").toLowerCase();
  return r === "super-admin";
}

