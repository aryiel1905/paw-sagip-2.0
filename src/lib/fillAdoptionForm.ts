import { PDFDocument, PDFForm } from "pdf-lib";

export type AdoptionApplicationValues = {
  id: string;
  created_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  applicant_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null;
  occupation?: string | null;
  social_profile?: string | null;
  civil_status?: string | null;
  pronouns?: string | null;
  adopted_before?: boolean | null;
  id_document_type?: string | null;
  home_type?: string | null;
  rents?: boolean | null;
  move_plan?: string | null;
  live_with?: string[] | null;
  allergies?: boolean | null;
  family_supports?: boolean | null;
  daily_care_by?: string | null;
  financial_responsible?: string | null;
  vacation_caregiver?: string | null;
  hours_alone?: string | null;
  intro_steps?: string | null;
  has_pets_now?: boolean | null;
  had_pets_past?: boolean | null;
  adoption_pets?: {
    pet_name?: string | null;
    species?: string | null;
    location?: string | null;
  } | null;
};

function asDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function buildMapping(d: AdoptionApplicationValues) {
  const fullName =
    d.applicant_name || [d.first_name, d.last_name].filter(Boolean).join(" ");
  const lived = d.live_with ?? [];

  return {
    texts: {
      Applicant_First_Name: d.first_name ?? "",
      Applicant_Last_Name: d.last_name ?? "",
      Applicant_Full_Name: fullName,
      Applicant_Address: d.address ?? "",
      Applicant_Phone: d.phone ?? "",
      Applicant_Email: d.email ?? "",
      Applicant_Birth_Date: asDate(d.birth_date),
      Applicant_Occupation: d.occupation ?? "",
      Applicant_Social_Profile: d.social_profile ?? "",
      Document_Type: d.id_document_type ?? "",
      Move_Plan: d.move_plan ?? "",
      Daily_Care_By: d.daily_care_by ?? "",
      Financial_Responsible: d.financial_responsible ?? "",
      Vacation_Caregiver: d.vacation_caregiver ?? "",
      Hours_Alone: d.hours_alone ?? "",
      Intro_Steps: d.intro_steps ?? "",
      Pet_Name: d.adoption_pets?.pet_name ?? "",
      Pet_Species: d.adoption_pets?.species ?? "",
      Pet_Location: d.adoption_pets?.location ?? "",
      Submitted_At: d.created_at
        ? new Date(d.created_at).toLocaleDateString()
        : "",
    },
    radios: {
      Adopted_Before:
        d.adopted_before === true
          ? "Yes"
          : d.adopted_before === false
          ? "No"
          : "",
      Home_Type: d.home_type ?? "",
      Rents: d.rents === true ? "Yes" : d.rents === false ? "No" : "",
      Allergies:
        d.allergies === true ? "Yes" : d.allergies === false ? "No" : "",
      Family_Supports:
        d.family_supports === true
          ? "Yes"
          : d.family_supports === false
          ? "No"
          : "",
      Has_Pets_Now:
        d.has_pets_now === true ? "Yes" : d.has_pets_now === false ? "No" : "",
      Had_Pets_Past:
        d.had_pets_past === true
          ? "Yes"
          : d.had_pets_past === false
          ? "No"
          : "",
      Civil_Status: d.civil_status ?? "",
      Pronouns: d.pronouns ?? "",
    },
    checks: {
      Live_With_Living_alone: lived.includes("living_alone"),
      Live_With_Spouse: lived.includes("spouse"),
      Live_With_Parents: lived.includes("parents"),
      Live_With_Children_over_18: lived.includes("children_over_18"),
      Live_With_Children_below_18: lived.includes("children_below_18"),
      Live_With_Relatives: lived.includes("relatives"),
      Live_With_Roommates: lived.includes("roommates"),
    },
  };
}

function safeSet(form: PDFForm, name: string, value: string) {
  try {
    form.getTextField(name).setText(value ?? "");
    return;
  } catch {}
  try {
    form.getDropdown(name).select(value);
    return;
  } catch {}
  try {
    if (value) form.getRadioGroup(name).select(value);
    return;
  } catch {}
}

function safeCheck(form: PDFForm, name: string, on: boolean) {
  try {
    const c = form.getCheckBox(name);
    if (on) {
      c.check();
    } else {
      c.uncheck();
    }
  } catch {}
}

export async function fillAdoptionApplicationPdf(
  templateBytes: ArrayBuffer,
  data: AdoptionApplicationValues,
  options?: { flatten?: boolean }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const map = buildMapping(data);

  Object.entries(map.texts).forEach(([name, val]) => safeSet(form, name, val));
  Object.entries(map.radios).forEach(([name, val]) => safeSet(form, name, val));
  Object.entries(map.checks).forEach(([name, checked]) =>
    safeCheck(form, name, !!checked)
  );

  if (options?.flatten) form.flatten();
  return await pdfDoc.save();
}

export async function logPdfFields(templateBytes: ArrayBuffer) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  // View in browser console
  console.groupCollapsed("[PDF] Field names");
  fields.forEach((f) => {
    const name = f.getName();
    const type = (f as any).constructor?.name || "Unknown";
    console.log(type + ": " + name);
  });
  console.groupEnd();
}
