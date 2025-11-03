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

  let query = supabase
    .from("v_adoption_decisions")
    .select("application_id,pet_id,status,created_at,first_name,last_name,email,phone,pet_name,species,pet_status,report_id,location,team_id")
    .order("created_at", { ascending: false })
    .limit(300);

  if (scope && !isSuper(scope)) {
    if (!scope.teamIds.length) return NextResponse.json({ items: [] });
    query = query.in("team_id", scope.teamIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [] });
  return NextResponse.json({ items: Array.isArray(data) ? data : [] });
}

