"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  ChangeEvent,
} from "react";
import Link from "next/link";
import { Clock, ArrowLeft, AlertTriangle, Smile, EyeOff } from "lucide-react";
import MapPickerModal from "@/components/MapPickerModal";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AlertType, ReportStatus } from "@/types/app";
import { showToast } from "@/lib/toast";

// Storage bucket to keep report photos consistent with the home page
const PET_MEDIA_BUCKET = "pet-media";

export default function ReportFormPage() {
  const [reportType, setReportType] =
    useState<Exclude<AlertType, "all">>("found");
  const [reportCondition, setReportCondition] = useState("Healthy");
  const [reportLocation, setReportLocation] = useState("");
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [species, setSpecies] = useState("Dog");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Unknown");
  const [ageSize, setAgeSize] = useState("Puppy/Kitten");
  const [features, setFeatures] = useState("");
  const [contact, setContact] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [when, setWhen] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportPhotoName, setReportPhotoName] = useState("");
  const [reportPhotoPreviewUrl, setReportPhotoPreviewUrl] = useState<
    string | null
  >(null);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  const [prevPhotoName, setPrevPhotoName] = useState<string>("");
  // Landmark photos (multiple)
  const [landmarkPhotos, setLandmarkPhotos] = useState<File[]>([]);
  const [landmarkPreviewUrls, setLandmarkPreviewUrls] = useState<string[]>([]);
  const landmarkInputRef = useRef<HTMLInputElement | null>(null);
  const landmarkInputMobileRef = useRef<HTMLInputElement | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [friendly, setFriendly] = useState(false);
  const [aggressiveFlag, setAggressiveFlag] = useState(false);
  // Tip popover state for the three checkboxes (aggressive/friendly/anonymous)
  const [tipOpen, setTipOpen] = useState(false);
  const [tipKey, setTipKey] = useState<
    "aggressive" | "friendly" | "anonymous" | null
  >(null);
  const [tipPos, setTipPos] = useState<{
    top: number;
    left: number;
    below: boolean;
    arrowLeft: number;
  }>({ top: 0, left: 0, below: true, arrowLeft: 16 });
  const tipAnchorRef = useRef<HTMLElement | null>(null);

  const getTipContent = (key: "aggressive" | "friendly" | "anonymous") => {
    switch (key) {
      case "aggressive":
        return (
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[var(--primary-orange)]" />
            <div>
              <p className="font-semibold">
                Aggressive / Fearful - Safety First
              </p>
              <p className="mt-1 text-sm">
                Do not approach. Keep 3-5 meters away. Avoid eye contact and
                sudden moves. Observe from a distance and add a clear
                photo/video.
              </p>
            </div>
          </div>
        );
      case "friendly":
        return (
          <div className="flex items-start gap-2">
            <Smile className="mt-0.5 h-5 w-5 text-[var(--primary-mintgreen)]" />
            <div>
              <p className="font-semibold">Seems Friendly - Approach Slowly</p>
              <p className="mt-1 text-sm">
                Speak softly, avoid chasing, and check for a collar tag. Offer
                water if you can.
              </p>
            </div>
          </div>
        );
      case "anonymous":
        return (
          <div className="flex items-start gap-2">
            <EyeOff className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Submit Anonymously</p>
              <p className="mt-1 text-sm">
                Your name is hidden. If safe, include a phone/email so
                responders can coordinate follow-ups.
              </p>
            </div>
          </div>
        );
    }
  };

  const positionPopover = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const tipWidth = Math.min(window.innerWidth * 0.92, 360);
    const estimatedHeight = 140;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > estimatedHeight + margin;
    const top = placeBelow
      ? rect.bottom + margin
      : rect.top - estimatedHeight - margin;
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - tipWidth - 8)
    );
    const anchorCenter = rect.left + rect.width / 2;
    const arrowLeft = Math.max(
      8,
      Math.min(anchorCenter - left - 6, tipWidth - 24)
    );
    setTipPos({ top, left, below: placeBelow, arrowLeft });
  };

  const showTipFor = (
    anchor: HTMLElement,
    key: "aggressive" | "friendly" | "anonymous"
  ) => {
    tipAnchorRef.current = anchor;
    setTipKey(key);
    setTipOpen(true);
    positionPopover(anchor);
  };

  const hideTip = () => {
    setTipOpen(false);
    setTipKey(null);
    tipAnchorRef.current = null;
  };

  useEffect(() => {
    const handler = () => {
      if (tipOpen && tipAnchorRef.current)
        positionPopover(tipAnchorRef.current);
    };
    window.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [tipOpen]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReportPhoto(file);
    setReportPhotoName(file ? file.name : "");
    setReportPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  // Landmark photos handlers (match quick report)
  const handleLandmarkPhotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const existing = landmarkPhotos.length;
    const available = Math.max(0, 5 - existing);
    const toAdd = files.slice(0, available);
    const overSize = toAdd.some((f) => f.size > 5 * 1024 * 1024);
    if (overSize) {
      showToast("error", "Each photo must be under 5 MB.");
      return;
    }
    setLandmarkPhotos((prev) => [...prev, ...toAdd]);
    setLandmarkPreviewUrls((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    try {
      (event.target as HTMLInputElement).value = "";
    } catch {}
    if (files.length > available) {
      showToast("error", "You can upload up to 5 landmark photos.");
    }
  };

  const removeLandmarkAt = (index: number) => {
    if (index < 0 || index >= landmarkPhotos.length) return;
    const nextFiles = landmarkPhotos.filter((_, i) => i !== index);
    const nextUrls = landmarkPreviewUrls.filter((u, i) => {
      if (i === index) {
        try {
          URL.revokeObjectURL(u);
        } catch {}
        return false;
      }
      return true;
    });
    setLandmarkPhotos(nextFiles);
    setLandmarkPreviewUrls(nextUrls);
    if (nextFiles.length === 0) {
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
    }
  };

  const clearLandmarkPhotos = () => {
    try {
      landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    } catch {}
    setLandmarkPhotos([]);
    setLandmarkPreviewUrls([]);
    if (landmarkInputRef.current) landmarkInputRef.current.value = "";
    if (landmarkInputMobileRef.current)
      landmarkInputMobileRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (reportPhotoPreviewUrl) URL.revokeObjectURL(reportPhotoPreviewUrl);
      try {
        landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      } catch {}
    };
  }, [reportPhotoPreviewUrl, landmarkPreviewUrls]);

  // Keep the helper checkboxes in sync with the selected condition
  useEffect(() => {
    setAggressiveFlag(reportCondition === "Aggressive");
    setFriendly(reportCondition === "Healthy");
  }, [reportCondition]);

  // Prefill from quick report draft stored in sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("reportDraft");
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        type: Exclude<AlertType, "all">;
        species: string;
        location: string;
        when: string; // datetime-local
        feature: string;
        contact: string;
        aggressive: boolean;
        anonymous: boolean;
        condition: string;
        photoName: string;
      }>;
      if (draft.type) setReportType(draft.type);
      if (draft.species) setSpecies(draft.species);
      if (draft.location) setReportLocation(draft.location);
      if (draft.feature) setFeatures(draft.feature);
      if (draft.contact) setContact(draft.contact);
      if (typeof draft.anonymous === "boolean") setAnonymous(draft.anonymous);
      if (typeof draft.aggressive === "boolean" && draft.aggressive) {
        setReportCondition("Aggressive");
      } else if (draft.condition) {
        setReportCondition(draft.condition);
      }
      if (draft.when) {
        setWhen(draft.when);
      }
      if (draft.photoName) setPrevPhotoName(draft.photoName);
    } catch {
      // ignore
    }
  }, []);

  // When toggling anonymous, clear and disable the name input
  useEffect(() => {
    if (anonymous) setReporterName("");
  }, [anonymous]);

  const handleSubmitReport = useCallback(async () => {
    const supabase = getSupabaseClient();
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;
    let uploadedLandmarkPaths: string[] = [];
    if (reportPhoto) {
      const fileExt = reportPhoto.name.split(".").pop()?.toLowerCase() ?? "";
      const uniqueFileName = `${crypto.randomUUID()}${
        fileExt ? `.${fileExt}` : ""
      }`;
      const filePath = `reports/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .upload(filePath, reportPhoto, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error(
          "Failed to upload report photo",
          uploadError.message ?? uploadError
        );
        setReportStatus("error");
        return;
      }
      uploadedPhotoPath = uploadData?.path ?? filePath;
    }

    // Upload landmark photos (max 5)
    if (landmarkPhotos.length > 0) {
      const paths: string[] = [];
      for (const file of landmarkPhotos.slice(0, 5)) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
        const uniqueFileName = `${crypto.randomUUID()}${
          fileExt ? `.${fileExt}` : ""
        }`;
        const filePath = `reports/landmarks/${uniqueFileName}`;
        const { data: up, error: err } = await supabase.storage
          .from(PET_MEDIA_BUCKET)
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (err) {
          console.error("Failed to upload landmark photo", err.message ?? err);
          setReportStatus("error");
          return;
        }
        paths.push(up?.path ?? filePath);
      }
      uploadedLandmarkPaths = paths;
    }

    const eventAtIso = when ? new Date(when).toISOString() : null;

    const payload = {
      type: reportType,
      description: reportDescription,
      condition: reportCondition,
      location: reportLocation,
      lat: reportLat,
      lng: reportLng,
      photoPath: uploadedPhotoPath,
      landmarkMediaPaths: uploadedLandmarkPaths,

      // extended fields from the full form
      petName: petName?.trim() ? petName.trim() : null,
      species: species || null,
      breed: breed?.trim() ? breed.trim() : null,
      gender: gender || null,
      ageSize: ageSize || null,
      features: features?.trim() ? features.trim() : null,
      eventAt: eventAtIso,
      reporterName: reporterName?.trim() ? reporterName.trim() : null,
      reporterContact: contact?.trim() ? contact.trim() : null,
      isAggressive: aggressiveFlag,
      isFriendly: friendly,
      isAnonymous: anonymous,
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setReportStatus("error");
        showToast("error", "Something went wrong. Please try again.");
        return;
      }
      setReportStatus("success");
      showToast("success", "Report submitted! Rescue team notified.");
      setReportDescription("");
      setReportLocation("");
      setReportPhoto(null);
      setReportPhotoName("");
      if (reportPhotoInputRef.current) reportPhotoInputRef.current.value = "";
      if (reportPhotoPreviewUrl) {
        URL.revokeObjectURL(reportPhotoPreviewUrl);
        setReportPhotoPreviewUrl(null);
      }
      // Clear landmark previews
      if (landmarkPreviewUrls.length) {
        try {
          landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        } catch {}
      }
      setLandmarkPhotos([]);
      setLandmarkPreviewUrls([]);
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
      setTimeout(() => setReportStatus("idle"), 5000);
    } catch {
      setReportStatus("error");
    }
  }, [
    reportCondition,
    reportDescription,
    reportLocation,
    reportPhoto,
    reportPhotoPreviewUrl,
    reportType,
    landmarkPhotos,
    landmarkPreviewUrls,
    reportLat,
    reportLng,
    petName,
    species,
    breed,
    gender,
    ageSize,
    features,
    reporterName,
    contact,
    anonymous,
    aggressiveFlag,
    friendly,
    when,
  ]);

  const isFormValid = Boolean(
    reportType && species && reportLocation.trim() && when.trim()
  );

  const missingFields: string[] = [];
  if (!reportLocation.trim()) missingFields.push("Location");
  if (!when.trim()) missingFields.push("When");
  if (!species) missingFields.push("Species");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setShowValidation(true);
      return;
    }
    handleSubmitReport();
  };

  return (
    <main className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 hover:underline"
          style={{ color: "var(--primary-mintgreen)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
      <div className="surface rounded-2xl shadow-soft">
        <div
          className="border-b p-5"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold ink-heading">
                Report Form - Lost / Found Pet
              </h1>
              <p className="text-sm ink-muted">
                Provide full details to notify volunteers and barangay partners.
              </p>
            </div>
          </div>
        </div>
        <form className="p-6" onSubmit={onSubmit}>
          <div className="hidden md:flex justify-center gap-6 mb-4">
            <label
              className="mt-2 relative group flex aspect-[4/3] w-full max-w-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
              htmlFor="report-photo"
              style={{ border: "2px dashed var(--border-color)" }}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="report-photo"
                onChange={handlePhotoChange}
                ref={reportPhotoInputRef}
              />
              {!reportPhotoPreviewUrl ? (
                <>
                  <span className="block text-3xl">📷</span>
                  <span className="text-sm ink-muted opacity-80 group-hover:opacity-100 transition">
                    {reportPhotoName
                      ? `Selected: ${reportPhotoName}`
                      : "Upload one or more photos"}
                  </span>
                  {!reportPhotoName && prevPhotoName && (
                    <span className="mt-1 block text-xs ink-subtle">
                      Previously selected in quick report: {prevPhotoName}
                    </span>
                  )}
                  <div className="mt-2">
                    <div
                      className="mx-auto rounded-full w-10 h-10 flex items-center justify-center text-xl opacity-70 group-hover:opacity-100 transition"
                      style={{
                        background: "var(--white)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      +
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reportPhotoPreviewUrl!}
                    alt="Selected photo preview"
                    className="h-full w-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="absolute top-2 right-2 pill px-2 py-1 text-xs"
                    style={{
                      background: "var(--white)",
                      border: "1px solid var(--border-color)",
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (reportPhotoInputRef.current)
                        reportPhotoInputRef.current.value = "";
                      setReportPhoto(null);
                      if (reportPhotoPreviewUrl) {
                        try {
                          URL.revokeObjectURL(reportPhotoPreviewUrl);
                        } catch {}
                      }
                      setReportPhotoPreviewUrl(null);
                      setReportPhotoName("");
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </label>

            <label
              className="mt-2 relative group flex flex-col aspect-[4/3] w-full max-w-[360px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
              htmlFor="report-landmarks"
              style={{ border: "2px dashed var(--border-color)" }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="report-landmarks"
                onChange={handleLandmarkPhotosChange}
                ref={landmarkInputRef}
              />
              {landmarkPreviewUrls.length === 0 ? (
                <>
                  <span className="block text-3xl">🗺️</span>
                  <span className="text-sm ink-muted opacity-80 group-hover:opacity-100 transition">
                    Upload landmark photos (up to 5)
                  </span>
                  <div className="mt-2">
                    <div
                      className="mx-auto rounded-full w-10 h-10 flex items-center justify-center text-xl opacity-70 group-hover:opacity-100 transition"
                      style={{
                        background: "var(--white)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      +
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative h-full w-full">
                  <LandmarkCarousel
                    urls={landmarkPreviewUrls}
                    onRemove={(idx) => removeLandmarkAt(idx)}
                    onClearAll={() => clearLandmarkPhotos()}
                    onAdd={() => landmarkInputRef.current?.click()}
                  />
                </div>
              )}
            </label>
          </div>

          {/* Identity */}
          <div>
            <h3 className="font-semibold ink-heading">Pet Identity</h3>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              <label className="block text-sm">
                Pet Name (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="e.g., Buddy"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Species
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  required
                >
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm lg:col-span-2">
                Breed / Mix
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="e.g., Aspin / Mix"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Gender
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option>Unknown</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </label>
              <label className="block text-sm">
                Age / Size
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={ageSize}
                  onChange={(e) => setAgeSize(e.target.value)}
                >
                  <option>Puppy/Kitten</option>
                  <option>Adult</option>
                  <option>Senior</option>
                </select>
              </label>
            </div>
          </div>

          {/* Status & Safety */}
          <div>
            <h3 className="font-semibold ink-heading">Status & Safety</h3>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              <label className="block text-sm">
                Report Type
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as Exclude<AlertType, "all">)
                  }
                  required
                >
                  <option value="found">Found</option>
                  <option value="lost">Lost</option>
                  <option value="cruelty">Cruelty</option>
                </select>
              </label>
              <label className="block text-sm">
                Condition
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportCondition}
                  onChange={(e) => setReportCondition(e.target.value)}
                >
                  <option>Healthy</option>
                  <option>Injured</option>
                  <option>Aggressive</option>
                  <option>Malnourished</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm lg:col-span-2">
                Distinctive Features
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="Collar color, scars, markings, tag/microchip"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                />
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-4 lg:col-span-2">
                <label
                  className="inline-flex items-center gap-2 text-sm"
                  style={
                    aggressiveFlag
                      ? { color: "var(--primary-orange)" }
                      : undefined
                  }
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={aggressiveFlag}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAggressiveFlag(checked);
                      if (checked) {
                        setFriendly(false);
                        setReportCondition("Aggressive");
                      } else if (reportCondition === "Aggressive") {
                        // Default back to Healthy when turning off aggressive
                        setReportCondition("Healthy");
                      }
                      if (checked) showTipFor(e.target, "aggressive");
                      else hideTip();
                    }}
                    style={
                      aggressiveFlag
                        ? ({
                            accentColor: "var(--primary-orange)",
                          } as React.CSSProperties)
                        : undefined
                    }
                  />
                  <span>This pet may be aggressive</span>
                </label>
                <label
                  className="inline-flex items-center gap-2 text-sm"
                  style={
                    friendly ? { color: "var(--primary-mintgreen)" } : undefined
                  }
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={friendly}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFriendly(checked);
                      if (checked) {
                        setAggressiveFlag(false);
                        setReportCondition("Healthy");
                      } else if (reportCondition === "Healthy") {
                        // Keep at Healthy by default when turning off
                        setReportCondition("Healthy");
                      }
                      if (checked) showTipFor(e.target, "friendly");
                      else hideTip();
                    }}
                    style={
                      friendly
                        ? ({
                            accentColor: "var(--primary-mintgreen)",
                          } as React.CSSProperties)
                        : undefined
                    }
                  />
                  <span>Pet seems friendly</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={anonymous}
                    onChange={(e) => {
                      setAnonymous(e.target.checked);
                      if (e.target.checked) showTipFor(e.target, "anonymous");
                      else hideTip();
                    }}
                  />
                  <span>Submit anonymously</span>
                </label>
              </div>
            </div>
          </div>

          {/* Location & Time */}
          <div
            className="mt-6 rounded-2xl p-4"
            style={{ background: "var(--card-bg)" }}
          >
            <h3 className="font-semibold ink-heading">Location & Time</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="block text-sm">
                Location
                <div className="mt-1 flex items-center gap-2">
                  <input
                    className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)] cursor-not-allowed"
                    placeholder="Use the pin to pick location"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportLocation}
                    readOnly
                    aria-readonly
                    disabled
                    required
                  />
                  <button
                    type="button"
                    aria-label="Open map picker"
                    onClick={() => setShowMapPicker(true)}
                    className="rounded-xl px-3 py-2 text-white"
                    style={{ backgroundColor: "var(--primary-mintgreen)" }}
                  >
                    Pin
                  </button>
                </div>
                <p className="mt-1 text-xs ink-muted">
                  Use the pin to pick an exact location.
                </p>
              </label>
              <label className="block text-sm">
                When
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label="Set current date & time"
                    onClick={() => {
                      const now = new Date();
                      const iso = new Date(
                        now.getTime() - now.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16);
                      setWhen(iso);
                    }}
                    className="rounded-xl px-3 py-2 text-white"
                    style={{ backgroundColor: "var(--primary-mintgreen)" }}
                  >
                    <Clock className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-xs ink-muted">
                  You can type a date/time or tap the clock to set now.
                </p>
              </label>
              {/* Hidden precise coordinates so we retain accuracy while showing address */}
              <input
                type="hidden"
                name="lat"
                value={reportLat ?? ""}
                readOnly
              />
              <input
                type="hidden"
                name="lng"
                value={reportLng ?? ""}
                readOnly
              />
            </div>
          </div>

          {/* Notes & Contact */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2 items-stretch">
            <label className="block text-sm h-full">
              Reporter Notes
              <textarea
                rows={4}
                className="mt-1 w-full rounded-xl px-3 py-2 min-h-36"
                placeholder="Behavior, situation, directions..."
                style={{ border: "1px solid var(--border-color)" }}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </label>
            <div className="space-y-3">
              <label className="block text-sm">
                Your Name (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  disabled={anonymous}
                />
              </label>
              <label className="block text-sm">
                Phone / Email (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="0900 000 0000 / you@example.com"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </label>
              {/* Anonymous toggle moved next to status checkboxes */}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3 p-6 pt-0">
            <button type="button" className="btn btn-accent px-4 py-3">
              Emergency Hotline
            </button>
            <button
              type="submit"
              className="btn btn-primary px-6 py-3"
              disabled={reportStatus === "submitting"}
            >
              {reportStatus === "submitting"
                ? "Submitting..."
                : "Submit Report"}
            </button>
            {showValidation && !isFormValid && (
              <p
                className="text-sm"
                style={{ color: "var(--primary-orange)" }}
                aria-live="polite"
              >
                Please fill required fields: {missingFields.join(" and ") || ""}
                .
              </p>
            )}
            {reportStatus === "success" && (
              <p className="text-sm" style={{ color: "var(--primary-green)" }}>
                Report submitted! Rescue team notified.
              </p>
            )}
            {reportStatus === "error" && (
              <p className="text-sm" style={{ color: "var(--primary-orange)" }}>
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        </form>
      </div>
      {tipOpen && tipKey && (
        <div
          className="fixed z-50"
          style={{
            top: tipPos.top,
            left: tipPos.left,
            width: "min(92vw, 360px)",
          }}
          role="dialog"
          aria-live="polite"
        >
          <div
            className="surface rounded-2xl p-3 shadow-soft"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm">{getTipContent(tipKey)}</div>
              <button
                type="button"
                className="pill px-2 py-1 text-xs"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={hideTip}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="absolute"
            style={
              {
                width: 12,
                height: 12,
                left: tipPos.arrowLeft,
                [tipPos.below ? "top" : "bottom"]: -6,
                background: "var(--white)",
                transform: `rotate(${tipPos.below ? 45 : 225}deg)`,
                borderLeft: "1px solid var(--border-color)",
                borderTop: "1px solid var(--border-color)",
              } as React.CSSProperties
            }
          />
        </div>
      )}
      <MapPickerModal
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={(lat, lng, address) => {
          setReportLocation(address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setReportLat(lat);
          setReportLng(lng);
          setShowMapPicker(false);
        }}
      />
    </main>
  );
}

function LandmarkCarousel({
  urls,
  onRemove,
  onClearAll,
  onAdd,
}: {
  urls: string[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
  onAdd?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const count = urls.length;
  const current = useMemo(
    () => (count ? urls[Math.min(index, count - 1)] : null),
    [urls, index, count]
  );
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (count > prevCountRef.current) {
      setIndex(Math.max(0, count - 1));
    }
    prevCountRef.current = count;
  }, [count]);
  if (count === 0) return null;
  return (
    <div className="relative h-full w-full">
      {/* image */}
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt={`landmark ${index + 1} of ${count}`}
          className="h-full w-full object-cover rounded-xl"
        />
      )}
      {/* arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 pill px-3 py-1 text-sm shadow-soft"
            style={{
              background: "var(--white)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((i) => (i - 1 + count) % count);
            }}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 pill px-3 py-1 text-sm shadow-soft"
            style={{
              background: "var(--white)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((i) => (i + 1) % count);
            }}
          >
            ▶
          </button>
        </>
      )}
      {/* index indicator */}
      <div
        className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
      >
        {Math.min(index + 1, count)}/{count}
      </div>
      {/* add more pill (bottom-right) */}
      {count < 5 && onAdd && (
        <button
          type="button"
          className="absolute bottom-2 right-2 pill px-2 py-1 text-xs"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-color)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd();
          }}
          aria-label="Add more photos"
        >
          +
        </button>
      )}
      {/* remove pill (current) */}
      <button
        type="button"
        className="absolute top-2 right-2 pill px-2 py-1 text-xs"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border-color)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(Math.min(index, count - 1));
          setIndex((i) => Math.max(0, i - 1));
        }}
      >
        Remove
      </button>
      {/* clear all pill */}
      <button
        type="button"
        className="absolute top-2 left-2 pill px-2 py-1 text-xs"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border-color)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClearAll();
          setIndex(0);
        }}
      >
        Clear
      </button>
    </div>
  );
}
