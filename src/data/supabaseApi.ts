import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  Alert,
  AlertRow,
  AdoptionPet,
  AdoptionRow,
  AlertType,
} from "@/types/app";

export const PET_MEDIA_BUCKET = "pet-media";

function withAbort<T extends { abortSignal?: (s: AbortSignal) => T }>(
  builder: any,
  signal?: AbortSignal
) {
  if (signal && builder && typeof builder.abortSignal === "function") {
    return builder.abortSignal(signal);
  }
  return builder;
}

function speciesToEmoji(species?: string | null) {
  const s = (species ?? "").toLowerCase();
  if (s.includes("dog")) return "🐶";
  if (s.includes("cat")) return "🐱";
  return "🐾";
}

function computeMinutes(row: Pick<AlertRow, "minutes" | "created_at">): number {
  if (row.minutes !== undefined && row.minutes !== null) {
    const parsed = Number(row.minutes);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  if (row.created_at) {
    return Math.max(
      0,
      Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000)
    );
  }
  return 0;
}

function toAlert(row: AlertRow): Alert {
  const supabase = getSupabaseClient();
  const imageUrl = row.photo_path
    ? supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(row.photo_path).data
        .publicUrl
    : null;
  const landmarkImageUrls = Array.isArray(row.landmark_media_paths)
    ? row.landmark_media_paths
        .filter(Boolean)
        .map(
          (p) =>
            supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data
              .publicUrl
        )
    : [];

  const title =
    row.pet_name?.trim() ||
    (row.species
      ? `${row.report_type.toUpperCase()} ${row.species}`
      : row.report_type.toUpperCase());

  return {
    id: row.id,
    title,
    area: row.location,
    type: row.report_type,
    emoji: speciesToEmoji(row.species),
    minutes: computeMinutes(row),
    imageUrl,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    landmarkImageUrls,
  };
}

function toAdoption(row: AdoptionRow): AdoptionPet {
  const supabase = getSupabaseClient();
  const imageUrl = row.photo_path
    ? supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(row.photo_path).data
        .publicUrl
    : null;

  const s = (row.species ?? "").toLowerCase();
  const kind = s.startsWith("dog") ? "dog" : s.startsWith("cat") ? "cat" : "other";
  const emoji = row.emoji_code ?? (kind === "dog" ? "🐶" : kind === "cat" ? "🐱" : "🐾");

  return {
    id: row.id,
    kind,
    name: row.pet_name ?? "",
    age: row.age_size ?? "",
    note: row.features ?? "",
    location: row.location ?? "",
    emoji,
    imageUrl,
    createdAt: row.created_at ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}

export async function fetchAlerts(limit = 50, opts?: { signal?: AbortSignal }): Promise<Alert[]> {
  const supabase = getSupabaseClient();
  const base = supabase
    .from("alerts")
    .select(
      "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  const query = withAbort(base as any, opts?.signal);
  const { data, error } = await query;

  if (error || !Array.isArray(data)) return [];
  return (data as AlertRow[]).map(toAlert);
}

// Paged fetch with optional type filter and total count
export async function fetchAlertsPaged(
  type: AlertType = "all",
  page = 1,
  pageSize = 60,
  opts?: { signal?: AbortSignal }
): Promise<{ items: Alert[]; total: number }> {
  const supabase = getSupabaseClient();
  const from = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, pageSize));
  const to = Math.max(from, from + Math.max(1, pageSize) - 1);

  let base = supabase
    .from("alerts")
    .select(
      "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (type && type !== "all") {
    base = base.eq("report_type", type as Exclude<AlertType, "all">);
  }

  const query = withAbort(base as any, opts?.signal);
  const { data, count, error } = await query;
  if (error || !Array.isArray(data)) {
    return { items: [], total: count ?? 0 };
  }
  return { items: (data as AlertRow[]).map(toAlert), total: count ?? data.length };
}

export async function searchAlerts(
  query: string,
  limit = 25,
  opts?: { signal?: AbortSignal }
): Promise<Alert[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const supabase = getSupabaseClient();
  const qLower = q.toLowerCase();
  const qSafe = q.replace(/[,]/g, " ");
  const alertTypeMatches = ["lost", "found", "cruelty", "adoption"].filter((t) =>
    t.includes(qLower)
  );
  const orParts = [
    `location.ilike.%${qSafe}%`,
    `description.ilike.%${qSafe}%`,
    `pet_name.ilike.%${qSafe}%`,
    `species.ilike.%${qSafe}%`,
    ...alertTypeMatches.map((t) => `report_type.eq.${t}`),
  ];

  const base = supabase
    .from("alerts")
    .select(
      "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description"
    )
    .or(orParts.join(","))
    .limit(limit);
  const q2 = withAbort(base as any, opts?.signal);
  const { data, error } = await q2;

  if (error || !Array.isArray(data)) return [];
  return (data as AlertRow[]).map(toAlert);
}

