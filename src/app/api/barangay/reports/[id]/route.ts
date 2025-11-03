import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { resolveScopeFromRequest, isSuper } from "@/lib/adminScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureReportScoped(reportId: string, request: NextRequest, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const scope = await resolveScopeFromRequest(request);
  if (!scope || isSuper(scope)) return true;
  if (!scope.teamIds.length) return false;
  const { data: rep } = await supabase
    .from("reports")
    .select("team_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!rep) return false;
  return (scope.teamIds || []).includes(String((rep as any).team_id));
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = createServerSupabaseClient();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ok = await ensureReportScoped(id, request, supabase);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ report: data });
}

type PatchPayload = {
  status?: "open" | "rescued" | "resolved" | "assigned" | "in_review" | "closed";
};

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = createServerSupabaseClient();
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ok = await ensureReportScoped(id, request, supabase);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PatchPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const allowed: Record<string, unknown> = {};
  if (body.status) allowed.status = body.status;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reports")
    .update(allowed)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

