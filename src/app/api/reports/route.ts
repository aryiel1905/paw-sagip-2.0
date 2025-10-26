import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// Ensure this route always runs on the Node.js runtime (not Edge)
export const runtime = "nodejs";
// Make sure the handler is always dynamic (avoid any caching surprises)
export const dynamic = "force-dynamic";

const REPORT_TYPES = new Set(["lost", "found", "cruelty", "adoption"]);

type ReportPayload = {
  // existing
  type?: string;
  description?: string;
  condition?: string;
  location?: string;
  photoPath?: string | null;
  lat?: number | null;
  lng?: number | null;
  landmarkMediaPaths?: string[] | null;

  // newly supported, optional
  petName?: string | null;
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  ageSize?: string | null;
  features?: string | null;
  eventAt?: string | null; // ISO or datetime-local from client
  reporterName?: string | null;
  reporterContact?: string | null;
  isAggressive?: boolean | null;
  isFriendly?: boolean | null;
  isAnonymous?: boolean | null;

  // server-preferred user context (client may omit; server derives from cookies)
  userId?: string | null;
  userEmail?: string | null;
  userFullName?: string | null;
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

  // Resolve user from Supabase auth cookies securely (no client trust needed)
  let currentUserId: string | null = null;
  let currentUserEmail: string | null = null;
  let currentUserName: string | null = null;
  try {
    const jar = await cookies();
    const accessToken =
      jar.get("sb-access-token")?.value ||
      // Some setups store a JSON array token under this name; try to parse
      (() => {
        try {
          const raw = jar.get("supabase-auth-token")?.value;
          if (!raw) return null;
          const arr = JSON.parse(raw);
          return Array.isArray(arr) && arr[0]?.access_token
            ? arr[0].access_token
            : null;
        } catch {
          return null;
        }
      })();
    if (accessToken) {
      const { data } = await supabase.auth.getUser(accessToken);
      if (data?.user) {
        currentUserId = data.user.id ?? null;
        currentUserEmail = (data.user.email as string | null) ?? null;
        currentUserName =
          ((data.user.user_metadata?.full_name as string | undefined) ??
            null) ||
          null;
      }
    }
  } catch {
    // ignore and keep nulls
  }

  // Normalize coordinates if provided
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (typeof payload.lat === "number" && !Number.isNaN(payload.lat)) {
    latitude = Math.max(-90, Math.min(90, payload.lat));
  }
  if (typeof payload.lng === "number" && !Number.isNaN(payload.lng)) {
    longitude = Math.max(-180, Math.min(180, payload.lng));
  }

  const anonymous = !!payload.isAnonymous;

  const { data: inserted, error } = await supabase
    .from("reports")
    .insert([
      {
        report_type: reportType,
        description: payload.description ?? null,
        condition: payload.condition ?? null,
        location: payload.location ?? null,
        photo_path: payload.photoPath ?? null,
        landmark_media_paths: payload.landmarkMediaPaths ?? [],
        latitude,
        longitude,

        // newly mapped fields
        pet_name: payload.petName ?? null,
        species: payload.species ?? null,
        breed: payload.breed ?? null,
        gender: payload.gender ?? null,
        age_size: payload.ageSize ?? null,
        features: payload.features ?? null,
        event_at: payload.eventAt
          ? new Date(payload.eventAt).toISOString()
          : null,
        // Always attach user_id (ownership) when available so the report shows under "My Reports"
        // but drop reporter name/contact when anonymous so it remains private publicly.
        user_id: currentUserId ?? payload.userId ?? null,
        reporter_name: anonymous
          ? null
          : payload.reporterName ?? payload.userFullName ?? currentUserName,
        reporter_contact: anonymous
          ? null
          : payload.reporterContact ?? payload.userEmail ?? currentUserEmail,
        is_aggressive: payload.isAggressive ?? null,
        is_friendly: payload.isFriendly ?? null,
        is_anonymous: payload.isAnonymous ?? null,
      },
    ])
    // Return id + custom_id so client can surface it immediately
    .select("id, custom_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    id: inserted?.id,
    customId: (inserted as any)?.custom_id ?? null,
  });
}
