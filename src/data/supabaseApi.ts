import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  Alert,
  AlertRow,
  AdoptionPet,
  AdoptionRow,
  AlertType,
  PetStatus,
} from "@/types/app";
import type { Contact } from "@/types/app";
import { DEFAULT_PAGE_SIZE } from "@/constants/app";
import { resolvePreviewUrl } from "@/lib/media";

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
  const s = (species ?? "").trim().toLowerCase();
  if (!s) return "\u{1F43E}";
  if (/^others?(?:\b|;)/.test(s)) return "\u{1F43E}";

  const tokens = s.split(/[^a-z]+/).filter(Boolean);
  const hasToken = (value: string) => tokens.includes(value);
  const hasTokens = (...values: string[]) => values.every(hasToken);
  const hasText = (value: string) => s.includes(value);

  if (hasTokens("black", "cat") || hasToken("blackcat")) return "\u{1F408}\u{200D}\u{2B1B}";
  if (
    hasTokens("orange", "cat") ||
    hasTokens("ginger", "cat") ||
    hasToken("tabby")
  )
    return "\u{1F408}";
  if (hasToken("cat")) return "\u{1F431}";
  if (hasToken("dog")) return "\u{1F436}";
  if (hasToken("monkey")) return "\u{1F412}";
  if (hasToken("horse")) return "\u{1F40E}";
  if (
    hasTokens("water", "buffalo") ||
    hasToken("buffalo") ||
    hasToken("carabao") ||
    hasText("waterbuffalo")
  )
    return "\u{1F403}";
  if (hasToken("ox") || hasToken("bull")) return "\u{1F402}";
  if (hasToken("cow")) return "\u{1F404}";
  if (hasToken("pig") || hasToken("hog")) return "\u{1F416}";
  if (hasToken("boar")) return "\u{1F417}";
  if (hasToken("sheep") || hasToken("lamb")) return "\u{1F411}";
  if (hasToken("goat")) return "\u{1F410}";
  if (hasToken("snake") || hasToken("python") || hasToken("cobra"))
    return "\u{1F40D}";
  if (hasToken("mouse")) return "\u{1F401}";
  if (hasToken("rat")) return "\u{1F400}";
  if (hasToken("hamster")) return "\u{1F439}";
  if (hasToken("rabbit") || hasToken("bunny")) return "\u{1F407}";
  if (hasToken("chipmunk")) return "\u{1F43F}\u{FE0F}";
  if (hasToken("beaver")) return "\u{1F9AB}";
  if (hasToken("hedgehog")) return "\u{1F994}";
  if (hasToken("otter")) return "\u{1F9A6}";
  if (hasToken("skunk")) return "\u{1F9A8}";
  if (hasToken("kangaroo")) return "\u{1F998}";
  if (hasToken("badger")) return "\u{1F9A1}";
  if (hasTokens("black", "bird") || hasToken("blackbird")) return "\u{1F426}\u{200D}\u{2B1B}";
  if (hasToken("penguin")) return "\u{1F427}";
  if (hasToken("dove") || hasToken("pigeon")) return "\u{1F54A}\u{FE0F}";
  if (hasToken("eagle")) return "\u{1F985}";
  if (hasToken("duck")) return "\u{1F986}";
  if (hasToken("swan")) return "\u{1F9A2}";
  if (hasToken("owl")) return "\u{1F989}";
  if (hasToken("flamingo")) return "\u{1F9A9}";
  if (hasToken("peacock")) return "\u{1F99A}";
  if (hasToken("parrot")) return "\u{1F99C}";
  if (hasToken("goose")) return "\u{1FABF}";
  if (hasToken("bird")) return "\u{1F426}";
  if (hasToken("crocodile") || hasToken("croc")) return "\u{1F40A}";
  if (hasToken("turtle") || hasToken("tortoise")) return "\u{1F422}";
  if (hasToken("lizard")) return "\u{1F98E}";
  return "\u{1F43E}";
}

