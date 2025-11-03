import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveScopeFromRequest, isSuper } from "@/lib/adminScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const scope = await resolveScopeFromRequest(request);
  if (!scope && !process.env.ALLOW_UNSCOPED_ADMIN) {
    return NextResponse.json({ error: "Missing x-profile-id" }, { status: 401 });
  }

  // Determine pet IDs under the scoped barangay by tracing back to reports.team_id
  let petIds: string[] = [];
  if (scope && !isSuper(scope)) {
    if (scope.teamIds.length === 0) return NextResponse.json({ items: [] });
    const { data: reps } = await supabase
      .from("reports")
      .select("promoted_to_pet_id")
      .in("team_id", scope.teamIds)
      .not("promoted_to_pet_id", "is", null);
    petIds = Array.isArray(reps)
      ? (reps as any[])
          .map((r) => String((r as any).promoted_to_pet_id))
          .filter(Boolean)
      : [];
    if (petIds.length === 0) return NextResponse.json({ items: [] });
  }

  let petQuery = supabase
    .from("adoption_pets")
    .select(
      "id,species,pet_name,age_size,features,location,status,created_at,photo_path,emoji_code,latitude,longitude,pet_status"
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(200);

  if (scope && !isSuper(scope)) petQuery = petQuery.in("id", petIds);

  const { data: pets } = await petQuery;
  const petsArr = Array.isArray(pets) ? (pets as any[]) : [];
  const ids = petsArr.map((p) => String((p as any).id));

  // Gather app status counts per pet in bulk
  let apps: any[] = [];
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from("adoption_applications")
      .select("id, pet_id, status")
      .in("pet_id", ids);
    apps = Array.isArray(rows) ? (rows as any[]) : [];
  }

  const countsByPet = new Map<string, { pending: number; approved: number; rejected: number }>();
  for (const id of ids) countsByPet.set(id, { pending: 0, approved: 0, rejected: 0 });
  for (const a of apps) {
    const k = String((a as any).pet_id);
    const c = countsByPet.get(k);
    if (!c) continue;
    const st = String((a as any).status || "").toLowerCase();
    if (st === "pending") c.pending += 1;
    else if (st === "approved") c.approved += 1;
    else if (st === "rejected") c.rejected += 1;
  }

  const items = petsArr.map((p) => ({
    id: String((p as any).id),
    species: (p as any).species ?? null,
    pet_name: (p as any).pet_name ?? null,
    age_size: (p as any).age_size ?? null,
    features: (p as any).features ?? null,
    location: (p as any).location ?? null,
    status: (p as any).status ?? null,
    created_at: (p as any).created_at ?? null,
    photo_path: (p as any).photo_path ?? null,
    emoji_code: (p as any).emoji_code ?? null,
    latitude: (p as any).latitude ?? null,
    longitude: (p as any).longitude ?? null,
    pet_status: (p as any).pet_status ?? null,
    appCounts: countsByPet.get(String((p as any).id)) ?? {
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  }));

  return NextResponse.json({ items });
}

