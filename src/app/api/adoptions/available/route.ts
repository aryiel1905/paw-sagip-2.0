import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || "50")));
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.max(1, Math.min(200, Number(url.searchParams.get("pageSize") || "60")));

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

  // Helper to map rows to UI shape (with public image URL if present)
  const mapRow = (row: any) => {
    const imageUrl = row.photo_path
      ? supabase.storage.from("pet-media").getPublicUrl(row.photo_path).data
          .publicUrl
      : null;
    const kind = toKind(row.species);
    const emoji = row.emoji_code ?? (kind === "dog" ? "🐶" : kind === "cat" ? "🐱" : "🐾");
    return {
      id: row.id as string,
      kind,
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

  if (!paged) {
    // Over-fetch to compensate for filtered-out pending items
    const over = Math.min(600, limit * 3);
    const { data, error } = await supabase
      .from("adoption_pets")
      .select(
        "id,species,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude,pet_status"
      )
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(over);
    if (error || !Array.isArray(data)) {
      return NextResponse.json({ items: [] });
    }
    const filtered = (data as any[]).filter((r) => !pendingSet.has(String(r.id)));
    const items = filtered.slice(0, limit).map(mapRow);
    return NextResponse.json({ items });
  }

  // Paged
  const from = Math.max(0, (page - 1) * pageSize);
  const to = Math.max(from, from + pageSize - 1);

  const { data, error, count } = await supabase
    .from("adoption_pets")
    .select(
      "id,species,pet_name,age_size,features,location,emoji_code,status,created_at,photo_path,latitude,longitude,pet_status",
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

  const pageItems = (data as any[])
    .filter((r) => !pendingSet.has(String(r.id)))
    .map(mapRow);
  return NextResponse.json({ items: pageItems, total });
}

