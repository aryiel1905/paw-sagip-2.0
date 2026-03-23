import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/constants/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toKind(species?: string | null): "dog" | "cat" | "other" {
  const s = (species ?? "").toLowerCase();
  if (s.startsWith("dog")) return "dog";
  if (s.startsWith("cat")) return "cat";
  return "other";
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const url = new URL(request.url);
  const paged = url.searchParams.has("paged");
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, Number(url.searchParams.get("limit") || "50")));
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, Number(url.searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE))));

  // Collect all pet_ids with any pending application (service role bypasses RLS)
  const { data: pendingRows } = await supabase
    .from("adoption_applications")
    .select("pet_id")
    .eq("status", "pending");
  const pendingSet = new Set<string>(
    Array.isArray(pendingRows)
      ? pendingRows
          .map((r: any) => (r?.pet_id ? String(r.pet_id) : null))
          .filter(Boolean) as string[]
      : []
  );

  async function speciesMetaMap(rows: any[]) {
    const ids = Array.from(
      new Set(
        rows
          .map((r) => (r?.species_id ? String(r.species_id) : null))
          .filter(Boolean) as string[]
      )
    );
    if (ids.length === 0) return new Map<string, { canonical_name?: string; is_domestic_adoptable?: boolean }>();
    const { data } = await supabase
      .from("animal_species")
      .select("id, canonical_name, is_domestic_adoptable")
      .in("id", ids);
    const map = new Map<string, { canonical_name?: string; is_domestic_adoptable?: boolean }>();
    if (Array.isArray(data)) {
      for (const row of data as any[]) {
        map.set(String((row as any).id), {
          canonical_name: (row as any).canonical_name ?? undefined,
          is_domestic_adoptable: (row as any).is_domestic_adoptable ?? undefined,
        });
      }
    }
    return map;
  }

  // Helper to map rows to UI shape (with public image URL if present)
  const mapRowBase = (row: any, sMeta?: { canonical_name?: string; is_domestic_adoptable?: boolean }) => {
    const imageUrl = row.photo_path
      ? supabase.storage.from("pet-media").getPublicUrl(row.photo_path).data
          .publicUrl
      : null;
    const displaySpecies = (sMeta?.canonical_name as string | undefined) ?? ((row.species as string | null) ?? null);
    const kind = toKind(displaySpecies);
    const emoji =
      row.emoji_code ??
      (kind === "dog"
        ? "\u{1F436}"
        : kind === "cat"
        ? "\u{1F431}"
        : "\u{1F43E}");
    return {
      id: row.id as string,
      kind,
      species: displaySpecies,
      speciesId: (row.species_id as string | null) ?? null,
      isDomesticAdoptable:
        typeof sMeta?.is_domestic_adoptable === "boolean"
          ? sMeta.is_domestic_adoptable
          : null,
      name: (row.pet_name as string | null) ?? "",
      age: (row.age_size as string | null) ?? "",
      note: (row.features as string | null) ?? "",
      location: (row.location as string | null) ?? "",
      emoji,
      imageUrl,
      createdAt: (row.created_at as string | null) ?? null,
      latitude: (row.latitude as number | null) ?? null,
      longitude: (row.longitude as number | null) ?? null,
      petStatus: (row.pet_status as any) ?? "in_custody",
    };
  };

  const enrichWithReportDetails = async (rows: any[]) => {
    const sMap = await speciesMetaMap(rows);
    const items = rows.map((r) => mapRowBase(r, r?.species_id ? sMap.get(String(r.species_id)) : undefined));
    const ids = rows.map((r) => String(r.id));
    if (ids.length === 0) return items;
    // Fetch breed/sex/age from reports via promoted_to_pet_id
    const { data: rep } = await supabase
      .from("reports")
      .select("promoted_to_pet_id, breed, gender, age_size")
      .in("promoted_to_pet_id", ids);
    const byPet = new Map<string, { breed?: string | null; gender?: string | null; age_size?: string | null }>();
    if (Array.isArray(rep)) {
      for (const r of rep as any[]) {
        const k = String((r as any).promoted_to_pet_id);
        byPet.set(k, {
          breed: (r as any).breed ?? null,
          gender: (r as any).gender ?? null,
          age_size: (r as any).age_size ?? null,
        });
      }
    }
    return items.map((it) => {
      const extra = byPet.get(it.id);
      if (!extra) return it;
      return {
        ...it,
        breed: extra.breed ?? null,
        sex: extra.gender ?? null,
        age: (it.age as string) || (extra.age_size ?? ""),
      };
    });
  };

  if (!paged) {
    // Over-fetch to compensate for filtered-out pending items
    const over = Math.min(600, limit * 3);
    const { data, error } = await supabase
      .from("adoption_pets")
      .select(
        "id,species,species_id,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude,pet_status"
      )
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(over);
    if (error || !Array.isArray(data)) {
      return NextResponse.json({ items: [] });
    }
    const filtered = (data as any[]).filter((r) => !pendingSet.has(String(r.id)));
    const limited = filtered.slice(0, limit);
    const items = await enrichWithReportDetails(limited);
    return NextResponse.json({ items });
  }

  // Paged
  const from = Math.max(0, (page - 1) * pageSize);
  const to = Math.max(from, from + pageSize - 1);

  const { data, error, count } = await supabase
    .from("adoption_pets")
    .select(
      "id,species,species_id,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude,pet_status",
      { count: "exact" }
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ items: [], total: count ?? 0 });
  }

  // Count available minus those with pending
  let total = count ?? data.length;
  try {
    const { count: availCount } = await supabase
      .from("adoption_pets")
      .select("id", { count: "exact", head: true })
      .eq("status", "available");
    let pendingAvailCount = 0;
    if (pendingSet.size > 0) {
      const { count: c2 } = await supabase
        .from("adoption_pets")
        .select("id", { count: "exact", head: true })
        .eq("status", "available")
        .in("id", Array.from(pendingSet));
      pendingAvailCount = c2 ?? 0;
    }
    if (typeof availCount === "number") total = Math.max(0, availCount - pendingAvailCount);
  } catch {}

  const pageRows = (data as any[]).filter((r) => !pendingSet.has(String(r.id)));
  const pageItems = await enrichWithReportDetails(pageRows);
  return NextResponse.json({ items: pageItems, total });
}
