import { PDFDocument, PDFForm } from "pdf-lib";

export type AdoptionApplicationValues = {
  id: string;
  created_at?: string | null;
  status?: string | null;
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
  adopt_what?: string | null;
  adoption_pets?: {
    pet_name?: string | null;
    species?: string | null;
    location?: string | null;
    photo_path?: string | null;
    age_size?: string | null;
    breed?: string | null;
    sex?: string | null;
    gender?: string | null;
  } | null;
};

function asDate(value?: string | null) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10) || "--";
  return d.toISOString().slice(0, 10);
}

function text(v?: string | null): string {
  const s = (v ?? "").toString().trim();
  return s ? s : "--";
}

function yesNo(v?: boolean | null): string {
  return v === true ? "Yes" : v === false ? "No" : "--";
}

function buildMapping(d: AdoptionApplicationValues): {
  texts: Record<string, string>;
  radios: Record<string, string>;
  checks: Record<string, boolean>;
} {
  const lived = d.live_with ?? [];

  return {
    texts: {
      // Use only Text fields in the template with these names
      Applicant_First_Name: text(d.first_name),
      Applicant_Last_Name: text(d.last_name),
      Applicant_Email: text(d.email),
      Applicant_Phone: text(d.phone),
      Applicant_Address: text(d.address),
      Applicant_Birth_Date: asDate(d.birth_date),
      Applicant_Occupation: text(d.occupation),
      Applicant_Social_Profile: text(d.social_profile),
      Civil_Status: text(d.civil_status),
      Adopted_Before: yesNo(d.adopted_before),
      Pronouns: text(d.pronouns),

      Home_Type: text(d.home_type),
      Rents: yesNo(d.rents),
      Live_With:
        lived
          .map((v) =>
            v === "living_alone"
              ? "Living alone"
              : v === "spouse"
              ? "Spouse"
              : v === "parents"
              ? "Parents"
              : v === "children_over_18"
              ? "Children over 18"
              : v === "children_below_18"
              ? "Children below 18"
              : v === "relatives"
              ? "Relatives"
              : v === "roommates"
              ? "Roommates"
              : v
          )
          .join(", ") || "--",
      Allergies: yesNo(d.allergies),
      Family_Supports: yesNo(d.family_supports),
      Daily_Care_By: text(d.daily_care_by),
      Financial_Responsible: text(d.financial_responsible),
      Vacation_Caregiver: text(d.vacation_caregiver),
      Hours_Alone: text(d.hours_alone),
      Move_Plan: text(d.move_plan),
      Intro_Steps: text(d.intro_steps),
      Has_Pets_Now: yesNo(d.has_pets_now),
      Had_Pets_Past: yesNo(d.had_pets_past),
      // Pet summary fields (text only)
      Pet_Name: text(d.adoption_pets?.pet_name),
      Pet_Location: text(d.adoption_pets?.location),
      Pet_Type: text(d.adoption_pets?.species ?? d.adopt_what ?? ""),
      Pet_Breed: text((d as any)?.adoption_pets?.breed),
      Pet_Sex: text(
        (d as any)?.adoption_pets?.sex ?? (d as any)?.adoption_pets?.gender
      ),
      Pet_Age_Size: text((d as any)?.adoption_pets?.age_size),
      Application_Submitted: d.created_at
        ? new Date(d.created_at).toLocaleDateString()
        : "--",
      Application_Status: text((d as any)?.status),
      // Alternate dot-notated names (if your template uses them)
      "adoption_pets.pet_name": text(d.adoption_pets?.pet_name),
      "adoption_pets.location": text(d.adoption_pets?.location),
      "adoption_pets.species": text(
        d.adoption_pets?.species ?? d.adopt_what ?? ""
      ),
      "adoption_pets.breed": text((d as any)?.adoption_pets?.breed),
      "adoption_pets.sex": text(
        (d as any)?.adoption_pets?.sex ?? (d as any)?.adoption_pets?.gender
      ),
      "adoption_pets.age_size": text((d as any)?.adoption_pets?.age_size),
      "adoption_applications.created_at": d.created_at
        ? new Date(d.created_at).toLocaleDateString()
        : "--",
      "adoption_applications.status": text((d as any)?.status),
    },
    radios: {},
    checks: {},
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

export type PhotoInput = { data: ArrayBuffer; mimeType?: string | null };

function fitIntoBox(
  imgWidth: number,
  imgHeight: number,
  boxWidth: number,
  boxHeight: number
) {
  const scale = Math.min(boxWidth / imgWidth, boxHeight / imgHeight);
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  return { width, height };
}

async function drawPhotoGrid(
  pdfDoc: PDFDocument,
  photos: PhotoInput[],
  opts?: { cols?: number; rows?: number; margin?: number; gutter?: number }
) {
  const pages = pdfDoc.getPages();
  const base = pages[0];
  const { width: pageWidth, height: pageHeight } = base.getSize();

  const cols = opts?.cols ?? 3;
  const rows = opts?.rows ?? 2;
  const margin = opts?.margin ?? 36; // 0.5in
  const gutter = opts?.gutter ?? 12;
  const usableWidth = pageWidth - margin * 2 - gutter * (cols - 1);
  const usableHeight = pageHeight - margin * 2 - gutter * (rows - 1);
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  for (let i = 0; i < Math.min(photos.length, cols * rows); i++) {
    const p = photos[i];
    const ext = (p.mimeType || "").toLowerCase();
    const bytes = new Uint8Array(p.data);
    const image = ext.includes("png")
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    const col = i % cols;
    const row = Math.floor(i / cols);
    const { width, height } = fitIntoBox(
      image.width,
      image.height,
      cellWidth,
      cellHeight
    );

    const x = margin + col * (cellWidth + gutter) + (cellWidth - width) / 2;
    const containerTop = pageHeight - margin - row * (cellHeight + gutter);
    const y = containerTop - height - (cellHeight - height) / 2;

    page.drawImage(image, { x, y, width, height });
  }
}

export async function fillAdoptionApplicationPdf(
  templateBytes: ArrayBuffer,
  data: AdoptionApplicationValues,
  options?: {
    flatten?: boolean;
    photos?: PhotoInput[];
    photoFieldNames?: string[];
    petPhoto?: PhotoInput | null;
    petPhotoFieldName?: string;
    allowGridFallback?: boolean; // if true, draw leftover photos on a new page
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  // Force all pages to A4 size (points). 1pt = 1/72in; A4 = 210mm x 297mm ≈ 595.28 x 841.89pt
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  pdfDoc.getPages().forEach((p) => p.setSize(A4_WIDTH, A4_HEIGHT));
  const form = pdfDoc.getForm();
  const map = buildMapping(data);

  Object.entries(map.texts).forEach(([name, val]) => safeSet(form, name, val));
  Object.entries(map.radios).forEach(([name, val]) => safeSet(form, name, val));
  Object.entries(map.checks).forEach(([name, checked]) =>
    safeCheck(form, name, !!checked)
  );

  // Fill dedicated pet photo field if provided (no longer fallback to home photo)
  const petPhotoInput: PhotoInput | null =
    (options?.petPhoto as PhotoInput | null) ?? null;
  if (petPhotoInput) {
    try {
      const bytes = new Uint8Array(petPhotoInput.data);
      const ext = (petPhotoInput.mimeType || "").toLowerCase();
      const img = ext.includes("png")
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
      const preferred = options?.petPhotoFieldName || "Pet_Photo";
      const candidates = [
        preferred,
        "Pet_Photo",
        "Pet_Photo_af_image",
        "Image1_af_image",
        "Image_af_image",
        "PetPhoto",
        "Pet_Image",
      ];
      for (const name of candidates) {
        try {
          form.getButton(name).setImage(img);
          break;
        } catch {}
      }
    } catch {}
  }

  if (options?.photos && options.photos.length) {
    // Prefer filling named image fields (Push Buttons) if they exist
    const names = (
      options.photoFieldNames && options.photoFieldNames.length
        ? options.photoFieldNames
        : ["Home_Photo_1", "Home_Photo_2", "Home_Photo_3"]
    ).slice(0, 3);

    let filledCount = 0;
    const remaining: PhotoInput[] = [];
    for (let i = 0; i < Math.min(options.photos.length, names.length); i++) {
      const p = options.photos[i];
      const name = names[i];
      const bytes = new Uint8Array(p.data);
      const ext = (p.mimeType || "").toLowerCase();
      try {
        const img = ext.includes("png")
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
        try {
          form.getButton(name).setImage(img);
          filledCount += 1;
          continue; // done with this photo
        } catch {
          // No button found with that name; fallback later
          remaining.push(p);
        }
      } catch {
        // skip invalid image
      }
    }

    // If any images couldn't be put into fields (or extra images left), append grid page
    const extra = options.photos.slice(names.length).concat(remaining);
    if (options.allowGridFallback && extra.length) {
      await drawPhotoGrid(pdfDoc, extra);
    }
  }

  if (options?.flatten) form.flatten();
  return await pdfDoc.save();
}
