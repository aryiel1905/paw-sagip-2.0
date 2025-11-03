import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveScopeFromRequest, isSuper } from "@/lib/adminScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PromotePayload = { reportId?: string };

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const scope = await resolveScopeFromRequest(request);
  if (!scope && !process.env.ALLOW_UNSCOPED_ADMIN) {
    return NextResponse.json({ error: "Missing x-profile-id" }, { status: 401 });
  }

  let payload: PromotePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const reportId = payload.reportId;
  if (!reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  // Verify scoping: the report must belong to one of the barangay's teams unless super-admin
  if (scope && !isSuper(scope)) {
    const { data: rep } = await supabase
      .from("reports")
      .select("team_id, promoted_to_pet_id")
      .eq("id", reportId)
      .maybeSingle();
    if (!rep || !(scope.teamIds || []).includes(String((rep as any).team_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if ((rep as any).promoted_to_pet_id) {
      return NextResponse.json({ petId: (rep as any).promoted_to_pet_id });
    }
  }

  // Prefer RPC if present (handles insert + linking + alert maintenance)
  try {
    const { data, error } = await supabase.rpc(
      "promote_report_to_adoption",
      { p_report_id: reportId }
    );
    if (!error && data) {
      return NextResponse.json({ petId: data as string });
    }
  } catch {
    // fall through to manual insert
  }

  // Manual fallback: read report then insert adoption_pets and update reports.promoted_to_pet_id
  const { data: r, error: readErr } = await supabase
    .from("reports")
    .select(
      "id, species, pet_name, age_size, features, location, photo_path, landmark_media_paths, latitude, longitude, promoted_to_pet_id"
    )
    .eq("id", reportId)
    .maybeSingle();
  if (readErr || !r) {
    return NextResponse.json({ error: readErr?.message || "Not found" }, { status: 404 });
  }
  if ((r as any).promoted_to_pet_id) {
    return NextResponse.json({ petId: (r as any).promoted_to_pet_id as string });
  }

  const insert = {
    species: (r as any).species ?? null,
    pet_name: (r as any).pet_name ?? null,
    age_size: (r as any).age_size ?? null,
    features: (r as any).features ?? (r as any).description ?? null,
    location: (r as any).location ?? null,
    status: "available",
    photo_path: (r as any).photo_path ?? null,
    landmark_media_paths: Array.isArray((r as any).landmark_media_paths)
      ? (r as any).landmark_media_paths
      : [],
    latitude: (r as any).latitude ?? null,
    longitude: (r as any).longitude ?? null,
  } as const;
  const { data: p, error: insErr } = await supabase
    .from("adoption_pets")
    .insert([insert])
    .select("id")
    .single();
  if (insErr || !p) {
    return NextResponse.json({ error: insErr?.message || "Insert failed" }, { status: 500 });
  }

  await supabase
    .from("reports")
    .update({ promoted_to_pet_id: (p as any).id })
    .eq("id", reportId);

  return NextResponse.json({ petId: (p as any).id as string });
}