function formatSpeciesLabel(species?: string | null): string | null {
  const raw = (species ?? "").trim();
  if (!raw) return null;
  const clean = raw.replace(/^others?;/i, "").trim();
  if (!clean) return "Other";
  return clean
    .split(/\s+/)
    .map((part) =>
      part.length ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part
    )
    .join(" ");
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

function toPublicUrl(path?: string | null): string | null {
  if (!path) return null;
  return getSupabaseClient()
    .storage.from(PET_MEDIA_BUCKET)
    .getPublicUrl(path).data.publicUrl;
}

function toAlert(row: AlertRow): Alert {
  const imageUrl = toPublicUrl(row.photo_path);
  const videoThumbnailUrl = toPublicUrl(row.video_thumbnail_path);
  const previewImageUrl = resolvePreviewUrl(imageUrl, videoThumbnailUrl);
  const landmarkImageUrls = Array.isArray(row.landmark_media_paths)
    ? row.landmark_media_paths
        .filter(Boolean)
        .map((p) => toPublicUrl(p))
        .filter((url): url is string => !!url)
    : [];

  const formattedSpecies = formatSpeciesLabel(row.species);
  const title =
    row.pet_name?.trim() ||
    (formattedSpecies
      ? `${row.report_type.toUpperCase()} ${formattedSpecies}`
      : row.report_type.toUpperCase());

  const emojiSource =
    row.species && row.species.trim().length > 0 ? row.species : row.pet_name ?? "";

  return {
    id: row.id,
    title,
    area: row.location,
    type: row.report_type,
    status: (row as any).status ?? "open",
    breed: (row as any).breed ?? undefined,
    sex: (row as any).sex ?? undefined,
    ageSize: (row as any).age_size ?? undefined,
    emoji: speciesToEmoji(emojiSource),
    minutes: computeMinutes(row),
    imageUrl,
    previewImageUrl,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    landmarkImageUrls,
    petStatus: (row.pet_status as PetStatus | null) ?? "roaming",
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
  const emoji =
    row.emoji_code ??
    (kind === "dog" ? "\u{1F436}" : kind === "cat" ? "\u{1F431}" : "\u{1F43E}");

    return {
      id: row.id,
      kind,
      species: row.species ?? null,
      speciesId: (row as any).species_id ?? null,
    isDomesticAdoptable:
      typeof (row as any).is_domestic_adoptable === "boolean"
        ? (row as any).is_domestic_adoptable
        : null,
    name: row.pet_name ?? "",
    age: row.age_size ?? "",
    note: row.features ?? "",
    location: row.location ?? "",
    emoji,
      imageUrl,
      createdAt: row.created_at ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      energyLevel:
        typeof (row as any).energy_level === "number"
          ? ((row as any).energy_level as 1 | 2 | 3)
          : null,
      petStatus: (row.pet_status as PetStatus | null) ?? "in_custody",
    };
  }

export async function fetchAlerts(limit = 50, opts?: { signal?: AbortSignal }): Promise<Alert[]> {
  const supabase = getSupabaseClient();
  const base = supabase
    .from("alerts")
    .select(
      "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description,pet_status,status,source_table,source_id"
    )
    .neq("status", "resolved")
    .neq("status", "rescued")
    .order("created_at", { ascending: false })
    .limit(limit);
  const query = withAbort(base as any, opts?.signal);
  const { data, error } = await query;

  if (error || !Array.isArray(data)) return [];
  const rows = data as (AlertRow & { source_table?: string | null; source_id?: string | null })[];
  const reportIds = rows
    .filter((r) => (r as any).source_table === "reports" && (r as any).source_id)
    .map((r) => String((r as any).source_id));
  const byReport: Record<string, { breed?: string | null; gender?: string | null; age_size?: string | null; video_thumbnail_path?: string | null }> = {};
  if (reportIds.length > 0) {
    const { data: rep } = await supabase
      .from("reports")
      .select("id, breed, gender, age_size, video_thumbnail_path")
      .in("id", reportIds);
    if (Array.isArray(rep)) {
      for (const r of rep as any[]) {
        byReport[String(r.id)] = {
          breed: r.breed ?? null,
          gender: r.gender ?? null,
          age_size: r.age_size ?? null,
          video_thumbnail_path: r.video_thumbnail_path ?? null,
        };
      }
    }
  }
  return rows.map((row) => {
    const sid = (row as any).source_id as string | undefined;
    const extra = sid ? byReport[sid] : undefined;
    const base = toAlert({
      ...row,
      video_thumbnail_path: extra?.video_thumbnail_path ?? null,
    });
    return extra
      ? { ...base, breed: extra.breed ?? null, sex: extra.gender ?? null, ageSize: extra.age_size ?? null }
      : base;
  });
}

// Paged fetch with optional type filter and total count
// Fetch alerts for the homepage grouped section — each type gets its own query
// so cruelty/lost/found columns always show their latest items regardless of volume.
export async function fetchAlertsGrouped(
  perType = 6,
  opts?: { signal?: AbortSignal }
): Promise<Alert[]> {
  const types: Exclude<AlertType, "all">[] = ["found", "lost", "cruelty"];
  const results = await Promise.all(
    types.map(async (type) => {
      const supabase = getSupabaseClient();
      const base = supabase
        .from("alerts")
        .select(
          "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description,pet_status,status,source_table,source_id"
        )
        .eq("report_type", type)
        .neq("status", "resolved")
        .neq("status", "rescued")
        .order("created_at", { ascending: false })
        .limit(perType);
      const query = withAbort(base as any, opts?.signal);
      const { data, error } = await query;
      if (error || !Array.isArray(data)) return [];
      const rows = data as (AlertRow & { source_table?: string | null; source_id?: string | null })[];
      const reportIds = rows
        .filter((r) => (r as any).source_table === "reports" && (r as any).source_id)
        .map((r) => String((r as any).source_id));
      const byReport: Record<string, { breed?: string | null; gender?: string | null; age_size?: string | null; video_thumbnail_path?: string | null }> = {};
      if (reportIds.length > 0) {
        const { data: rep } = await supabase
          .from("reports")
          .select("id, breed, gender, age_size, video_thumbnail_path")
          .in("id", reportIds);
        if (Array.isArray(rep)) {
          for (const r of rep as any[]) {
            byReport[String(r.id)] = {
              breed: r.breed ?? null,
              gender: r.gender ?? null,
              age_size: r.age_size ?? null,
              video_thumbnail_path: r.video_thumbnail_path ?? null,
            };
          }
        }
      }
      return rows.map((row) => {
        const sid = (row as any).source_id as string | undefined;
        const extra = sid ? byReport[sid] : undefined;
        const base = toAlert({
          ...row,
          video_thumbnail_path: extra?.video_thumbnail_path ?? null,
        });
        return extra
          ? { ...base, breed: extra.breed ?? null, sex: extra.gender ?? null, ageSize: extra.age_size ?? null }
          : base;
      });
    })
  );
  return results.flat();
}

export async function fetchAlertsPaged(
  type: AlertType = "all",
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  opts?: { signal?: AbortSignal }
): Promise<{ items: Alert[]; total: number }> {
  const supabase = getSupabaseClient();
  const from = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, pageSize));
  const to = Math.max(from, from + Math.max(1, pageSize) - 1);

  let base = supabase
    .from("alerts")
    .select(
      "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description,pet_status,status,source_table,source_id",
      { count: "exact" }
    )
    .neq("status", "resolved")
    .neq("status", "rescued")
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
  const rows = data as (AlertRow & { source_table?: string | null; source_id?: string | null })[];
  const reportIds = rows
    .filter((r) => (r as any).source_table === "reports" && (r as any).source_id)
    .map((r) => String((r as any).source_id));
  const byReport: Record<string, { breed?: string | null; gender?: string | null; age_size?: string | null; video_thumbnail_path?: string | null }> = {};
  if (reportIds.length > 0) {
    const { data: rep } = await supabase
      .from("reports")
      .select("id, breed, gender, age_size, video_thumbnail_path")
      .in("id", reportIds);
    if (Array.isArray(rep)) {
      for (const r of rep as any[]) {
        byReport[String(r.id)] = {
          breed: r.breed ?? null,
          gender: r.gender ?? null,
          age_size: r.age_size ?? null,
          video_thumbnail_path: r.video_thumbnail_path ?? null,
        };
      }
    }
  }
  const items = rows.map((row) => {
    const sid = (row as any).source_id as string | undefined;
    const extra = sid ? byReport[sid] : undefined;
    const base = toAlert({
      ...row,
      video_thumbnail_path: extra?.video_thumbnail_path ?? null,
    });
    return extra
      ? { ...base, breed: extra.breed ?? null, sex: extra.gender ?? null, ageSize: extra.age_size ?? null }
      : base;
  });
  return { items, total: count ?? data.length };
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
      "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description,pet_status,status,source_table,source_id"
    )
    .or(orParts.join(","))
    .neq("status", "resolved")
    .neq("status", "rescued")
    .limit(limit);
  const q2 = withAbort(base as any, opts?.signal);
  const { data, error } = await q2;

  if (error || !Array.isArray(data)) return [];
  const rows = data as (AlertRow & { source_table?: string | null; source_id?: string | null })[];
  const reportIds = rows
    .filter((r) => (r as any).source_table === "reports" && (r as any).source_id)
    .map((r) => String((r as any).source_id));
  const byReport: Record<string, { breed?: string | null; gender?: string | null; age_size?: string | null; video_thumbnail_path?: string | null }> = {};
  if (reportIds.length > 0) {
    const { data: rep } = await supabase
      .from("reports")
      .select("id, breed, gender, age_size, video_thumbnail_path")
      .in("id", reportIds);
    if (Array.isArray(rep)) {
      for (const r of rep as any[]) {
        byReport[String(r.id)] = {
          breed: r.breed ?? null,
          gender: r.gender ?? null,
          age_size: r.age_size ?? null,
          video_thumbnail_path: r.video_thumbnail_path ?? null,
        };
      }
    }
  }
  return rows.map((row) => {
    const sid = (row as any).source_id as string | undefined;
    const extra = sid ? byReport[sid] : undefined;
    const base = toAlert({
      ...row,
      video_thumbnail_path: extra?.video_thumbnail_path ?? null,
    });
    return extra
      ? { ...base, breed: extra.breed ?? null, sex: extra.gender ?? null, ageSize: extra.age_size ?? null }
      : base;
  });
}

