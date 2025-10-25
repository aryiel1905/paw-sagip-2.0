import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCsv(rows: any[], columns: string[]): string {
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.join(",");
  const lines = rows.map((r) => columns.map((c) => escape((r as any)[c])).join(","));
  return [header, ...lines].join("\n");
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  // Resolve current user from cookies to scope export
  let currentUserId: string | null = null;
  let currentUserEmail: string | null = null;
  try {
    const jar = await cookies();
    const accessToken =
      jar.get("sb-access-token")?.value ||
      (() => {
        try {
          const raw = jar.get("supabase-auth-token")?.value;
          if (!raw) return null;
          const arr = JSON.parse(raw);
          return Array.isArray(arr) && arr[0]?.access_token ? arr[0].access_token : null;
        } catch {
          return null;
        }
      })();
    if (accessToken) {
      const { data } = await supabase.auth.getUser(accessToken);
      if (data?.user) {
        currentUserId = data.user.id ?? null;
        currentUserEmail = (data.user.email as string | null) ?? null;
      }
    }
  } catch {}

  if (!currentUserId && !currentUserEmail) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Fetch reports owned by the user or submitted with their email
  let query = supabase
    .from("reports")
    .select(
      "id, custom_id, created_at, report_type, location, species, pet_name, status, reporter_contact"
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  if (currentUserEmail) {
    query = query.or(
      `user_id.eq.${currentUserId ?? ""},reporter_contact.eq.${currentUserEmail}`
    );
  } else if (currentUserId) {
    query = query.eq("user_id", currentUserId);
  }
  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const safeRows = Array.isArray(rows) ? rows : [];
  if (format === "json") {
    return NextResponse.json({ items: safeRows });
  }

  const columns = [
    "custom_id",
    "id",
    "created_at",
    "report_type",
    "location",
    "species",
    "pet_name",
    "status",
    "reporter_contact",
  ];
  const csv = toCsv(safeRows, columns);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=reports_export.csv",
      "Cache-Control": "no-store",
    },
  });
}