export async function fetchAdoptionPets(
  limit = 50,
  opts?: { signal?: AbortSignal }
): Promise<AdoptionPet[]> {
  const supabase = getSupabaseClient();
  const base = supabase
    .from("adoption_pets")
    .select(
      "id,species,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude"
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(limit);
  const q = withAbort(base as any, opts?.signal);
  const { data, error } = await q;

  if (error || !Array.isArray(data)) return [];
  return (data as AdoptionRow[]).map(toAdoption);
}

export async function searchAdoptionPets(
  query: string,
  limit = 25,
  opts?: { signal?: AbortSignal }
): Promise<AdoptionPet[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const supabase = getSupabaseClient();
  const qLower = q.toLowerCase();
  const qSafe = q.replace(/[,]/g, " ");
  const kindMatches = ["dog", "cat"].filter((k) => k.includes(qLower));
  const orParts = [
    `pet_name.ilike.%${qSafe}%`,
    `location.ilike.%${qSafe}%`,
    `features.ilike.%${qSafe}%`,
    `age_size.ilike.%${qSafe}%`,
    ...kindMatches.map((k) => `species.ilike.%${k}%`),
  ];

  const base = supabase
    .from("adoption_pets")
    .select(
      "id,species,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude"
    )
    .or(orParts.join(","))
    .eq("status", "available")
    .limit(limit);
  const q2 = withAbort(base as any, opts?.signal);
  const { data, error } = await q2;

  if (error || !Array.isArray(data)) return [];
  return (data as AdoptionRow[]).map(toAdoption);
}

// Paged adoption fetch with exact count
export async function fetchAdoptionPetsPaged(
  page = 1,
  pageSize = 60,
  opts?: { signal?: AbortSignal }
): Promise<{ items: AdoptionPet[]; total: number }> {
  const supabase = getSupabaseClient();
  const from = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, pageSize));
  const to = Math.max(from, from + Math.max(1, pageSize) - 1);

  const base = supabase
    .from("adoption_pets")
    .select(
      "id,species,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude",
      { count: "exact" }
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .range(from, to);
  const q = withAbort(base as any, opts?.signal);
  const { data, count, error } = await q;
  if (error || !Array.isArray(data)) {
    return { items: [], total: count ?? 0 };
  }
  return { items: (data as AdoptionRow[]).map(toAdoption), total: count ?? data.length };
}

