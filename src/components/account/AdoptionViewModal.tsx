"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Printer,
  Save as SaveIcon,
  CircleX,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { PET_MEDIA_BUCKET } from "@/data/supabaseApi";
import { showToast } from "@/lib/toast";
import { fillAdoptionApplicationPdf } from "@/lib/fillAdoptionForm";

const EDITABLE_STATUSES = new Set(["pending", "reviewing", "in_review"]);
const ADOPTION_FORM_TEMPLATE_PATH = "/pdfs/PawSagip_Form.pdf";

const CIVIL_STATUS_OPTIONS = ["single", "married", "others"] as const;
const PRONOUN_OPTIONS = ["she/her", "he/him", "they/them"] as const;
const LIVE_WITH_OPTIONS = [
  { value: "living_alone", label: "Living alone" },
  { value: "spouse", label: "Spouse" },
  { value: "parents", label: "Parents" },
  { value: "children_over_18", label: "Children over 18" },
  { value: "children_below_18", label: "Children below 18" },
  { value: "relatives", label: "Relatives" },
  { value: "roommates", label: "Roommates" },
];

export type AdoptionApplicationViewData = {
  id: string;
  status: string | null;
  created_at: string | null;
  pet_id: string | null;
  adopt_what?: string | null;
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
  id_document_path?: string | null;
  home_photo_paths?: string[] | null;
  adoption_pets?: {
    id?: string | null;
    pet_name?: string | null;
    species?: string | null;
    breed?: string | null;
    sex?: string | null;
    age?: string | null;
    location?: string | null;
    photo_url?: string | null;
    photo_path?: string | null;
    main_photo_path?: string | null;
    main_photo_url?: string | null;
    primary_photo_url?: string | null;
    primary_photo_path?: string | null;
    media_urls?: string[] | null;
    media_paths?: string[] | null;
    gallery_urls?: string[] | null;
    gallery_paths?: string[] | null;
    photos?: string[] | null;
    images?: string[] | null;
  } | null;
};

type EditFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  occupation: string;
  socialProfile: string;
  civilStatus: (typeof CIVIL_STATUS_OPTIONS)[number] | "";
  pronouns: (typeof PRONOUN_OPTIONS)[number] | "";
  adoptedBefore: boolean | null;
  idDocumentType: string;
  idDocumentPath: string | null;
  homeType: "house" | "apartment" | "condo" | "other" | "";
  rents: boolean | null;
  movePlan: string;
  liveWith: string[];
  allergies: boolean | null;
  familySupports: boolean | null;
  dailyCareBy: string;
  financialResponsible: string;
  vacationCaregiver: string;
  hoursAlone: string;
  introSteps: string;
  hasPetsNow: boolean | null;
  hadPetsPast: boolean | null;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function toFormState(data: AdoptionApplicationViewData): EditFormState {
  return {
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    address: data.address ?? "",
    birthDate: toDateInput(data.birth_date),
    occupation: data.occupation ?? "",
    socialProfile: data.social_profile ?? "",
    civilStatus: (data.civil_status as EditFormState["civilStatus"]) || "",
    pronouns: (data.pronouns as EditFormState["pronouns"]) || "",
    adoptedBefore:
      typeof data.adopted_before === "boolean" ? data.adopted_before : null,
    idDocumentType: data.id_document_type ?? "",
    idDocumentPath: data.id_document_path ?? null,
    homeType: (data.home_type as EditFormState["homeType"]) || "",
    rents: typeof data.rents === "boolean" ? data.rents : null,
    movePlan: data.move_plan ?? "",
    liveWith: Array.isArray(data.live_with) ? data.live_with : [],
    allergies: typeof data.allergies === "boolean" ? data.allergies : null,
    familySupports:
      typeof data.family_supports === "boolean" ? data.family_supports : null,
    dailyCareBy: data.daily_care_by ?? "",
    financialResponsible: data.financial_responsible ?? "",
    vacationCaregiver: data.vacation_caregiver ?? "",
    hoursAlone: data.hours_alone ?? "",
    introSteps: data.intro_steps ?? "",
    hasPetsNow:
      typeof data.has_pets_now === "boolean" ? data.has_pets_now : null,
    hadPetsPast:
      typeof data.had_pets_past === "boolean" ? data.had_pets_past : null,
  };
}

function boolLabel(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value ? "Yes" : "No";
}

