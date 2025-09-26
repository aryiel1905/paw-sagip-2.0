import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// Ensure this route always runs on the Node.js runtime (not Edge)
export const runtime = "nodejs";
// Make sure the handler is always dynamic (avoid any caching surprises)
export const dynamic = "force-dynamic";

const REPORT_TYPES = new Set(["lost", "found", "cruelty", "adoption"]);

type ReportPayload = {
  type?: string;
  description?: string;
  condition?: string;
  location?: string;
  photoPath?: string | null;
  lat?: number | null;
  lng?: number | null;
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

  // Normalize coordinates if provided
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (typeof payload.lat === "number" && !Number.isNaN(payload.lat)) {
    latitude = Math.max(-90, Math.min(90, payload.lat));
  }
  if (typeof payload.lng === "number" && !Number.isNaN(payload.lng)) {
    longitude = Math.max(-180, Math.min(180, payload.lng));
  }

  const { error } = await supabase.from("reports").insert([
    {
      report_type: reportType,
      description: payload.description ?? null,
      condition: payload.condition ?? null,
      location: payload.location ?? null,
      photo_path: payload.photoPath ?? null,
      latitude,
      longitude,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
