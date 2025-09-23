"use client";

import { ChangeEvent, RefObject } from "react";
import { AlertType, ReportStatus } from "@/types/app";
import { Camera } from "lucide-react";

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
  return (
    <section
      id="report"
      className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-23"
    >
      <div className="surface rounded-2xl p-6 shadow-soft">
        <h2 className="text-2xl font-extrabold tracking-tight ink-heading">
          Report Lost / Found
        </h2>
        <p className="ink-muted">
          Provide details to notify nearby volunteers and barangay partners.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="font-semibold ink-heading">Step 1 - Upload</h3>
            <label
              className="mt-2 flex aspect-square w-full max-w-[360px] cursor-pointer flex-col items-center justify-center rounded-2xl overflow-hidden text-center transition hover:bg-[var(--card-bg)]"
              htmlFor="report-photo"
              style={{
                border: "2px dashed var(--border-color)",
                aspectRatio: "1 / 1",
              }}
            >
              <input
                type="file"
                id="report-photo"
                onChange={handlePhotoChange}
                className="hidden"
                accept="image/*"
                ref={reportPhotoInputRef}
              />
              {reportPhotoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reportPhotoPreviewUrl}
                  alt="Selected photo preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <Camera
                    className="h-10 w-10 text-[#666666]"
                    aria-hidden="true"
                  />
                  <span className="ink-muted text-sm">
                    {reportPhotoName
                      ? `Selected: ${reportPhotoName}`
                      : "Click to upload a photo"}
                  </span>
                </>
              )}
            </label>
          </div>
          <div>
            <h3 className="font-semibold ink-heading">Step 2 - Details</h3>
            <div className="mt-2 space-y-3">
              <div>
                <label className="text-sm" htmlFor="report-type">
                  Report Type
                </label>
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  id="report-type"
                  onChange={(event) =>
                    setReportType(
                      event.target.value as Exclude<AlertType, "all">
                    )
                  }
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportType}
                >
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                  <option value="cruelty">Cruelty</option>
                  <option value="adoption">Adoption</option>
                </select>
              </div>
              <div>
                <label className="text-sm" htmlFor="pet-description">
                  Description
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  id="pet-description"
                  onChange={(event) => setReportDescription(event.target.value)}
                  placeholder="Color, size, collar, unique marks."
                  rows={3}
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportDescription}
                />
              </div>
              <div>
                <label className="text-sm" htmlFor="pet-condition">
                  Condition
                </label>
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  id="pet-condition"
                  onChange={(event) => setReportCondition(event.target.value)}
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportCondition}
                >
                  <option>Healthy</option>
                  <option>Injured</option>
                  <option>Aggressive</option>
                </select>
              </div>
              <div>
                <label className="text-sm" htmlFor="pet-location">
                  Location
                </label>
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  id="pet-location"
                  onChange={(event) => setReportLocation(event.target.value)}
                  placeholder="Drop a pin / type an address"
                  style={{ border: "1px solid var(--border-color)" }}
                  type="text"
                  value={reportLocation}
                />
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold ink-heading">Step 3 - Confirm</h3>
            <div
              className="mt-2 rounded-xl p-4"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <p>
                Submitting will notify nearby volunteers and partner barangays.
              </p>
              <p className="mt-2">
                <strong>Safety first:</strong> If the pet seems aggressive, keep
                a safe distance.
              </p>
            </div>
            <button
              className="btn btn-accent mt-3 w-full px-5 py-3"
              disabled={reportStatus === "submitting"}
              onClick={handleSubmitReport}
              type="button"
            >
              {reportStatus === "submitting"
                ? "Submitting..."
                : "Submit Report"}
            </button>
            {reportStatus === "success" && (
              <p
                className="mt-3 text-sm"
                style={{ color: "var(--primary-green)" }}
              >
                Report submitted! Rescue team ETA: 12 mins.
              </p>
            )}
            {reportStatus === "error" && (
              <p
                className="mt-3 text-sm"
                style={{ color: "var(--primary-orange)" }}
              >
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
