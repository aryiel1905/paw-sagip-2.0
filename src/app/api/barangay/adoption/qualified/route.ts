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

  // Base query: rescued + vetted + not yet promoted
  let query = supabase
    .from("reports")
    .select(
      "id, created_at, custom_id, location, photo_path, species, pet_name, age_size, features, team_id, is_vaccinated, is_spayed_neutered, is_dewormed"
    )
    .eq("status", "rescued")
    .eq("is_vaccinated", true)
    .eq("is_spayed_neutered", true)
    .eq("is_dewormed", true)
    .is("promoted_to_pet_id", null)
    .order("created_at", { ascending: false })
    .limit(200);

  // Apply barangay scoping when not super-admin
  if (scope && !isSuper(scope)) {
    const teamIds = scope.teamIds;
    if (teamIds.length === 0) {
      return NextResponse.json({ items: [] });
    }
    query = query.in("team_id", teamIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [] });

  const items = Array.isArray(data)
    ? (data as any[]).map((r) => ({
        id: r.id as string,
        created_at: (r.created_at as string) ?? null,
        custom_id: (r.custom_id as string | null) ?? null,
        location: (r.location as string | null) ?? null,
        photo_path: (r.photo_path as string | null) ?? null,
        pet_name: (r.pet_name as string | null) ?? null,
        species: (r.species as string | null) ?? null,
        age_size: (r.age_size as string | null) ?? null,
        features: (r.features as string | null) ?? null,
      }))
    : [];

  return NextResponse.json({ items });
}