export function subscribeToAlerts(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("public:alerts")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "alerts" },
      onChange
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToAdoptions(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("public:adoption_pets")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "adoption_pets" },
      onChange
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToAlertsIncremental(handlers: {
  onInsert?: (a: Alert) => void;
  onUpdate?: (a: Alert) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("public:alerts:inc")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "alerts" },
      (payload) => {
        const row = payload.new as AlertRow;
        handlers.onInsert?.(toAlert(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "alerts" },
      (payload) => {
        const row = payload.new as AlertRow;
        handlers.onUpdate?.(toAlert(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "alerts" },
      (payload) => {
        const oldRow = payload.old as { id: string };
        if (oldRow?.id) handlers.onDelete?.(oldRow.id);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeToAdoptionsIncremental(handlers: {
  onInsert?: (p: AdoptionPet) => void;
  onUpdate?: (p: AdoptionPet) => void;
  onDelete?: (id: string) => void;
}): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("public:adoption_pets:inc")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "adoption_pets" },
      (payload) => {
        const row = payload.new as AdoptionRow;
        handlers.onInsert?.(toAdoption(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "adoption_pets" },
      (payload) => {
        const row = payload.new as AdoptionRow;
        handlers.onUpdate?.(toAdoption(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "adoption_pets" },
      (payload) => {
        const oldRow = payload.old as { id: string };
        if (oldRow?.id) handlers.onDelete?.(oldRow.id);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// For DetailsModal fallback: derive landmark public URLs using the original photo URL
export async function fetchLandmarkImageUrlsByAlertImage(
  imageUrl: string
): Promise<string[]> {
  const marker = "/storage/v1/object/public/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return [];
  const rest = imageUrl.slice(idx + marker.length); // <bucket>/<path>
  const slash = rest.indexOf("/");
  if (slash === -1) return [];
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!path) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("landmark_media_paths")
    .eq("photo_path", path)
    .maybeSingle();

  if (error) return [];
  const arr = (data?.landmark_media_paths ?? []) as string[];
  return Array.isArray(arr)
    ? arr
        .filter(Boolean)
        .map((p) => supabase.storage.from(bucket).getPublicUrl(p).data.publicUrl)
    : [];
}

export type ReportDetails = {
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  age_size?: string | null;
  features?: string | null;
  description?: string | null;
  landmarkUrls: string[];
};

// Fetch richer details for an alert using alerts.source_table/source_id when available,
// and fall back to matching reports by photo_path.
export async function fetchReportDetailsForAlert(alertId: string): Promise<ReportDetails> {
  const supabase = getSupabaseClient();
  // 1) Read source fields from alerts
  const { data: alertRow, error: alertErr } = await supabase
    .from("alerts")
    .select("source_table, source_id, photo_path")
    .eq("id", alertId)
    .maybeSingle();

  if (alertErr) {
    return { landmarkUrls: [] };
  }

  // Helper to map a reports row to our details
  const mapReport = (row: any): ReportDetails => {
    const raw: string[] = Array.isArray(row?.landmark_media_paths)
      ? (row.landmark_media_paths as string[]).filter(Boolean)
      : [];
    const urls = raw.map(
      (p) => supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data.publicUrl
    );
    return {
      species: row?.species ?? null,
      breed: row?.breed ?? null,
      gender: row?.gender ?? null,
      age_size: row?.age_size ?? null,
      features: row?.features ?? null,
      description: row?.description ?? null,
      landmarkUrls: urls,
    };
  };

  // 2) Prefer explicit source pointer
  if (
    alertRow?.source_table === "reports" &&
    alertRow?.source_id &&
    typeof alertRow.source_id === "string"
  ) {
    const { data: rep, error } = await supabase
      .from("reports")
      .select(
        "species,breed,gender,age_size,features,description,landmark_media_paths,photo_path"
      )
      .eq("id", alertRow.source_id)
      .maybeSingle();
    if (!error && rep) return mapReport(rep);
  }

  // 3) Fallback by matching photo_path
  const ph = alertRow?.photo_path as string | null | undefined;
  if (ph) {
    const { data: rep2, error: err2 } = await supabase
      .from("reports")
      .select(
        "species,breed,gender,age_size,features,description,landmark_media_paths,photo_path"
      )
      .eq("photo_path", ph)
      .maybeSingle();
    if (!err2 && rep2) return mapReport(rep2);
  }

  return { landmarkUrls: [] };
}

// Account view: fetch a single report with public media URLs and details
export type AccountReportView = {
  id: string;
  type: string;
  condition?: string | null;
  location?: string | null;
  event_at?: string | null;
  pet_name?: string | null;
  species?: string | null;
  breed?: string | null;
  gender?: string | null;
  age_size?: string | null;
  features?: string | null;
  description?: string | null;
  created_at?: string | null;
  status?: string | null;
  is_anonymous?: boolean | null;
  is_aggressive?: boolean | null;
  is_friendly?: boolean | null;
  reporter_name?: string | null;
  reporter_contact?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mainUrl?: string | null;
  landmarkUrls: string[];
};

export async function fetchReportById(id: string): Promise<AccountReportView | null> {
  const supabase = getSupabaseClient();
  // Select all columns to avoid schema drift issues if some optional fields don't exist
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    try {
      console.error("fetchReportById failed", { id, error });
    } catch {}
    return null;
  }

  const photoPath = (data as any).photo_path as string | null | undefined;
  const lmPaths = ((data as any).landmark_media_paths ?? []) as string[];
  const mainUrl = photoPath
    ? supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(photoPath).data
        .publicUrl
    : null;
  let landmarkUrls = Array.isArray(lmPaths)
    ? lmPaths
        .filter(Boolean)
        .map(
          (p) =>
            supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data
              .publicUrl
        )
    : [];

  // Fallback: if the report row has no landmark paths but has a main image, attempt to derive
  // landmark URLs by matching photo_path (same approach used by DetailsModal)
  if ((!landmarkUrls || landmarkUrls.length === 0) && mainUrl) {
    try {
      const derived = await fetchLandmarkImageUrlsByAlertImage(mainUrl);
      if (Array.isArray(derived) && derived.length > 0) {
        landmarkUrls = derived;
      }
    } catch {}
  }

  return {
    id: data.id as string,
    type: (data as any).report_type ?? "",
    condition: (data as any).condition ?? null,
    location: (data as any).location ?? null,
    event_at: (data as any).event_at ?? null,
    pet_name: (data as any).pet_name ?? null,
    species: (data as any).species ?? null,
    breed: (data as any).breed ?? null,
    gender: (data as any).gender ?? null,
    age_size: (data as any).age_size ?? null,
    features: (data as any).features ?? null,
    description: (data as any).description ?? null,
    created_at: (data as any).created_at ?? null,
    status: (data as any).status ?? null,
    is_anonymous: (data as any).is_anonymous ?? null,
    is_aggressive: (data as any).is_aggressive ?? null,
    is_friendly: (data as any).is_friendly ?? null,
    reporter_name: (data as any).reporter_name ?? null,
    reporter_contact: (data as any).reporter_contact ?? null,
    latitude: (data as any).latitude ?? null,
    longitude: (data as any).longitude ?? null,
    mainUrl,
    landmarkUrls,
  };
}
