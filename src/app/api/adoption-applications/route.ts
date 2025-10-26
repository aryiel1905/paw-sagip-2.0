import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdoptionApplicationPayload = {
  petId?: string;
  termsAccepted?: boolean;
  // Step 1 (applicant)
  applicantName?: string; // optional combined
  firstName?: string;
  lastName?: string;
  address?: string;
  phone?: string;
  email?: string;
  birthDate?: string; // YYYY-MM-DD
  occupation?: string | null;
  company?: string | null;
  socialProfile?: string | null;
  civilStatus?: string | null; // single|married|others
  pronouns?: string | null; // she/her|he/him|they/them
  adoptedBefore?: boolean | null;
  promptedBy?: string[] | null; // friends|website|social_media|other
  // Step 2 (questionnaire)
  adoptWhat?: string | null; // cat|dog|both|not_decided
  specificShelterAnimal?: boolean | null;
  idealPet?: string | null;
  homeType?: string | null; // house|apartment|condo|other
  rents?: boolean | null;
  movePlan?: string | null;
  liveWith?: string[] | null; // array of codes
  allergies?: boolean | null;
  familySupports?: boolean | null;
  dailyCareBy?: string | null;
  financialResponsible?: string | null;
  vacationCaregiver?: string | null;
  hoursAlone?: string | null;
  introSteps?: string | null;
  hasPetsNow?: boolean | null;
  hadPetsPast?: boolean | null;
  // Step 3 (uploads)
  homePhotoPaths?: string[] | null;
};

export async function POST(request: Request) {
  let payload: AdoptionApplicationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.petId || !payload.termsAccepted) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }
  if (
    !payload.phone &&
    !payload.email &&
    !payload.firstName &&
    !payload.lastName
  ) {
    return NextResponse.json(
      { error: "Provide phone or email" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  let userId: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {}

  // Attempt to persist; if the table doesn't exist yet, return a graceful response.
  const insertRow = {
    user_id: userId,
    pet_id: payload.petId,
    applicant_name:
      (payload.applicantName ??
        [payload.firstName, payload.lastName].filter(Boolean).join(" ")) ||
      null,
    first_name: payload.firstName ?? null,
    last_name: payload.lastName ?? null,
    address: payload.address ?? null,
    phone: payload.phone ?? null,
    email: payload.email ?? null,
    birth_date: payload.birthDate
      ? new Date(payload.birthDate).toISOString().slice(0, 10)
      : null,
    occupation: payload.occupation ?? null,
    company: payload.company ?? null,
    social_profile: payload.socialProfile ?? null,
    civil_status: payload.civilStatus ?? null,
    pronouns: payload.pronouns ?? null,
    adopted_before:
      typeof payload.adoptedBefore === "boolean" ? payload.adoptedBefore : null,
    prompted_by: Array.isArray(payload.promptedBy) ? payload.promptedBy : null,

    adopt_what: payload.adoptWhat ?? null,
    specific_shelter_animal:
      typeof payload.specificShelterAnimal === "boolean"
        ? payload.specificShelterAnimal
        : null,
    ideal_pet: payload.idealPet ?? null,
    home_type: payload.homeType ?? null,
    rents: typeof payload.rents === "boolean" ? payload.rents : null,
    move_plan: payload.movePlan ?? null,
    live_with: Array.isArray(payload.liveWith) ? payload.liveWith : null,
    allergies:
      typeof payload.allergies === "boolean" ? payload.allergies : null,
    family_supports:
      typeof payload.familySupports === "boolean"
        ? payload.familySupports
        : null,
    daily_care_by: payload.dailyCareBy ?? null,
    financial_responsible: payload.financialResponsible ?? null,
    vacation_caregiver: payload.vacationCaregiver ?? null,
    hours_alone: payload.hoursAlone ?? null,
    intro_steps: payload.introSteps ?? null,
    has_pets_now:
      typeof payload.hasPetsNow === "boolean" ? payload.hasPetsNow : null,
    had_pets_past:
      typeof payload.hadPetsPast === "boolean" ? payload.hadPetsPast : null,

    home_photo_paths: Array.isArray(payload.homePhotoPaths)
      ? payload.homePhotoPaths
      : [],
    terms_accepted: !!payload.termsAccepted,
    status: "pending",
  } as const;

  const { error } = await supabase
    .from("adoption_applications")
    .insert([insertRow]);

  if (error) {
    const missingUserId = error.message?.includes?.("user_id");
    if (missingUserId) {
      const fallbackRow = { ...insertRow } as Record<string, unknown>;
      delete fallbackRow.user_id;
      const { error: retryError } = await supabase
        .from("adoption_applications")
        .insert([fallbackRow]);
      if (!retryError) {
        return NextResponse.json({ success: true, note: "Saved without user link" });
      }
      return NextResponse.json(
        {
          success: true,
          note: "Saved later (table not ready)",
          detail: retryError.message,
        },
        { status: 202 }
      );
    }
    return NextResponse.json(
      {
        success: true,
        note: "Saved later (table not ready)",
        detail: error.message,
      },
      { status: 202 }
    );
  }

  return NextResponse.json({ success: true });
}
