import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const REPORT_TYPES = new Set(["lost", "found", "cruelty", "adoption"]);

type ReportPayload = {
  type?: string;
  description?: string;
  condition?: string;
  location?: string;
  photoPath?: string | null;
};

export async function POST(request: Request) {
  let payload: ReportPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reportType = payload.type?.toLowerCase();

  if (!reportType || !REPORT_TYPES.has(reportType)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from("reports").insert([
    {
      report_type: reportType,
      description: payload.description ?? null,
      condition: payload.condition ?? null,
      location: payload.location ?? null,
      photo_path: payload.photoPath ?? null,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

