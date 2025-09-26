"use client";

import { useCallback, useEffect, useRef, useState, ChangeEvent } from "react";
import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import MapPickerModal from "@/components/MapPickerModal";
import { supabase } from "@/lib/supabaseClient";
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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [friendly, setFriendly] = useState(false);
  const [aggressiveFlag, setAggressiveFlag] = useState(false);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReportPhoto(file);
    setReportPhotoName(file ? file.name : "");
    setReportPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  useEffect(() => {
    return () => {
      if (reportPhotoPreviewUrl) URL.revokeObjectURL(reportPhotoPreviewUrl);
    };
  }, [reportPhotoPreviewUrl]);

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
      if (draft.feature) setReportDescription(draft.feature);
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
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;
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

    const payload = {
      type: reportType,
      description: reportDescription,
      condition: reportCondition,
      location: reportLocation,
      lat: reportLat,
      lng: reportLng,
      photoPath: uploadedPhotoPath,
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
      setTimeout(() => setReportStatus("idle"), 5000);
    } catch (e) {
      setReportStatus("error");
    }
  }, [
    reportCondition,
    reportDescription,
    reportLocation,
    reportPhoto,
    reportPhotoPreviewUrl,
    reportType,
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
          className="hover:underline"
          style={{ color: "var(--primary-mintgreen)" }}
        >
          ← Back to Home
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
                Report Form — Lost / Found Pet
              </h1>
              <p className="text-sm ink-muted">
                Provide full details to notify volunteers and barangay partners.
              </p>
            </div>
          </div>
        </div>
        <form className="p-6" onSubmit={onSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Photos */}
            <div>
              <h3 className="font-semibold ink-heading">Pet Photos</h3>
              <label
                className="mt-2 flex aspect-[4/3] w-full max-w-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
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
                    <span className="text-sm ink-muted">
                      {reportPhotoName
                        ? `Selected: ${reportPhotoName}`
                        : "Upload one or more photos"}
                    </span>
                    {!reportPhotoName && prevPhotoName && (
                      <span className="mt-1 block text-xs ink-subtle">
                        Previously selected in quick report: {prevPhotoName}
                      </span>
                    )}
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reportPhotoPreviewUrl}
                    alt="Selected photo preview"
                    className="h-full w-full object-contain"
                  />
                )}
              </label>
            </div>

            {/* Identity */}
            <div>
              <h3 className="font-semibold ink-heading">Pet Identity</h3>
              <div className="mt-2 space-y-3">
                <label className="block text-sm">
                  Pet Name (optional)
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="e.g., Buddy"
                    style={{ border: "1px solid var(--border-color)" }}
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
                <label className="block text-sm">
                  Breed / Mix
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="e.g., Aspin / Mix"
                    style={{ border: "1px solid var(--border-color)" }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm">
                    Gender
                    <select
                      className="mt-1 w-full rounded-xl px-3 py-2"
                      style={{ border: "1px solid var(--border-color)" }}
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
                    >
                      <option>Puppy/Kitten</option>
                      <option>Adult</option>
                      <option>Senior</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* Status & Safety */}
            <div>
              <h3 className="font-semibold ink-heading">Status & Safety</h3>
              <div className="mt-2 space-y-3">
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
                <label className="block text-sm">
                  Distinctive Features
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="Collar color, scars, markings, tag/microchip"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                  />
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-4">
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
                  {/* Anonymous toggle remains in Notes & Contact section */}
                </div>
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
                    className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)]"
                    placeholder="Use the pin to pick location"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportLocation}
                    readOnly
                    aria-readonly
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
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <label className="block text-sm">
              Reporter Notes
              <textarea
                rows={4}
                className="mt-1 w-full rounded-xl px-3 py-2"
                placeholder="Behavior, situation, directions…"
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
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                <span>Submit anonymously</span>
              </label>
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
              {reportStatus === "submitting" ? "Submitting…" : "Submit Report"}
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
