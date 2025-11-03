import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const url = new URL(request.url);
  const petId = url.searchParams.get("petId");
  if (!petId) return NextResponse.json({ error: "petId required" }, { status: 400 });

  // 1) Try adoption_pets.posted_by
  const { data: petRow, error: petErr } = await supabase
    .from("adoption_pets")
    .select("posted_by")
    .eq("id", petId)
    .maybeSingle();
  if (petErr) return NextResponse.json({ error: petErr.message }, { status: 500 });

  let posterId: string | null = (petRow as any)?.posted_by ?? null;

  // 2) Fallback: find report user that promoted this pet
  if (!posterId) {
    const { data: rep } = await supabase
      .from("reports")
      .select("user_id")
      .eq("promoted_to_pet_id", petId)
      .maybeSingle();
    posterId = (rep as any)?.user_id ?? null;
  }

  if (!posterId) return NextResponse.json({ contact: null });

  const { data: prof, error: perr } = await supabase
    .from("profiles")
    .select("display_name,email,phone")
    .eq("id", posterId)
    .maybeSingle();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });

  const contact = prof
    ? {
        name: (prof as any).display_name ?? null,
        email: (prof as any).email ?? null,
        phone: (prof as any).phone ?? null,
      }
    : null;

  return NextResponse.json({ contact });
}

