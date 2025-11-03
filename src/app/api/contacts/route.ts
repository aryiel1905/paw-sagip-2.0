import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const url = new URL(request.url);
  const withRole = url.searchParams.get("withRole");

  let query = supabase
    .from("profiles")
    .select("id,display_name,email,phone,role,barangay_name,barangay_id")
    .order("display_name", { ascending: true });

  if (withRole) {
    // Only include rows that have a non-empty role
    query = query.not("role", "is", null).neq("role", "");
  }

  const { data: profiles, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = Array.isArray(profiles) ? (profiles as any[]) : [];

  // Look up barangay details to obtain city/province
  const ids = Array.from(
    new Set(
      rows
        .map((r) => (r?.barangay_id ? String(r.barangay_id) : null))
        .filter(Boolean) as string[]
    )
  );
  const byId: Record<string, { id: string; name?: string | null; city?: string | null; province?: string | null }> = {};
  if (ids.length > 0) {
    const { data: brgys } = await supabase
      .from("barangays")
      .select("id,name,city,province")
      .in("id", ids);
    if (Array.isArray(brgys)) {
      for (const b of brgys as any[]) {
        byId[String(b.id)] = {
          id: String(b.id),
          name: b.name ?? null,
          city: b.city ?? null,
          province: b.province ?? null,
        };
      }
    }
  }

  // Normalize for client rendering
  const items = rows.map((r: any) => {
    const b = r?.barangay_id ? byId[String(r.barangay_id)] : undefined;
    const brgyName = (r.barangay_name || "").trim();
    const normalizedBarangay = brgyName && brgyName.toLowerCase() !== "empty" ? brgyName : (b?.name ?? null);
    return {
      id: String(r.id),
      name: (r.display_name ?? r.full_name ?? r.email ?? "").trim() || "Unknown",
      email: r.email ?? null,
      phone: r.phone ?? null,
      role: r.role ?? null,
      barangay: normalizedBarangay,
      city: b?.city ?? null,
      province: b?.province ?? null,
    };
  });

  return NextResponse.json({ items });
}
