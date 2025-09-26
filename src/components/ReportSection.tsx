"use client";

import {
  ChangeEvent,
  RefObject,
  useCallback,
  useState,
  FormEvent,
} from "react";
import Link from "next/link";
import { AlertType, ReportStatus } from "@/types/app";

type ReportSectionProps = {
  reportType: Exclude<AlertType, "all">;
  setReportType: (value: Exclude<AlertType, "all">) => void;
  reportDescription: string;
  setReportDescription: (value: string) => void;
  reportCondition: string;
  setReportCondition: (value: string) => void;
  reportLocation: string;
  setReportLocation: (value: string) => void;
  reportPhotoName: string;
  reportStatus: ReportStatus;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSubmitReport: () => void;
  reportPhotoInputRef: RefObject<HTMLInputElement>;
  reportPhotoPreviewUrl: string | null;
};

export function ReportSection({
  reportType,
  setReportType,
  reportDescription,
  setReportDescription,
  reportCondition,
  setReportCondition,
  reportLocation,
  setReportLocation,
  reportPhotoName,
  reportStatus,
  handlePhotoChange,
  handleSubmitReport,
  reportPhotoInputRef,
  reportPhotoPreviewUrl,
}: ReportSectionProps) {
  // Local UI state for the quick form and modal behavior
  const [qSpecies, setQSpecies] = useState("Dog");
  const [qWhen, setQWhen] = useState("");
  const [qContact, setQContact] = useState("");
  const [qAggressive, setQAggressive] = useState(false);
  const [qAnon, setQAnon] = useState(false);
  const [qFriendly, setQFriendly] = useState(false);
  const [showQuickValidation, setShowQuickValidation] = useState(false);

  // Derive a lightweight helper for quick report: we map the "Feature" input
  // directly to the shared reportDescription so the existing submit flow works.
  const onQuickFeatureChange = useCallback(
    (value: string) => {
      setReportDescription(value);
    },
    [setReportDescription]
  );

  // Keep report condition in sync when the quick aggressive flag toggles
  const onQuickAggressiveToggle = useCallback(
    (checked: boolean) => {
      setQAggressive(checked);
      if (checked) {
        setQFriendly(false);
        setReportCondition("Aggressive");
      }
    },
    [setReportCondition]
  );

  const onQuickFriendlyToggle = useCallback(
    (checked: boolean) => {
      setQFriendly(checked);
      if (checked) {
        setQAggressive(false);
        setReportCondition("Healthy");
      }
    },
    [setReportCondition]
  );

  const persistDraftToSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const draft = {
        type: reportType,
        species: qSpecies,
        location: reportLocation,
        when: qWhen,
        feature: reportDescription,
        contact: qContact,
        aggressive: qAggressive,
        friendly: qFriendly,
        anonymous: qAnon,
        condition: reportCondition,
        photoName: reportPhotoName || undefined,
      };
      window.sessionStorage.setItem("reportDraft", JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [
    qAggressive,
    qAnon,
    qContact,
    qSpecies,
    qWhen,
    reportDescription,
    reportLocation,
    reportType,
    reportCondition,
    reportPhotoName,
    qFriendly,
  ]);

  const quickSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // Show a friendly notice if required fields are missing
      const formValid = Boolean(
        reportType && qSpecies && reportLocation.trim() && qWhen.trim()
      );
      if (!formValid) {
        setShowQuickValidation(true);
        return;
      }
      // Optionally enrich the description with light context (species/contact/when)
      // without altering the API. We only do this if the description is empty.
      if (!reportDescription.trim()) {
        const parts = [
          qSpecies ? `Species: ${qSpecies}` : "",
          qWhen ? `When: ${qWhen}` : "",
          qContact ? `Contact: ${qContact}` : "",
          qAnon ? "(Submitted anonymously)" : "",
        ].filter(Boolean);
        if (parts.length > 0) {
          setReportDescription(parts.join(" | "));
        }
      }
      handleSubmitReport();
    },
    [
      handleSubmitReport,
      qAnon,
      qContact,
      qSpecies,
      qWhen,
      reportDescription,
      setReportDescription,
    ]
  );

  // Disable submit until required fields are present
  const isQuickFormValid = Boolean(
    reportType && qSpecies && reportLocation.trim() && qWhen.trim()
  );

  const missingFields = [] as string[];
  if (!reportLocation.trim()) missingFields.push("Location");
  if (!qWhen.trim()) missingFields.push("When");

  return (
    <section
      id="report"
      className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-23"
    >
      {/* Quick Report (EXPOSED) */}
      <div className="surface rounded-2xl p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight ink-heading">
              Quick Report — Sighting
            </h2>
            <p className="ink-muted">
              Post a fast sighting now. You can add full details later.
            </p>
          </div>
        </div>

        <form className="mt-5 space-y-3" onSubmit={quickSubmit}>
          <div className="grid gap-3 md:grid-cols-3">
            {/* Column 1: Pet Photos */}
            <div>
              <h3 className="font-semibold ink-heading">Pet Photos</h3>
              <label
                className="mt-2 block cursor-pointer rounded-xl p-6 text-center"
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
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={reportPhotoPreviewUrl}
                    alt="Selected photo preview"
                    className="mx-auto h-24 w-full max-w-xs rounded-xl object-cover"
                  />
                )}
              </label>
            </div>

            {/* Column 2: Report Type + Location + Features */}
            <div className="space-y-3">
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
                Location
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="Barangay / Street / Pin"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportLocation}
                  onChange={(e) => setReportLocation(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Distinctive Features (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="e.g., blue collar"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportDescription}
                  onChange={(e) => onQuickFeatureChange(e.target.value)}
                />
              </label>
            </div>

            {/* Column 3: Species + When + Contact */}
            <div className="space-y-3">
              <label className="block text-sm">
                Species
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={qSpecies}
                  onChange={(e) => setQSpecies(e.target.value)}
                  required
                >
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm">
                When
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={qWhen}
                  onChange={(e) => setQWhen(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Phone / Email (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="0900 000 0000 / you@example.com"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={qContact}
                  onChange={(e) => setQContact(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={qAggressive}
                onChange={(e) => onQuickAggressiveToggle(e.target.checked)}
              />
              <span>This pet may be aggressive</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={qFriendly}
                onChange={(e) => onQuickFriendlyToggle(e.target.checked)}
              />
              <span>Pet seems friendly</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={qAnon}
                onChange={(e) => setQAnon(e.target.checked)}
              />
              <span>Submit anonymously</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary px-4 py-2"
              disabled={reportStatus === "submitting"}
            >
              {reportStatus === "submitting"
                ? "Submitting…"
                : "Submit sighting"}
            </button>
            {showQuickValidation && !isQuickFormValid && (
              <p
                className="text-sm"
                style={{ color: "var(--primary-orange)" }}
                aria-live="polite"
              >
                Please fill required fields: {missingFields.join(" and ") || ""}
                .
              </p>
            )}
            <Link
              href="/report-form"
              className="btn px-4 py-2"
              style={{ border: "1px solid var(--border-color)" }}
              onClick={persistDraftToSession}
            >
              Add more details…
            </Link>
            {reportStatus === "success" && (
              <p className="text-sm" style={{ color: "var(--primary-green)" }}>
                Sighting posted. Thank you!
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

      {/* Regular Report moved to /report-form */}
    </section>
  );
}