function liveWithLabel(values?: string[] | null) {
  if (!values || values.length === 0) return "-";
  const lookup = new Map(
    LIVE_WITH_OPTIONS.map((opt) => [opt.value, opt.label])
  );
  return values.map((item) => lookup.get(item) || item).join(", ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

async function fetchAdoptionApplicationById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("adoption_applications")
    .select("*, adoption_pets:pet_id ( * )")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as AdoptionApplicationViewData) ?? null;
}
function statusTone(status?: string | null) {
  if (!status) return "bg-slate-100 text-slate-800";
  const value = status.toLowerCase();
  if (value === "approved") return "bg-emerald-100 text-emerald-800";
  if (value === "pending") return "bg-amber-100 text-amber-800";
  if (value === "declined") return "bg-rose-100 text-rose-800";
  if (value === "reviewing" || value === "in_review") {
    return "bg-sky-100 text-sky-800";
  }
  if (value === "on_hold") return "bg-slate-200 text-slate-900";
  return "bg-slate-100 text-slate-800";
}

type FieldProps = {
  label: string;
  value: string;
  edit?: ReactNode;
  stacked?: boolean;
  editable?: boolean;
};

function FieldRow({
  label,
  value,
  edit,
  stacked,
  editable = false,
}: FieldProps) {
  const highlightClass = editable
    ? "border-neutral-700 bg-white"
    : "border-[var(--border-color)] bg-[var(--card-bg)]";
  return (
    <div className={stacked ? "md:col-span-2" : undefined}>
      <div className="ink-subtle text-xs">{label}</div>
      <div
        className={`mt-1 rounded-xl border px-3 py-2 text-sm ink-heading transition-colors duration-150 ${highlightClass}`}
      >
        {edit ?? value}
      </div>
    </div>
  );
}
export default function AdoptionViewModal({
  open,
  applicationId,
  data,
  loading,
  error,
  onClose,
}: {
  open: boolean;
  applicationId?: string | null;
  data?: AdoptionApplicationViewData | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}) {
  const supabase = getSupabaseClient();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localData, setLocalData] =
    useState<AdoptionApplicationViewData | null>(null);
  const [petDetails, setPetDetails] = useState<
    AdoptionApplicationViewData["adoption_pets"] | null
  >(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewer, setViewer] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const [poster, setPoster] = useState<{ name: string | null; email: string | null; phone: string | null } | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) return;
    setEditing(false);
    setForm(null);
    setSaving(false);
    setActionError(null);
    setViewer(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!applicationId) {
      setLocalData(null);
      setLocalError(null);
      setLocalLoading(false);
      return;
    }
    let cancelled = false;
    setLocalLoading(true);
    setLocalError(null);
    setLocalData(null);
    fetchAdoptionApplicationById(applicationId)
      .then((row) => {
        if (!cancelled) setLocalData(row);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setLocalError("Could not load application details.");
        }
      })
      .finally(() => {
        if (!cancelled) setLocalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, applicationId]);

  const effectiveData = useMemo(
    () => data ?? localData ?? null,
    [data, localData]
  );
  const effectiveLoading = loading ?? localLoading;
  const effectiveError = error ?? localError;
  const editingReady = editing && form !== null;

  useEffect(() => {
    if (!editing || !firstInputRef.current) return;
    try {
      firstInputRef.current.focus();
      firstInputRef.current.select?.();
    } catch {}
  }, [editing]);

  useEffect(() => {
    if (!open) return;
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const body = document.body as HTMLBodyElement;
    body.style.position = "fixed";
    body.style.top = "-" + y + "px";
    body.style.left = "0";
    body.style.right = "0";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (viewer) {
          setViewer(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      if (typeof window !== "undefined") window.scrollTo(0, y);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, viewer]);

  const imageUrls = useMemo(() => {
    if (!effectiveData?.home_photo_paths?.length) return [];
    return effectiveData.home_photo_paths
      .map((path) =>
        path
          ? supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(path).data
              .publicUrl
          : null
      )
      .filter((url): url is string => Boolean(url));
  }, [effectiveData?.home_photo_paths, supabase]);

  const idDocumentUrl = useMemo(() => {
    if (!effectiveData?.id_document_path) return null;
    const { data } = supabase.storage
      .from(PET_MEDIA_BUCKET)
      .getPublicUrl(effectiveData.id_document_path);
    return data.publicUrl ?? null;
  }, [effectiveData?.id_document_path, supabase]);

  const adoptNote = useMemo(() => {
    if (!effectiveData?.adopt_what) return "Applying for: --";
    const kind = effectiveData.adopt_what.toLowerCase();
    if (kind === "cat") return "Applying for: Cat";
    if (kind === "dog") return "Applying for: Dog";
    return "Applying for: " + effectiveData.adopt_what;
  }, [effectiveData?.adopt_what]);

  const petProfile = useMemo(() => {
    const ap = effectiveData?.adoption_pets ?? petDetails ?? null;
    const pet: any = Array.isArray(ap) ? ap[0] ?? null : ap;
    if (!pet) return null;
    const name = pet.pet_name?.trim() || "Unnamed Pet";
    const species =
      pet.species?.trim() || effectiveData?.adopt_what?.trim() || "--";
    const location = pet.location?.trim() || "--";
    const breed = (pet.breed ?? pet.breeds)?.toString().trim() || "--";
    const sex = (pet.sex ?? pet.gender)?.toString().trim() || "--";
    const age = (pet.age_size ?? pet.age)?.toString().trim() || "--";

    const pathCandidates = [
      pet.photo_path,
      pet.main_photo_path,
      pet.primary_photo_path,
      pet.cover_photo_path,
      pet.image_path,
      pet.media_paths?.[0],
      pet.gallery_paths?.[0],
    ].filter(Boolean) as string[];
    const urlCandidates = [
      pet.photo_url,
      pet.main_photo_url,
      pet.primary_photo_url,
      pet.cover_photo_url,
      pet.image_url,
      pet.media_urls?.[0],
      pet.gallery_urls?.[0],
      pet.photos?.[0],
      pet.images?.[0],
    ].filter(Boolean) as string[];

    let photo: string | null = null;
    for (const p of pathCandidates) {
      const { data } = supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p);
      if (data.publicUrl) {
        photo = data.publicUrl;
        break;
      }
    }
    if (!photo) {
      photo =
        urlCandidates.find(
          (u) => typeof u === "string" && /^https?:\/\//i.test(u)
        ) || null;
    }

    return { name, species, location, breed, sex, age, photo };
  }, [
    effectiveData?.adoption_pets,
    effectiveData?.adopt_what,
    supabase,
    petDetails,
  ]);

  const canEditStatus = effectiveData?.status
    ? EDITABLE_STATUSES.has(effectiveData.status.toLowerCase())
    : false;

  // Load contact details for the listing poster via secure server API
  useEffect(() => {
    const petId = (effectiveData?.pet_id as string | null) ||
      ((effectiveData?.adoption_pets as any)?.id as string | null) || null;
    if (!petId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/adoptions/pet-contact?petId=${encodeURIComponent(petId)}`, { cache: "no-store" });
        if (!cancelled && res.ok) {
          const json = await res.json();
          setPoster(json?.contact ?? null);
        }
      } catch {
        if (!cancelled) setPoster(null);
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveData?.pet_id, effectiveData?.adoption_pets]);

  const beginEdit = () => {
    if (!effectiveData) return;
    if (!canEditStatus) {
      showToast("info", "This application can no longer be edited.");
      return;
    }
    setForm(toFormState(effectiveData));
    setEditing(true);
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSaving(false);
    setActionError(null);
  };

  const updateForm = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!effectiveData || !form) return;
    setSaving(true);
    setActionError(null);
    try {
      const payload = {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        applicant_name:
          [form.firstName, form.lastName].filter(Boolean).join(" ") || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        birth_date: form.birthDate || null,
        occupation: form.occupation || null,
        social_profile: form.socialProfile || null,
        civil_status: form.civilStatus || null,
        pronouns: form.pronouns || null,
        adopted_before:
          typeof form.adoptedBefore === "boolean" ? form.adoptedBefore : null,
        id_document_type: form.idDocumentType || null,
        id_document_path: form.idDocumentPath ?? null,
        home_type: form.homeType || null,
        rents: typeof form.rents === "boolean" ? form.rents : null,
        move_plan: form.movePlan || null,
        live_with: form.liveWith,
        allergies: typeof form.allergies === "boolean" ? form.allergies : null,
        family_supports:
          typeof form.familySupports === "boolean" ? form.familySupports : null,
        daily_care_by: form.dailyCareBy || null,
        financial_responsible: form.financialResponsible || null,
        vacation_caregiver: form.vacationCaregiver || null,
        hours_alone: form.hoursAlone || null,
        intro_steps: form.introSteps || null,
        has_pets_now:
          typeof form.hasPetsNow === "boolean" ? form.hasPetsNow : null,
        had_pets_past:
          typeof form.hadPetsPast === "boolean" ? form.hadPetsPast : null,
      };

      const { error: updateError } = await supabase
        .from("adoption_applications")
        .update(payload)
        .eq("id", effectiveData.id);
      if (updateError) throw new Error(updateError.message);

      const refreshed = await fetchAdoptionApplicationById(effectiveData.id);
      if (refreshed) setLocalData(refreshed);
      showToast("success", "Application updated");
      cancelEdit();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update application.";
      setActionError(message);
      showToast("error", "Could not update the application");
    } finally {
      setSaving(false);
    }
  };

  const buildPdfBlob = async () => {
    if (!effectiveData) {
      throw new Error("Missing application data.");
    }

    // Prefer server-side PDF generation, fallback to client-side fill
    try {
      const apiUrl = `/api/forms/adoption/${effectiveData.id}?flatten=1`;
      const resp = await fetch(apiUrl, {
        headers: { Accept: "application/pdf" },
      });
      const ct =
        resp.headers.get("content-type") ||
        resp.headers.get("Content-Type") ||
        "";
      if (resp.ok && ct.includes("application/pdf")) {
        const buf = await resp.arrayBuffer();
        return new Blob([buf], { type: "application/pdf" });
      }
    } catch {
      // ignore and fallback
    }

    // Fallback: generate on the client using pdf-lib and the public template
    const res = await fetch(ADOPTION_FORM_TEMPLATE_PATH);
    if (!res.ok) {
      throw new Error(`Template not found at ${ADOPTION_FORM_TEMPLATE_PATH}.`);
    }
    const templateBytes = await res.arrayBuffer();
    // Load up to 6 photos for embedding (if available)
    let photos: { data: ArrayBuffer; mimeType?: string }[] = [];
    let petPhoto: { data: ArrayBuffer; mimeType?: string } | undefined;
    try {
      if (Array.isArray(imageUrls) && imageUrls.length) {
        const limited = imageUrls.filter(Boolean).slice(0, 3);
        const blobs = await Promise.all(
          limited.map(async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error("Photo fetch failed");
            const b = await r.blob();
            return {
              data: await b.arrayBuffer(),
              mimeType: b.type || undefined,
            };
          })
        );
        photos = blobs;
      }
      if (petProfile?.photo) {
        const pr = await fetch(petProfile.photo);
        if (pr.ok) {
          const pb = await pr.blob();
          petPhoto = {
            data: await pb.arrayBuffer(),
            mimeType: pb.type || undefined,
          };
        }
      }
      // No further fallback; leave Pet_Photo field blank if we have no image
    } catch {
      // ignore image failures and continue with text-only
    }

    const bytes = await fillAdoptionApplicationPdf(
      templateBytes,
      effectiveData,
      { flatten: true, photos, petPhoto }
    );
    const buffer =
      bytes.buffer instanceof ArrayBuffer
        ? bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
          ? bytes.buffer
          : bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength
            )
        : (bytes.slice().buffer as ArrayBuffer);
    return new Blob([buffer], { type: "application/pdf" });
  };

  const handlePrint = async () => {
    if (!effectiveData) return;
    try {
      setPrinting(true);
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "1px"; // non-zero helps some engines
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.border = "0";

      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        try {
          iframe.remove();
        } catch {}
        window.removeEventListener("afterprint", cleanup);
        document.removeEventListener("visibilitychange", onVis);
      };

      const onVis = () => {
        if (document.visibilityState === "visible") {
          setTimeout(cleanup, 300);
        }
      };

      iframe.onload = () => {
        const iw = iframe.contentWindow;
        iw?.addEventListener?.("afterprint", cleanup);
        window.addEventListener("afterprint", cleanup);
        document.addEventListener("visibilitychange", onVis);
        setTimeout(() => {
          try {
            iw?.focus?.();
            iw?.print?.();
          } catch {
            const w = window.open(url, "_blank", "noopener,noreferrer");
            if (!w) cleanup();
          }
        }, 250);
      };

      document.body.appendChild(iframe);
      iframe.src = url;
    } catch (e) {
      console.error(e);
      showToast("error", "Could not generate PDF");
    } finally {
      setPrinting(false);
    }
  };

  const handleDownload = async () => {
    if (!effectiveData) return;
    try {
      setDownloading(true);
      const blob = await buildPdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PawSagip-Application-${effectiveData.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      showToast("error", "Could not download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;
  const modal = (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/70"
        aria-hidden="true"
        onClick={() => (editingReady ? undefined : onClose())}
      />
      <div className="relative z-[71] mx-auto my-6 max-w-4xl px-4">
        <div className="surface rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div
            className="border-b px-5 pb-2 pt-5 flex-none"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
              <div className="flex flex-wrap items-center gap-2 min-h-[44px]">
                {!editing ? (
                  <>
                    <button
                      type="button"
                      className="pill px-3 py-1.5 flex items-center gap-2 text-sm font-medium text-white bg-[#333639] hover:bg-[#26282A] border border-transparent transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={handleDownload}
                      disabled={
                        effectiveLoading ||
                        !effectiveData ||
                        downloading ||
                        printing
                      }
                    >
                      <Download className="h-4 w-4" />
                      {downloading ? "Preparing..." : "Download"}
                    </button>
                    <button
                      type="button"
                      className="pill px-3 py-1.5 flex items-center gap-2 text-sm font-medium text-white bg-[#333639] hover:bg-[#26282A] border border-transparent transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={handlePrint}
                      disabled={
                        effectiveLoading ||
                        !effectiveData ||
                        printing ||
                        downloading
                      }
                    >
                      <Printer className="h-4 w-4" />
                      {printing ? "Preparing..." : "Print"}
                    </button>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      className="pill px-3 py-1.5"
                      style={{ border: "1px solid var(--border-color)" }}
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary px-4 py-1.5 flex items-center gap-2 transition-colors duration-200"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <SaveIcon className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-1.5 flex items-center gap-2 transition-colors duration-200"
                    onClick={beginEdit}
                    disabled={!canEditStatus || effectiveLoading}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close"
                  className="h-9 w-9 rounded-full flex items-center justify-center text-sm text-white bg-[var(--primary-red)] hover:brightness-90 transition-colors duration-200"
                  onClick={onClose}
                >
                  <CircleX className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {effectiveLoading ? (
              <div className="ink-muted text-sm">Loading application...</div>
            ) : effectiveError ? (
              <div className="text-sm text-red-500">{effectiveError}</div>
            ) : !effectiveData ? (
              <div className="ink-muted text-sm">Application not found.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {actionError ? (
                  <div className="text-sm text-red-500">{actionError}</div>
                ) : null}

                {petProfile ? (
                  <div
                    className="rounded-2xl border px-5 py-4"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--card-bg)",
                    }}
                  >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[250px_minmax(0,1fr)] md:items-start">
                      <div className="relative overflow-hidden rounded-[18px] bg-[var(--soft-bg)] min-h-[200px] md:min-h-[250px]">
                        {petProfile.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={petProfile.photo}
                            alt={petProfile.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-6xl font-semibold"
                            style={petFallbackTheme(petProfile.species)}
                          >
                            <span aria-hidden="true">
                              {petEmojiFor(petProfile.species)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="text-xl font-semibold ink-heading md:text-2xl">
                            {petProfile.name}
                          </div>
                          <div className="text-lg ink-subtle md:text-xl">
                            {petProfile.location || "--"}
                          </div>
                        </div>

                        <div
                          className="h-px w-full"
                          style={{ background: "var(--border-color)" }}
                        />
                        <div className="grid gap-3 text-lg sm:grid-cols-2 md:text-xl">
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Pet type
                            </p>
                            <p className="ink-heading">
                              {petProfile.species || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Breed
                            </p>
                            <p className="ink-heading">
                              {petProfile.breed || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Sex
                            </p>
                            <p className="ink-heading">
                              {petProfile.sex || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Age / Size
                            </p>
                            <p className="ink-heading">
                              {petProfile.age || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Submitted
                            </p>
                            <p className="ink-heading text-md">
                              {formatDateTime(effectiveData?.created_at)}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Application status
                            </p>
                            <p className="ink-heading">
                              {effectiveData?.status || "--"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {poster ? (
                  <div
                    className="rounded-2xl p-4"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    <div className="font-semibold ink-heading mb-1">
                      Contact Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="ink-subtle text-xs uppercase tracking-wide">
                          Name
                        </div>
                        <div className="ink-heading">{poster.name?.trim() || "—"}</div>
                      </div>
                      <div>
                        <div className="ink-subtle text-xs uppercase tracking-wide">
                          Email
                        </div>
                        <div className="ink-heading break-all">{poster.email?.trim() || "—"}</div>
                      </div>
                      <div>
                        <div className="ink-subtle text-xs uppercase tracking-wide">
                          Phone
                        </div>
                        <div className="ink-heading">{poster.phone?.trim() || "—"}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="ink-subtle text-xs">
                    Submitted {formatDateTime(effectiveData.created_at)}
                  </p>
                </div>

                <div className="columns-2">
                  <div className="grid grid-cols-2 gap-4"></div>
                </div>

                <section>
                  <h3 className="font-semibold ink-heading mb-2">Applicant</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldRow
                      editable={editingReady}
                      label="First name"
                      value={effectiveData.first_name || "-"}
                      edit={
                        editingReady ? (
                          <input
                            ref={firstInputRef}
                            className="w-full bg-transparent outline-none"
                            value={form?.firstName ?? ""}
                            onChange={(event) =>
                              updateForm("firstName", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Last name"
                      value={effectiveData.last_name || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.lastName ?? ""}
                            onChange={(event) =>
                              updateForm("lastName", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Email"
                      value={effectiveData.email || "-"}
                      edit={
                        editingReady ? (
                          <input
                            type="email"
                            className="w-full bg-transparent outline-none"
                            value={form?.email ?? ""}
                            onChange={(event) =>
                              updateForm("email", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Phone"
                      value={effectiveData.phone || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.phone ?? ""}
                            onChange={(event) =>
                              updateForm("phone", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Address"
                      value={effectiveData.address || "-"}
                      stacked
                      edit={
                        editingReady ? (
                          <textarea
                            rows={2}
                            className="w-full bg-transparent outline-none resize-none"
                            value={form?.address ?? ""}
                            onChange={(event) =>
                              updateForm("address", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Birth date"
                      value={toDateInput(effectiveData.birth_date) || "-"}
                      edit={
                        editingReady ? (
                          <input
                            type="date"
                            className="w-full bg-transparent outline-none"
                            value={form?.birthDate ?? ""}
                            onChange={(event) =>
                              updateForm("birthDate", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Occupation"
                      value={effectiveData.occupation || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.occupation ?? ""}
                            onChange={(event) =>
                              updateForm("occupation", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />

                    <FieldRow
                      editable={editingReady}
                      label="Social profile"
                      value={effectiveData.social_profile || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.socialProfile ?? ""}
                            onChange={(event) =>
                              updateForm("socialProfile", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Civil status"
                      value={effectiveData.civil_status || "-"}
                      edit={
                        editingReady ? (
                          <div className="flex flex-wrap gap-3 text-sm">
                            {CIVIL_STATUS_OPTIONS.map((option) => (
                              <label
                                key={option}
                                className="inline-flex items-center gap-1"
                              >
                                <input
                                  type="radio"
                                  name="civil-status"
                                  checked={form?.civilStatus === option}
                                  onChange={() =>
                                    updateForm("civilStatus", option)
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Pronouns"
                      value={effectiveData.pronouns || "-"}
                      edit={
                        editingReady ? (
                          <div className="flex flex-wrap gap-3 text-sm">
                            {PRONOUN_OPTIONS.map((option) => (
                              <label
                                key={option}
                                className="inline-flex items-center gap-1"
                              >
                                <input
                                  type="radio"
                                  name="pronouns"
                                  checked={form?.pronouns === option}
                                  onChange={() =>
                                    updateForm("pronouns", option)
                                  }
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Adopted from PawSagip before?"
                      value={boolLabel(effectiveData.adopted_before)}
                      edit={
                        editingReady ? (
                          <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="adopted-before"
                                checked={form?.adoptedBefore === true}
                                onChange={() =>
                                  updateForm("adoptedBefore", true)
                                }
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="adopted-before"
                                checked={form?.adoptedBefore === false}
                                onChange={() =>
                                  updateForm("adoptedBefore", false)
                                }
                              />
                              No
                            </label>
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Document Type"
                      value={effectiveData.id_document_type || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.idDocumentType ?? ""}
                            onChange={(e) =>
                              updateForm("idDocumentType", e.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <div className="md:col-span-2">
                      <div className="ink-subtle text-xs">
                        Verification Document
                      </div>
                      <div
                        className="mt-1 rounded-xl border px-3 py-2 flex items-center justify-between gap-3"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <span className="text-sm ink-heading">
                          {idDocumentUrl
                            ? "Document uploaded"
                            : "No document provided"}
                        </span>
                        {idDocumentUrl ? (
                          <button
                            type="button"
                            className="pill px-3 py-1 text-sm"
                            style={{ border: "1px solid var(--border-color)" }}
                            onClick={(e) => {
                              e.preventDefault();
                              setViewer({ urls: [idDocumentUrl], index: 0 });
                            }}
                          >
                            View document
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-6">
                  <h3 className="font-semibold ink-heading mb-2">
                    Questionnaire
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldRow
                      editable={editingReady}
                      label="Home type"
                      value={effectiveData.home_type || "-"}
                      edit={
                        editingReady ? (
                          <select
                            className="w-full bg-transparent outline-none"
                            value={form?.homeType ?? ""}
                            onChange={(event) =>
                              updateForm(
                                "homeType",
                                event.target.value as EditFormState["homeType"]
                              )
                            }
                          >
                            <option value="">Select...</option>
                            <option value="house">House</option>
                            <option value="apartment">Apartment</option>
                            <option value="condo">Condo</option>
                            <option value="other">Other</option>
                          </select>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Do you rent?"
                      value={boolLabel(effectiveData.rents)}
                      edit={
                        editingReady ? (
                          <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="rents"
                                checked={form?.rents === true}
                                onChange={() => updateForm("rents", true)}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="rents"
                                checked={form?.rents === false}
                                onChange={() => updateForm("rents", false)}
                              />
                              No
                            </label>
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Live with"
                      value={liveWithLabel(effectiveData.live_with)}
                      stacked
                      edit={
                        editingReady ? (
                          <div className="flex flex-wrap gap-3 text-sm">
                            {LIVE_WITH_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className="inline-flex items-center gap-1"
                              >
                                <input
                                  type="checkbox"
                                  checked={form?.liveWith.includes(
                                    option.value
                                  )}
                                  onChange={(event) => {
                                    const checked = event.target.checked;
                                    updateForm(
                                      "liveWith",
                                      checked
                                        ? [
                                            ...(form?.liveWith ?? []),
                                            option.value,
                                          ]
                                        : (form?.liveWith ?? []).filter(
                                            (item) => item !== option.value
                                          )
                                    );
                                  }}
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Allergies to animals"
                      value={boolLabel(effectiveData.allergies)}
                      edit={
                        editingReady ? (
                          <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="allergies"
                                checked={form?.allergies === true}
                                onChange={() => updateForm("allergies", true)}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="allergies"
                                checked={form?.allergies === false}
                                onChange={() => updateForm("allergies", false)}
                              />
                              No
                            </label>
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Family supports decision"
                      value={boolLabel(effectiveData.family_supports)}
                      edit={
                        editingReady ? (
                          <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="family-supports"
                                checked={form?.familySupports === true}
                                onChange={() =>
                                  updateForm("familySupports", true)
                                }
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="family-supports"
                                checked={form?.familySupports === false}
                                onChange={() =>
                                  updateForm("familySupports", false)
                                }
                              />
                              No
                            </label>
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Daily care by"
                      value={effectiveData.daily_care_by || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.dailyCareBy ?? ""}
                            onChange={(event) =>
                              updateForm("dailyCareBy", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Financially responsible"
                      value={effectiveData.financial_responsible || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.financialResponsible ?? ""}
                            onChange={(event) =>
                              updateForm(
                                "financialResponsible",
                                event.target.value
                              )
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Vacation caregiver"
                      value={effectiveData.vacation_caregiver || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.vacationCaregiver ?? ""}
                            onChange={(event) =>
                              updateForm(
                                "vacationCaregiver",
                                event.target.value
                              )
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Hours pet left alone"
                      value={effectiveData.hours_alone || "-"}
                      edit={
                        editingReady ? (
                          <input
                            className="w-full bg-transparent outline-none"
                            value={form?.hoursAlone ?? ""}
                            onChange={(event) =>
                              updateForm("hoursAlone", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Move plan"
                      value={effectiveData.move_plan || "-"}
                      stacked
                      edit={
                        editingReady ? (
                          <textarea
                            rows={2}
                            className="w-full bg-transparent outline-none resize-none"
                            value={form?.movePlan ?? ""}
                            onChange={(event) =>
                              updateForm("movePlan", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Intro steps"
                      value={effectiveData.intro_steps || "-"}
                      stacked
                      edit={
                        editingReady ? (
                          <textarea
                            rows={2}
                            className="w-full bg-transparent outline-none resize-none"
                            value={form?.introSteps ?? ""}
                            onChange={(event) =>
                              updateForm("introSteps", event.target.value)
                            }
                          />
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Has pets now?"
                      value={boolLabel(effectiveData.has_pets_now)}
                      edit={
                        editingReady ? (
                          <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="has-pets"
                                checked={form?.hasPetsNow === true}
                                onChange={() => updateForm("hasPetsNow", true)}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="has-pets"
                                checked={form?.hasPetsNow === false}
                                onChange={() => updateForm("hasPetsNow", false)}
                              />
                              No
                            </label>
                          </div>
                        ) : undefined
                      }
                    />
                    <FieldRow
                      editable={editingReady}
                      label="Had pets in the past?"
                      value={boolLabel(effectiveData.had_pets_past)}
                      edit={
                        editingReady ? (
                          <div className="flex gap-4 text-sm">
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="had-pets"
                                checked={form?.hadPetsPast === true}
                                onChange={() => updateForm("hadPetsPast", true)}
                              />
                              Yes
                            </label>
                            <label className="inline-flex items-center gap-1">
                              <input
                                type="radio"
                                name="had-pets"
                                checked={form?.hadPetsPast === false}
                                onChange={() =>
                                  updateForm("hadPetsPast", false)
                                }
                              />
                              No
                            </label>
                          </div>
                        ) : undefined
                      }
                    />
                  </div>
                </section>

                {imageUrls.length > 0 ? (
                  <section className="mt-6">
                    <h3 className="font-semibold ink-heading mb-2">
                      Home photos
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {imageUrls.map((url, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="Home"
                          className="h-32 w-full object-cover rounded-xl cursor-pointer"
                          onClick={() => setViewer({ urls: imageUrls, index })}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewer ? (
        <div className="fixed inset-0 z-[80]" onClick={() => setViewer(null)}>
          <div className="absolute inset-0 bg-black/90" />
          <button
            type="button"
            aria-label="Close viewer"
            className="absolute left-4 top-4 h-9 w-9 rounded-full text-white bg-[var(--primary-red)] hover:brightness-90 transition-colors duration-200 flex items-center justify-center"
            onClick={(event) => {
              event.stopPropagation();
              setViewer(null);
            }}
          >
            <CircleX className="h-6 w-6" />
          </button>
          {viewer.urls.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 pill px-3 py-1 text-white border border-white/40"
                onClick={(event) => {
                  event.stopPropagation();
                  setViewer((prev) =>
                    prev
                      ? {
                          ...prev,
                          index:
                            (prev.index - 1 + prev.urls.length) %
                            prev.urls.length,
                        }
                      : prev
                  );
                }}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 pill px-3 py-1 text-white border border-white/40"
                onClick={(event) => {
                  event.stopPropagation();
                  setViewer((prev) =>
                    prev
                      ? { ...prev, index: (prev.index + 1) % prev.urls.length }
                      : prev
                  );
                }}
              >
                <ChevronRight />
              </button>
            </>
          ) : null}
          <div className="relative z-[81] grid place-items-center w-full h-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.urls[Math.min(viewer.index, viewer.urls.length - 1)]}
              alt="Home preview"
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(modal, document.body);
}

function petEmojiFor(species?: string | null) {
  const value = (species || "").toLowerCase();
  if (value.includes("dog") || value.includes("canine")) return "🐶";
  if (value.includes("cat") || value.includes("feline")) return "🐱";
  return "🐾";
}

function petFallbackTheme(species?: string | null) {
  const value = (species || "").toLowerCase();
  if (value.includes("dog") || value.includes("canine")) {
    return {
      background:
        "radial-gradient(circle at 50% 50%, #F8ECD9 0%, #EED9C2 45%, #DDBC9F 100%)",
      color: "#8C4F22",
    } as const;
  }
  if (value.includes("cat") || value.includes("feline")) {
    return {
      background:
        "radial-gradient(circle at 50% 50%, #FFF3C4 0%, #FFE08A 45%, #FFB74A 100%)",
      color: "#8C6B00",
    } as const;
  }
  return {
    background: "radial-gradient(circle at 50% 50%, #F3F4F6 0%, #E5E7EB 100%)",
    color: "#4A55C2",
  } as const;
}
