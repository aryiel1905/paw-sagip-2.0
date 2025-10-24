"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { fetchReportById } from "@/data/supabaseApi";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ReportViewData = {
  id: string;
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

  if (!open) return null;

  const mapLink =
    effectiveData &&
    typeof effectiveData.latitude === "number" &&
    typeof effectiveData.longitude === "number"
      ? `https://www.google.com/maps?q=${effectiveData.latitude},${effectiveData.longitude}`
      : null;

  function formatWhen(): string {
    const d = effectiveData?.event_at || effectiveData?.created_at;
    if (!d) return "-";
    try {
      const date = new Date(d);
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  }

  // viewer state declared above so effects can reference it safely

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-full rounded-2xl shadow-soft surface">
        <div
          className="flex items-center justify-between border-b p-5"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div>
            <h3 className="text-lg font-semibold ink-heading">
              {(effectiveData?.pet_name ? `${effectiveData.pet_name} — ` : "") +
                (effectiveData?.type?.toUpperCase() || "")}
            </h3>
            <p className="text-sm ink-muted">{effectiveData?.location || ""}</p>
          </div>
          <button
            className="pill px-3 py-1"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="p-5 grid gap-5 md:grid-cols-3">
          <div className="md:col-span-1">
            {effectiveLoading ? (
              <div className="ink-muted text-sm">Loading details…</div>
            ) : effectiveError ? (
              <div className="ink-muted text-sm">{effectiveError}</div>
            ) : effectiveData?.mainUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={effectiveData.mainUrl}
                alt="report"
                className="h-32 w-full max-w-[180px] rounded-xl object-cover cursor-zoom-in"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewer({
                    urls: [effectiveData.mainUrl as string],
                    index: 0,
                  });
                }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className="grid h-32 w-full max-w-[180px] place-content-center rounded-xl text-4xl"
                style={{ background: "var(--card-bg)" }}
              >
                🐾
              </div>
            )}

            {lmCount > 0 && (
              <div className="relative mt-3 h-32 w-full max-w-[180px]">
                {currentLm && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentLm}
                    alt={`landmark ${Math.min(
                      lmIndex + 1,
                      lmCount
                    )} of ${lmCount}`}
                    className="h-full w-full object-cover rounded-xl cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewer({
                        urls: displayLandmarks,
                        index: Math.min(lmIndex, lmCount - 1),
                      });
                    }}
                    loading="lazy"
                    decoding="async"
                  />
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
                      onClick={() => setLmIndex((i) => (i + 1) % lmCount)}
                    >
                      <ChevronRight />
                    </button>
                  </>
                )}
                <div
                  className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs"
                  style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
                >
                  {Math.min(lmIndex + 1, lmCount)}/{lmCount}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 grid gap-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="ink-subtle">Type</div>
              <div className="ink-heading capitalize">
                {effectiveData?.type || "-"}
              </div>
              <div className="ink-subtle">Pet Name</div>
              <div className="ink-heading">
                {effectiveData?.pet_name || "-"}
              </div>
              <div className="ink-subtle">Condition</div>
              <div className="ink-heading">
                {effectiveData?.condition || "-"}
              </div>
              <div className="ink-subtle">When</div>
              <div className="ink-heading">{formatWhen()}</div>
              <div className="ink-subtle">Submitted</div>
              <div className="ink-heading">
                {(() => {
                  const d = effectiveData?.created_at;
                  if (!d) return "-";
                  try {
                    return new Date(d).toLocaleString();
                  } catch {
                    return d;
                  }
                })()}
              </div>
              <div className="ink-subtle">Location</div>
              <div className="ink-heading">
                {effectiveData?.location || "-"}
              </div>
              <div className="ink-subtle">Species</div>
              <div className="ink-heading">{effectiveData?.species || "-"}</div>
              <div className="ink-subtle">Breed</div>
              <div className="ink-heading">{effectiveData?.breed || "-"}</div>
              <div className="ink-subtle">Gender</div>
              <div className="ink-heading">{effectiveData?.gender || "-"}</div>
              <div className="ink-subtle">Age/Size</div>
              <div className="ink-heading">
                {effectiveData?.age_size || "-"}
              </div>
              <div className="ink-subtle">Status</div>
              <div className="ink-heading">{effectiveData?.status || "-"}</div>
              <div className="ink-subtle">Aggressive</div>
              <div className="ink-heading">
                {typeof effectiveData?.is_aggressive === "boolean"
                  ? effectiveData?.is_aggressive
                    ? "Yes"
                    : "No"
                  : "-"}
              </div>
              <div className="ink-subtle">Friendly</div>
              <div className="ink-heading">
                {typeof effectiveData?.is_friendly === "boolean"
                  ? effectiveData?.is_friendly
                    ? "Yes"
                    : "No"
                  : "-"}
              </div>
              <div className="ink-subtle">Anonymous</div>
              <div className="ink-heading">
                {typeof effectiveData?.is_anonymous === "boolean"
                  ? effectiveData?.is_anonymous
                    ? "Yes"
                    : "No"
                  : "-"}
              </div>
              <div className="ink-subtle">Reporter Name</div>
              <div className="ink-heading">
                {effectiveData?.is_anonymous
                  ? "-"
                  : effectiveData?.reporter_name || "-"}
              </div>
              <div className="ink-subtle">Contact</div>
              <div className="ink-heading">
                {effectiveData?.is_anonymous
                  ? "-"
                  : effectiveData?.reporter_contact || "-"}
              </div>
              <div className="ink-subtle">ID</div>
              <div className="ink-heading">{effectiveData?.id || "-"}</div>
            </div>

            <div>
              <div className="ink-subtle text-sm mb-1">Features</div>
              <div className="ink-heading text-sm break-words">
                {effectiveData?.features || "-"}
              </div>
            </div>

            <div>
              <div className="ink-subtle text-sm mb-1">Description</div>
              <div className="ink-heading text-sm break-words">
                {effectiveData?.description || "-"}
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
              {effectiveData &&
              effectiveData.is_anonymous ? null : effectiveData?.reporter_contact ? (
                <span
                  className="pill px-3 py-1 text-xs"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  Contact: {effectiveData.reporter_contact}
                </span>
              ) : null}
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
            className="absolute left-4 top-4 pill px-3 py-1 z-[82] text-white/90 border border-white/30 hover:bg-white hover:text-black hover:border-white transition-colors duration-200 ease-in-out flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setViewer(null);
            }}
          >
            <ChevronLeft />
            Back
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
                          index: (v.index - 1 + v.urls.length) % v.urls.length,
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
              src={viewer.urls[Math.min(viewer.index, viewer.urls.length - 1)]}
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
  );
}
