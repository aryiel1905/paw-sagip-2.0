"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { fetchReportById } from "@/data/supabaseApi";
import { ChevronLeft, ChevronRight, CircleX } from "lucide-react";
import MapPickerModal from "@/components/MapPickerModal";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import type { PetStatus } from "@/types/app";

export type ReportViewData = {
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

type EditFormState = {
  type: string;
  condition: string;
  gender: string;
  ageSize: string;
  petName: string;
  species: string;
  breed: string;
  features: string;
  description: string;
  when: string;
  status: string | null;
  petStatus: PetStatus;
  location: string;
  isAggressive: boolean;
  isFriendly: boolean;
  isAnonymous: boolean;
  reporterName: string;
  reporterContact: string;
  latitude: number | null;
  longitude: number | null;
};

const REPORT_TYPES = ["found", "lost", "cruelty", "adoption"] as const;
const CONDITION_OPTIONS = [
  "Healthy",
  "Injured",
  "Aggressive",
  "Malnourished",
  "Other",
] as const;
const SPECIES_SUGGESTIONS = [
  "Dog",
  "Cat",
  "Bird",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Fish",
  "Turtle",
  "Snake",
  "Lizard",
  "Other",
] as const;
const GENDER_OPTIONS = ["Unknown", "Male", "Female"] as const;
function normalizeSpecies(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
function getAgeOptions(species: string | undefined | null) {
  const s = normalizeSpecies(species);
  if (s === "dog") return ["Puppy", "Adult", "Senior"] as const;
  if (s === "cat") return ["Kitten", "Adult", "Senior"] as const;
  return ["Puppy", "Kitten", "Adult", "Senior"] as const;
}

function getDefaultAge(species?: string | null) {
  const s = normalizeSpecies(species);
  if (s === "dog") return "Puppy";
  if (s === "cat") return "Kitten";
  return "Adult";
}

function toLocalInput(value?: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function petEmojiFor(species?: string | null) {
  const s = normalizeSpecies(species);
  if (s.includes("dog")) return "🐶";
  if (s.includes("cat")) return "🐱";
  return "🐾";
}

function petFallbackBackground(species?: string | null): string {
  const s = normalizeSpecies(species);
  if (s.includes("dog")) {
    return "radial-gradient(circle at 50% 50%, #F8ECD9 0%, #EED9C2 45%, #DDBC9F 100%)";
  }
  if (s.includes("cat")) {
    return "radial-gradient(circle at 50% 50%, #FFF3C4 0%, #FFE08A 45%, #FFB74A 100%)";
  }
  return "radial-gradient(circle at 50% 50%, #F3F4F6 0%, #E5E7EB 100%)";
}

function toFormState(data: ReportViewData): EditFormState {
  const speciesValue = data.species ?? "";
  const speciesKey = normalizeSpecies(speciesValue);
  const incomingAge = (data.age_size || "").trim();
  let mappedAge = incomingAge;
  if (incomingAge === "Puppy/Kitten") {
    mappedAge = speciesKey === "cat" ? "Kitten" : "Puppy";
  }
  return {
    type: data.type?.toLowerCase?.() || "found",
    condition: data.condition || "Healthy",
    gender: data.gender || "Unknown",
    ageSize: mappedAge || getDefaultAge(speciesValue),
    petName: data.pet_name || "",
    species: speciesValue,
    breed: data.breed || "",
    features: data.features || "",
    description: data.description || "",
    when: toLocalInput(data.event_at || data.created_at),
    status: data.status ?? null,
    petStatus: (data.pet_status as PetStatus) ?? "roaming",
    location: data.location || "",
    isAggressive: !!data.is_aggressive,
    isFriendly: !!data.is_friendly,
    isAnonymous: !!data.is_anonymous,
    reporterName: data.reporter_name || "",
    reporterContact: data.reporter_contact || "",
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
}

export default function ReportViewModal({
  open,
  data,
  reportId,
  loading,
  error,
  onClose,
}: {
  open: boolean;
  data?: ReportViewData | null;
  reportId?: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}) {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localData, setLocalData] = useState<ReportViewData | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setEditing(false);
    setForm(null);
    setSaving(false);
    setActionError(null);
    setMapPickerOpen(false);
  }, [open]);

  // When given an id (like DetailsModal pattern), fetch inside the modal
  useEffect(() => {
    if (!open) return;
    if (!reportId) {
      setLocalLoading(false);
      setLocalError(null);
      setLocalData(null);
      return;
    }
    let cancelled = false;
    setLocalLoading(true);
    setLocalError(null);
    setLocalData(null);
    fetchReportById(reportId)
      .then((rep) => {
        if (cancelled) return;
        if (!rep) setLocalError("Could not load report details.");
        else setLocalData(rep as ReportViewData);
      })
      .catch(() => {
        if (!cancelled) setLocalError("Could not load report details.");
      })
      .finally(() => {
        if (!cancelled) setLocalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, reportId]);

  const effectiveLoading = loading ?? localLoading;
  const effectiveError = error ?? localError ?? null;
  const effectiveData = useMemo(
    () => data ?? localData ?? null,
    [data, localData]
  );

  // Fullscreen image viewer (parity with DetailsModal)
  const [viewer, setViewer] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  const editingReady = editing && form !== null;
  const firstEditRef = useRef<HTMLInputElement | null>(null);

  const beginEdit = () => {
    if (!effectiveData) return;
    setForm(toFormState(effectiveData));
    setEditing(true);
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setSaving(false);
    setActionError(null);
    setMapPickerOpen(false);
  };

  const handleMapSelect = (lat: number, lng: number, address?: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        latitude: lat,
        longitude: lng,
        location: address?.trim?.() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
    });
    setMapPickerOpen(false);
  };

  useEffect(() => {
    if (editing && firstEditRef.current) {
      try {
        firstEditRef.current.focus();
        firstEditRef.current.select?.();
      } catch {}
    }
  }, [editing]);

  const handleSave = async () => {
    if (!effectiveData || !form) return;
    setSaving(true);
    setActionError(null);
    try {
      const supabase = getSupabaseClient();
      const eventAt = form.when ? new Date(form.when).toISOString() : null;
      const payload = {
        report_type: form.type,
        condition: form.condition || null,
        location: form.location || null,
        latitude: form.latitude,
        longitude: form.longitude,
        event_at: eventAt,
        pet_name: form.petName?.trim() ? form.petName.trim() : null,
        species: form.species || null,
        breed: form.breed?.trim() ? form.breed.trim() : null,
        gender: form.gender || null,
        age_size: form.ageSize || null,
        features: form.features?.trim() ? form.features.trim() : null,
        description: form.description?.trim() ? form.description.trim() : null,
        pet_status: form.petStatus,
        is_aggressive: form.isAggressive,
        is_friendly: form.isFriendly,
        is_anonymous: form.isAnonymous,
        reporter_name:
          form.isAnonymous || !form.reporterName?.trim()
            ? null
            : form.reporterName.trim(),
        reporter_contact:
          form.isAnonymous || !form.reporterContact?.trim()
            ? null
            : form.reporterContact.trim(),
      };

      const { error: updateError } = await supabase
        .from("reports")
        .update(payload)
        .eq("id", effectiveData.id);
      if (updateError) {
        throw new Error(updateError.message);
      }
      const refreshed = await fetchReportById(effectiveData.id);
      if (refreshed) {
        setLocalData(refreshed);
      }
      showToast("success", "Report updated");
      cancelEdit();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update report.";
      setActionError(message);
      showToast("error", "Could not update the report");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = <K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  useEffect(() => {
    if (!open) return;
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const body = document.body as HTMLBodyElement;
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewer) {
          e.preventDefault();
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

  const displayLandmarks = (effectiveData?.landmarkUrls ?? []) as string[];
  const [lmIndex, setLmIndex] = useState(0);
  useEffect(() => {
    setLmIndex(0);
  }, [effectiveData?.id]);
  const lmCount = displayLandmarks.length;
  const currentLm = useMemo(
    () => (lmCount ? displayLandmarks[Math.min(lmIndex, lmCount - 1)] : null),
    [displayLandmarks, lmIndex, lmCount]
  );

  // Image error fallbacks
  const [mainBroken, setMainBroken] = useState(false);
  const [lmBrokenBySrc, setLmBrokenBySrc] = useState<Record<string, boolean>>(
    {}
  );

  // removed early return; modal is conditionally portaled below to keep hook order stable

  const latForMap =
    editingReady && form ? form.latitude : effectiveData?.latitude ?? null;
  const lngForMap =
    editingReady && form ? form.longitude : effectiveData?.longitude ?? null;
  const mapLink =
    typeof latForMap === "number" && typeof lngForMap === "number"
      ? `https://www.google.com/maps?q=${latForMap},${lngForMap}`
      : null;

  function formatWhen(): string {
    const raw = effectiveData?.event_at || effectiveData?.created_at;
    if (!raw) return "-";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "-";

    const now = new Date();
    let diffMs = now.getTime() - date.getTime();
    const future = diffMs < 0;
    diffMs = Math.abs(diffMs);

    const seconds = Math.round(diffMs / 1000);
    if (seconds < 45) {
      return future ? "in a few seconds" : "a few seconds ago";
    }

    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const value = Math.max(1, minutes);
      return rtf.format(future ? value : -value, "minute");
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const value = Math.max(1, hours);
      return rtf.format(future ? value : -value, "hour");
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      const value = Math.max(1, days);
      return rtf.format(future ? value : -value, "day");
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      const value = Math.max(1, weeks);
      return rtf.format(future ? value : -value, "week");
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      const value = Math.max(1, months);
      return rtf.format(future ? value : -value, "month");
    }

    const years = Math.floor(days / 365);
    const value = Math.max(1, years);
    return rtf.format(future ? value : -value, "year");
  }

  function formatSubmitted(): string {
    const raw = effectiveData?.created_at;
    if (!raw) return "-";
    try {
      return new Date(raw).toLocaleString();
    } catch {
      return raw;
    }
  }

  const DetailField = useMemo(
    () =>
      memo(function DetailField({
        label,
        value,
        editNode,
        editable,
        className = "",
      }: {
        label: string;
        value: ReactNode;
        editNode?: ReactNode;
        editable?: boolean;
        className?: string;
      }) {
        const highlightClass = editable
          ? "border-neutral-700 bg-white"
          : "border-[var(--border-color)] bg-[var(--card-bg)]";
        return (
          <div className={`flex flex-col gap-1 text-sm min-w-0 ${className}`}>
            <div className="ink-subtle flex items-center h-6">{label}</div>
            <div
              className={`rounded-lg border px-3 py-2 font-medium text-sm ink-heading break-words w-full min-w-0 transition-colors duration-150 ${highlightClass}`}
              onMouseDown={editable ? (e) => e.stopPropagation() : undefined}
            >
              {editable && editNode ? editNode : value ?? "-"}
            </div>
          </div>
        );
      }),
    []
  );

  const boolLabel = (value?: boolean | null) =>
    typeof value === "boolean" ? (value ? "Yes" : "No") : "-";

  const detailRows = useMemo(
    () => [
      {
        id: "type-gender",
        left: {
          label: "Type",
          value: effectiveData?.type || "-",
          editNode: (
            <select
              className="w-full bg-transparent outline-none"
              value={form?.type ?? "found"}
              onChange={(e) => updateForm("type", e.currentTarget.value)}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          ),
        },
        right: {
          label: "Gender",
          value: effectiveData?.gender || "-",
          editNode: (
            <select
              className="w-full bg-transparent outline-none"
              value={form?.gender ?? "Unknown"}
              onChange={(e) => updateForm("gender", e.currentTarget.value)}
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          ),
        },
      },
      {
        id: "petname-agesize",
        left: {
          label: "Pet Name",
          value: effectiveData?.pet_name || "-",
          editNode: (
            <input
              ref={firstEditRef}
              className="w-full bg-transparent outline-none"
              value={form?.petName ?? ""}
              onChange={(e) => updateForm("petName", e.currentTarget.value)}
              placeholder="e.g., Buddy"
            />
          ),
        },
        right: {
          label: "Age/Size",
          value: effectiveData?.age_size || "-",
          editNode: (
            <select
              className="w-full bg-transparent outline-none"
              value={
                form?.ageSize ?? getDefaultAge(form?.species)
              }
              onChange={(e) => updateForm("ageSize", e.currentTarget.value)}
            >
              {getAgeOptions(form?.species).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ),
        },
      },
      {
        id: "condition-status",
        left: {
          label: "Condition",
          value: effectiveData?.condition || "-",
          editNode: (
            <select
              className="w-full bg-transparent outline-none"
              value={form?.condition ?? "Healthy"}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        condition: val,
                        isAggressive: val === "Aggressive",
                        isFriendly: val === "Healthy",
                      }
                    : prev
                );
              }}
            >
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ),
        },
        right: {
          label: "Status",
          value: effectiveData?.status || "-",
        },
      },
      {
        id: "petstatus-aggressive",
        left: {
          label: "Pet Status",
          value: (() => {
            const v = effectiveData?.pet_status;
            if (!v) return "-";
            return v === "in_custody" ? "In Custody" : "Roaming";
          })(),
          editNode: (
            <select
              className="w-full bg-transparent outline-none"
              value={form?.petStatus ?? "roaming"}
              onChange={(e) =>
                updateForm("petStatus", e.currentTarget.value as PetStatus)
              }
            >
              <option value="roaming">Roaming</option>
              <option value="in_custody">In Custody</option>
            </select>
          ),
        },
        right: {
          label: "Aggressive",
          value: boolLabel(effectiveData?.is_aggressive),
          editNode: (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!form?.isAggressive}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          isAggressive: checked,
                          isFriendly: checked ? false : prev.isFriendly,
                          condition: checked
                            ? "Aggressive"
                            : prev.condition === "Aggressive"
                            ? "Healthy"
                            : prev.condition,
                        }
                      : prev
                  );
                }}
                style={
                  form?.isAggressive
                    ? ({
                        accentColor: "var(--primary-orange)",
                      } as CSSProperties)
                    : undefined
                }
              />
              <span>{form?.isAggressive ? "Marked aggressive" : "No"}</span>
            </label>
          ),
        },
      },
      {
        id: "submitted-friendly",
        left: {
          label: "When",
          value: formatWhen(),
          editNode: (
            <input
              type="datetime-local"
              className="w-full bg-transparent outline-none"
              value={form?.when ?? ""}
              onChange={(e) => updateForm("when", e.currentTarget.value)}
            />
          ),
        },
        right: {
          label: "Friendly",
          value: boolLabel(effectiveData?.is_friendly),
          editNode: (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!form?.isFriendly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          isFriendly: checked,
                          isAggressive: checked ? false : prev.isAggressive,
                          condition: checked ? "Healthy" : prev.condition,
                        }
                      : prev
                  );
                }}
                style={
                  form?.isFriendly
                    ? ({
                        accentColor: "var(--primary-mintgreen)",
                      } as CSSProperties)
                    : undefined
                }
              />
              <span>{form?.isFriendly ? "Marked friendly" : "No"}</span>
            </label>
          ),
        },
      },
      {
        id: "location-anonymous",
        left: {
          label: "Location",
          value: effectiveData?.location || "-",
          editNode: (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent outline-none"
                  value={form?.location ?? ""}
                  onChange={(e) =>
                    updateForm("location", e.currentTarget.value)
                  }
                  placeholder="Set via pin or type address"
                />
                <button
                  type="button"
                  className="pill px-3 py-1 text-sm"
                  style={{ border: "1px solid var(--border-color)" }}
                  onClick={() => setMapPickerOpen(true)}
                >
                  Pin
                </button>
              </div>
              <div className="text-xs ink-subtle">
                {typeof form?.latitude === "number" &&
                typeof form?.longitude === "number"
                  ? `Lat ${form.latitude.toFixed(
                      4
                    )}, Lng ${form.longitude.toFixed(4)}`
                  : "No coordinates selected"}
              </div>
            </div>
          ),
        },
        right: {
          label: "Anonymous",
          value: boolLabel(effectiveData?.is_anonymous),
          editNode: (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!form?.isAnonymous}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          isAnonymous: checked,
                          reporterName: checked ? "" : prev.reporterName,
                          reporterContact: checked ? "" : prev.reporterContact,
                        }
                      : prev
                  );
                }}
              />
              <span>{form?.isAnonymous ? "Hidden identity" : "Shown"}</span>
            </label>
          ),
        },
      },
      {
        id: "species-breed",
        left: {
          label: "Pet Type",
          value: effectiveData?.species || "-",
          editNode: (
            <div className="w-full">
                <input
                list="species-options-account"
                className="w-full bg-transparent outline-none"
                value={form?.species ?? ""}
                onChange={(e) => {
                  const next = e.currentTarget.value;
                  const nextKey = normalizeSpecies(next);
                  setForm((prev) => {
                    if (!prev) return prev;
                    let nextAge = prev.ageSize;
                    if (nextKey === "dog") {
                      if (
                        prev.ageSize === "Kitten" ||
                        prev.ageSize === "Puppy/Kitten"
                      )
                        nextAge = "Puppy";
                    } else if (nextKey === "cat") {
                      if (
                        prev.ageSize === "Puppy" ||
                        prev.ageSize === "Puppy/Kitten"
                      )
                        nextAge = "Kitten";
                    }
                    const allowed = getAgeOptions(next) as readonly string[];
                    if (!allowed.includes(nextAge)) {
                      nextAge = getDefaultAge(next);
                    }
                    return { ...prev, species: next, ageSize: nextAge };
                  });
                }}
                placeholder="Dog, Cat, Bird, etc."
              />
              <datalist id="species-options-account">
                {SPECIES_SUGGESTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
          ),
        },
        right: {
          label: "Breed",
          value: effectiveData?.breed || "-",
          editNode: (
            <input
              className="w-full bg-transparent outline-none"
              value={form?.breed ?? ""}
              onChange={(e) => updateForm("breed", e.currentTarget.value)}
              placeholder="e.g., Aspin"
            />
          ),
        },
      },
      {
        id: "reporter-contact",
        left: {
          label: "Reporter Name",
          value: effectiveData?.is_anonymous
            ? "-"
            : effectiveData?.reporter_name || "-",
          editNode: (
            <input
              className="w-full bg-transparent outline-none"
              value={form?.reporterName ?? ""}
              onChange={(e) =>
                updateForm("reporterName", e.currentTarget.value)
              }
              disabled={!!form?.isAnonymous}
              placeholder="Your name"
            />
          ),
        },
        right: {
          label: "Contact",
          value: effectiveData?.is_anonymous
            ? "-"
            : effectiveData?.reporter_contact || "-",
          editNode: (
            <input
              className="w-full bg-transparent outline-none"
              value={form?.reporterContact ?? ""}
              onChange={(e) =>
                updateForm("reporterContact", e.currentTarget.value)
              }
              disabled={!!form?.isAnonymous}
              placeholder="Phone or email"
            />
          ),
        },
      },
    ],
    [effectiveData, form]
  );

  const contactDisplay = editingReady
    ? form?.isAnonymous
      ? null
      : form?.reporterContact?.trim() || null
    : effectiveData?.is_anonymous
    ? null
    : effectiveData?.reporter_contact || null;
  // viewer state declared above so effects can reference it safely

  const modal = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[70] grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative w-full h-full max-w-[50vw] max-h-[90vh] rounded-2xl shadow-soft surface overflow-hidden flex flex-col">
            <div
              className="flex items-center justify-between border-b p-5 flex-none"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div>
                <h3 className="text-lg font-semibold ink-heading">
                  {(effectiveData?.pet_name
                    ? `${effectiveData.pet_name} — `
                    : "") + (effectiveData?.type?.toUpperCase() || "")}
                </h3>
                <p className="text-sm ink-muted">
                  {effectiveData?.location || ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      type="button"
                      className="pill px-3 py-1"
                      style={{
                        backgroundColor: "var(--primary-mintgreen)",
                        color: "var(--white)",
                      }}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      Save
                    </button>
                    {saving ? (
                      <span
                        className="text-xs ink-subtle ml-1"
                        aria-live="polite"
                      >
                        Saving...
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="pill px-3 py-1"
                      style={{ border: "1px solid var(--border-color)" }}
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="pill px-3 py-1"
                    style={{
                      backgroundColor: "var(--primary-mintgreen)",
                      color: "var(--white)",
                    }}
                    onClick={beginEdit}
                    disabled={!effectiveData || effectiveLoading}
                  >
                    Edit
                  </button>
                )}
                <button
                  aria-label="Close"
                  className="h-9 w-9 rounded-full text-white bg-[var(--primary-red)] hover:brightness-90 transition-colors duration-200 flex items-center justify-center"
                  onClick={onClose}
                  disabled={saving}
                >
                  <CircleX className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-3">
                  {effectiveLoading ? (
                    <div className="ink-muted text-sm">Loading details…</div>
                  ) : effectiveError ? (
                    <div className="ink-muted text-sm">{effectiveError}</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        className="relative w-full rounded-xl overflow-hidden"
                        style={{ aspectRatio: "4 / 3" }}
                      >
                        {/* main photo */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {effectiveData?.mainUrl && !mainBroken ? (
                          <img
                            src={effectiveData.mainUrl}
                            alt="report"
                            className="absolute inset-0 h-full w-full object-cover cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewer({
                                urls: [effectiveData.mainUrl as string],
                                index: 0,
                              });
                            }}
                            loading="lazy"
                            decoding="async"
                            onError={() => setMainBroken(true)}
                          />
                        ) : (
                          <div
                            className="absolute inset-0 grid place-content-center text-6xl"
                            style={{
                              background: petFallbackBackground(
                                effectiveData?.species
                              ),
                            }}
                          >
                            {petEmojiFor(effectiveData?.species)}
                          </div>
                        )}
                      </div>
                      <div
                        className="relative w-full rounded-xl overflow-hidden"
                        style={{ aspectRatio: "4 / 3" }}
                      >
                        {/* landmark carousel */}
                        {currentLm && !lmBrokenBySrc[currentLm] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={currentLm}
                            alt={`landmark ${Math.min(
                              lmIndex + 1,
                              lmCount
                            )} of ${lmCount}`}
                            className="absolute inset-0 h-full w-full object-cover cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewer({
                                urls: displayLandmarks,
                                index: Math.min(lmIndex, lmCount - 1),
                              });
                            }}
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setLmBrokenBySrc((prev) =>
                                currentLm
                                  ? { ...prev, [currentLm]: true }
                                  : prev
                              )
                            }
                          />
                        ) : (
                          <div
                            className="absolute inset-0 grid place-content-center text-6xl"
                            style={{
                              background:
                                "radial-gradient(circle at 50% 50%, #FFF8D6 0%, #FFE08A 45%, #FFC107 100%)",
                            }}
                          >
                            📍
                          </div>
                        )}
                        {lmCount > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Previous landmark"
                              className="absolute left-2 top-1/2 -translate-y-1/2 pill px-1 py-1 text-xs shadow-soft"
                              style={{
                                background: "var(--white)",
                                border: "1px solid var(--border-color)",
                              }}
                              onClick={() =>
                                setLmIndex((i) => (i - 1 + lmCount) % lmCount)
                              }
                            >
                              <ChevronLeft />
                            </button>
                            <button
                              type="button"
                              aria-label="Next landmark"
                              className="absolute right-2 top-1/2 -translate-y-1/2 pill px-1 py-1 text-xs shadow-soft"
                              style={{
                                background: "var(--white)",
                                border: "1px solid var(--border-color)",
                              }}
                              onClick={() =>
                                setLmIndex((i) => (i + 1) % lmCount)
                              }
                            >
                              <ChevronRight />
                            </button>
                          </>
                        )}
                        {lmCount > 0 && (
                          <div
                            className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs"
                            style={{
                              background: "rgba(0,0,0,0.5)",
                              color: "#fff",
                            }}
                          >
                            {Math.min(lmIndex + 1, lmCount)}/{lmCount}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  {/* Report metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                    <DetailField
                      label="Report ID"
                      value={effectiveData?.custom_id ?? "-"}
                    />
                    <DetailField label="Submitted" value={formatSubmitted()} />
                  </div>
                  {editing && actionError ? (
                    <div
                      className="text-sm"
                      style={{ color: "var(--primary-orange)" }}
                    >
                      {actionError}
                    </div>
                  ) : null}
                  {detailRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0"
                    >
                      {row.left ? (
                        <DetailField
                          label={row.left.label}
                          value={row.left.value}
                          editNode={row.left.editNode}
                          editable={editing}
                          className={row.right ? "" : "md:col-span-2"}
                        />
                      ) : null}
                      {row.right ? (
                        <DetailField
                          label={row.right.label}
                          value={row.right.value}
                          editNode={row.right.editNode}
                          editable={editing}
                          className={row.left ? "" : "md:col-span-2"}
                        />
                      ) : null}
                    </div>
                  ))}

                  <div>
                    <div className="ink-subtle text-sm mb-1">Features</div>
                    <div
                      className={`rounded-lg border px-3 py-2 text-sm ink-heading break-words transition-colors duration-150 ${
                        editingReady
                          ? "border-neutral-700 bg-white"
                          : "border-[var(--border-color)] bg-[var(--card-bg)]"
                      }`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {editingReady ? (
                        <input
                          className="w-full bg-transparent outline-none"
                          value={form?.features ?? ""}
                          onChange={(e) =>
                            updateForm("features", e.currentTarget.value)
                          }
                          placeholder="Distinct markings, collar, etc."
                        />
                      ) : (
                        effectiveData?.features || "-"
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="ink-subtle text-sm mb-1">Description</div>
                    <div
                      className={`rounded-lg border px-3 py-2 text-sm ink-heading break-words transition-colors duration-150 ${
                        editingReady
                          ? "border-neutral-700 bg-white"
                          : "border-[var(--border-color)] bg-[var(--card-bg)]"
                      }`}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {editingReady ? (
                        <textarea
                          rows={4}
                          className="w-full bg-transparent outline-none resize-none"
                          value={form?.description ?? ""}
                          onChange={(e) =>
                            updateForm("description", e.currentTarget.value)
                          }
                          placeholder="Behavior, situation, extra notes…"
                        />
                      ) : (
                        effectiveData?.description || "-"
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {mapLink ? (
                      <a
                        href={mapLink}
                        className="btn btn-accent px-3 py-1.5"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        View in Maps
                      </a>
                    ) : null}
                    {contactDisplay ? (
                      <span
                        className="pill px-3 py-1 text-xs"
                        style={{ border: "1px solid var(--border-color)" }}
                      >
                        Contact: {contactDisplay}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {viewer && (
            <div
              className="fixed inset-0 z-[80]"
              role="dialog"
              aria-modal="true"
              onClick={() => setViewer(null)}
            >
              <div className="absolute inset-0 bg-black/80" />
              <button
                type="button"
                aria-label="Close viewer"
                className="absolute left-4 top-4 z-[82] h-9 w-9 rounded-full text-white bg-[var(--primary-red)] hover:brightness-90 transition-colors duration-200 ease-in-out flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewer(null);
                }}
              >
                <CircleX className="h-6 w-6" />
              </button>
              {viewer.urls.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    className="absolute left-4 top-1/2 -translate-y-1/2 pill px-3 py-1 z-[82] text-white/90 border border-white/30 hover:bg-white hover:text-black hover:border-white transition-colors duration-200 ease-in-out"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewer((v) =>
                        v
                          ? {
                              ...v,
                              index:
                                (v.index - 1 + v.urls.length) % v.urls.length,
                            }
                          : v
                      );
                    }}
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 -translate-y-1/2 pill px-3 py-1 z-[82] text-white/90 border border-white/30 hover:bg-white hover:text-black hover:border-white transition-colors duration-200 ease-in-out"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewer((v) =>
                        v ? { ...v, index: (v.index + 1) % v.urls.length } : v
                      );
                    }}
                  >
                    <ChevronRight />
                  </button>
                </>
              )}
              <div className="relative z-[81] grid place-items-center w-full h-full p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    viewer.urls[Math.min(viewer.index, viewer.urls.length - 1)]
                  }
                  alt="Full size"
                  className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
        </div>,
        typeof document !== "undefined"
          ? document.body
          : (globalThis as any).document?.body
      )
    : null;

  return (
    <>
      {modal}
      <MapPickerModal
        open={Boolean(mapPickerOpen && editing)}
        onClose={() => setMapPickerOpen(false)}
        onSelect={handleMapSelect}
      />
    </>
  );
}