export async function fetchAdoptionPets(
  limit = 50,
  opts?: { signal?: AbortSignal }
): Promise<AdoptionPet[]> {
  try {
    const res = await fetch(`/api/adoptions/available?limit=${encodeURIComponent(String(limit))}`,
      { signal: opts?.signal as any, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.items) ? (json.items as AdoptionPet[]) : [];
  } catch {
    return [];
  }
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
      "id,species,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude,energy_level,pet_status"
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
  pageSize = DEFAULT_PAGE_SIZE,
  opts?: { signal?: AbortSignal }
): Promise<{ items: AdoptionPet[]; total: number }> {
  try {
    const params = new URLSearchParams({ paged: "1", page: String(page), pageSize: String(pageSize) });
    const res = await fetch(`/api/adoptions/available?${params.toString()}`, {
      signal: (opts?.signal as any) ?? undefined,
      cache: "no-store",
    });
    if (!res.ok) return { items: [], total: 0 };
    const json = await res.json();
    return {
      items: Array.isArray(json?.items) ? (json.items as AdoptionPet[]) : [],
      total: typeof json?.total === "number" ? json.total : 0,
    };
  } catch {
    return { items: [], total: 0 };
  }
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
        const row = payload.new as AlertRow & { status?: string };
        // Ignore resolved/rescued inserts, keep list clean
        const st = (row as any)?.status;
        if (st === "resolved" || st === "rescued") return;
        handlers.onInsert?.(toAlert(row));
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "alerts" },
      (payload) => {
        const row = payload.new as AlertRow & { status?: string };
        // If now resolved/rescued, remove from UI; else update
        const st = (row as any)?.status;
        if (st === "resolved" || st === "rescued") {
          const id = (row as any)?.id as string | undefined;
          if (id) handlers.onDelete?.(id);
          return;
        }
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

export function subscribeToReportsInsert(
  onInsert: (row: { id?: string; report_type?: string | null }) => void
): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel("public:reports:insert")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reports" },
      (payload) => {
        const row = payload.new as { id?: string; report_type?: string | null };
        onInsert(row);
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
  custom_id?: string | null;
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
      custom_id: row?.custom_id ?? null,
      species: formatSpeciesLabel(row?.species ?? null),
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
        "custom_id,species,breed,gender,age_size,features,description,landmark_media_paths,photo_path"
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
        "custom_id,species,breed,gender,age_size,features,description,landmark_media_paths,photo_path"
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
  custom_id?: string | null;
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
  // iREPORT pet status (roaming / in_custody)
  pet_status?: PetStatus | null;
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
    custom_id: (data as any).custom_id ?? null,
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
    pet_status: (data as any).pet_status ?? null,
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

// Contacts directory: fetch public profiles as contacts, tolerant to schema drift
export async function fetchContacts(
  limit = 1000,
  opts?: { signal?: AbortSignal; withRoleOnly?: boolean }
): Promise<Contact[]> {
  try {
    const params = new URLSearchParams();
    if (opts?.withRoleOnly !== false) params.set("withRole", "1");
    const res = await fetch(`/api/contacts?${params.toString()}`, {
      signal: (opts?.signal as any) ?? undefined,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = Array.isArray(json?.items) ? (json.items as Contact[]) : [];
    return items.slice(0, limit);
  } catch {
    return [];
  }
}
