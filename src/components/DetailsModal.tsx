"use client";

import { Alert, AdoptionPet, ModalItem } from "@/types/app";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { isVideoUrl } from "@/lib/media";
import {
  fetchLandmarkImageUrlsByAlertImage,
  fetchReportDetailsForAlert,
  type ReportDetails,
} from "@/data/supabaseApi";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DetailsModalProps = {
  item: ModalItem;
  onClose: () => void;
  timeAgoFromMinutes: (m: number) => string;
  getMapsLink: (a: Alert) => string | null;
};

function DetailsRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="ink-subtle">{label}</div>
      <div className="ink-heading">{value || "-"}</div>
    </>
  );
}

function DetailsModalInner({
  item,
  onClose,
  timeAgoFromMinutes,
  getMapsLink,
}: DetailsModalProps) {
  const isAlert = item?.kind === "alert";
  const fmtPetStatus = (s?: string | null) =>
    s === "in_custody" ? "In Custody" : s === "roaming" ? "Roaming" : "-";
  const initialLm = useMemo(
    () => (item && isAlert ? item.alert.landmarkImageUrls ?? [] : []),
    [isAlert, item]
  );
  const [lmUrls, setLmUrls] = useState<string[]>(initialLm);
  const [lmIndex, setLmIndex] = useState(0);
  const lmCount = lmUrls.length;
  const currentLm = useMemo(
    () => (lmCount ? lmUrls[Math.min(lmIndex, lmCount - 1)] : null),
    [lmUrls, lmIndex, lmCount]
  );
  const [reportDetails, setReportDetails] = useState<ReportDetails | null>(
    null
  );
  const [viewer, setViewer] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  // Keep local urls in sync if modal item changes
  useEffect(() => {
    setLmUrls(initialLm);
    setLmIndex(0);
  }, [item, initialLm]);

  // Prevent scroll snapping; lock scroll without changing position
  useLayoutEffect(() => {
    const body = document.body;
    body.classList.add("modal-open");
    const prevOverflow = body.style.overflow;
    const prevOverscroll = (body.style as any).overscrollBehaviorY || "";
    body.style.overflow = "hidden";
    (body.style as any).overscrollBehaviorY = "contain";
    return () => {
      body.classList.remove("modal-open");
      body.style.overflow = prevOverflow;
      (body.style as any).overscrollBehaviorY = prevOverscroll;
    };
  }, []);

  // Fallback: if landmark urls are missing on alerts, look up the matching report by photo_path
  useEffect(() => {
    if (!item || !isAlert) return;
    if (lmUrls.length > 0) return;
    const imageUrl = item.alert.imageUrl;
    if (!imageUrl) return;
    fetchLandmarkImageUrlsByAlertImage(imageUrl).then((urls) => {
      if (Array.isArray(urls) && urls.length > 0) setLmUrls(urls);
    });
  }, [isAlert, lmUrls.length, item]);

  // Load richer details from the reports table using the alert linkage
  useEffect(() => {
    if (!item || !isAlert) return;
    setReportDetails(null);
    fetchReportDetailsForAlert(item.alert.id)
      .then((d) => {
        if (d?.landmarkUrls?.length) {
          setLmUrls((prev) => (prev.length ? prev : d.landmarkUrls));
        }
        setReportDetails(d);
      })
      .catch(() => {});
  }, [isAlert, item]);

  // Keyboard support for fullscreen viewer
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewer(null);
      } else if (e.key === "ArrowLeft" && viewer.urls.length > 1) {
        e.preventDefault();
        setViewer((v) =>
          v ? { ...v, index: (v.index - 1 + v.urls.length) % v.urls.length } : v
        );
      } else if (e.key === "ArrowRight" && viewer.urls.length > 1) {
        e.preventDefault();
        setViewer((v) =>
          v ? { ...v, index: (v.index + 1) % v.urls.length } : v
        );
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewer]);

  // While the modal is open, keep the URL hash stable to avoid jumping back
  // to other sections due to scroll observers updating the hash.
  useEffect(() => {
    if (!item) return;
    let raf = 0;
    const desiredHash =
      (typeof window !== "undefined" && window.location.hash) || "#alerts";
    const keepHash = () => {
      try {
        if (
          typeof document !== "undefined" &&
          document.body.classList.contains("modal-open") &&
          typeof window !== "undefined" &&
          window.location.hash !== desiredHash
        ) {
          history.replaceState(null, "", desiredHash);
        }
      } catch {}
      raf = requestAnimationFrame(keepHash);
    };
    raf = requestAnimationFrame(keepHash);
    return () => {
      try {
        if (raf) cancelAnimationFrame(raf);
      } catch {}
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-soft surface max-h-[90vh] flex flex-col overflow-hidden">
        <div
          className="flex items-center justify-between border-b p-5"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div>
            <h3 className="text-lg font-semibold ink-heading">
              {isAlert
                ? `Reported Pet - ${item.alert.type.toUpperCase()}`
                : `Adoption - ${item.adoption.name}`}
            </h3>
            {isAlert ? (
              <p className="text-sm ink-muted">
                {timeAgoFromMinutes(item.alert.minutes)} {" · "}{" "}
                {item.alert.area}
              </p>
            ) : (
              <p className="text-sm ink-muted">{item.adoption.location}</p>
            )}
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

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-1">
              {isAlert ? (
                item.alert.imageUrl ? (
                  isVideoUrl(item.alert.imageUrl) ? (
                    <video
                      src={item.alert.imageUrl}
                      className="h-40 w-full sm:max-w-[200px] rounded-xl object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.alert.imageUrl}
                      alt="alert"
                      className="h-40 w-full sm:max-w-[200px] rounded-xl object-cover cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewer({
                          urls: [item.alert.imageUrl as string],
                          index: 0,
                        });
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  )
                ) : (
                  <div
                    className="grid h-40 w-full sm:max-w-[200px] place-content-center rounded-xl text-5xl"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                    }}
                  >
                    {item.alert.emoji}
                  </div>
                )
              ) : item.adoption.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.adoption.imageUrl}
                  alt="adoption"
                  className="h-40 w-full sm:max-w-[200px] rounded-xl object-cover cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.adoption.imageUrl) {
                      window.open(
                        item.adoption.imageUrl as string,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }
                  }}
                  loading="lazy"
                  decoding="async"
                />
              ) : item.adoption.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.adoption.imageUrl}
                  alt="adoption"
                  className="h-40 w-full sm:max-w-[200px] rounded-xl object-cover cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewer({
                      urls: [item.adoption.imageUrl as string],
                      index: 0,
                    });
                  }}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div
                  className="grid h-40 w-full sm:max-w-[200px] place-content-center rounded-xl text-5xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                  }}
                >
                  {item.adoption.emoji}
                </div>
              )}

              {/* Landmark carousel (same size) */}
              {isAlert && lmCount > 0 && (
                <div className="relative mt-3 h-40 w-full sm:max-w-[200px]">
                  {currentLm &&
                    (isVideoUrl(currentLm) ? (
                      <video
                        src={currentLm}
                        className="h-full w-full object-cover rounded-xl"
                        controls
                        playsInline
                      />
                    ) : (
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
                            urls: lmUrls,
                            index: Math.min(lmIndex, lmCount - 1),
                          });
                        }}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
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

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {isAlert ? (
                <>
                  <DetailsRow
                    label="Report ID"
                    value={reportDetails?.custom_id || "-"}
                  />

                  <DetailsRow
                    label="Pet Type / Breed"
                    value={
                      [reportDetails?.species, reportDetails?.breed]
                        .filter(Boolean)
                        .join(" / ") || "-"
                    }
                  />
                  <DetailsRow
                    label="Gender / Age"
                    value={
                      [reportDetails?.gender, reportDetails?.age_size]
                        .filter(Boolean)
                        .join(" / ") || "-"
                    }
                  />

                  <DetailsRow label="Report Status" value={item.alert.status} />
                  <DetailsRow
                    label="Pet Status"
                    value={fmtPetStatus(item.alert.petStatus)}
                  />
                  <DetailsRow
                    label="Distinctive Features"
                    value={reportDetails?.features || "-"}
                  />

                  <DetailsRow label="Location" value={item.alert.area} />
                  <DetailsRow
                    label="Time"
                    value={timeAgoFromMinutes(item.alert.minutes)}
                  />

                  <DetailsRow
                    label="Reporter Notes"
                    value={reportDetails?.description || "-"}
                  />
                </>
              ) : (
                <>
                  <DetailsRow label="Name" value={item.adoption.name} />
                  <DetailsRow
                    label="Kind"
                    value={item.adoption.kind.toUpperCase()}
                  />
                  <DetailsRow
                    label="Pet Status"
                    value={fmtPetStatus(item.adoption.petStatus)}
                  />
                  <DetailsRow label="Age" value={item.adoption.age} />
                  <DetailsRow label="Notes" value={item.adoption.note} />
                  <DetailsRow label="Location" value={item.adoption.location} />
                </>
              )}
            </div>
          </div>
          {/*
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary px-4 py-2" type="button">
              Contact Reporter
            </button>
            <button className="btn btn-accent px-4 py-2" type="button">
              Emergency Hotline
            </button>
            {isAlert &&
              (() => {
                const link = getMapsLink(item.alert);
                return link ? (
                  <a
                    className="btn px-4 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps
                  </a>
                ) : null;
              })()}
          </div>

          */}
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
            {isVideoUrl(
              viewer.urls[Math.min(viewer.index, viewer.urls.length - 1)]
            ) ? (
              <video
                src={viewer.urls[Math.min(viewer.index, viewer.urls.length - 1)]}
                className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
                controls
                playsInline
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewer.urls[Math.min(viewer.index, viewer.urls.length - 1)]}
                alt="Full size"
                className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DetailsModal({
  item,
  onClose,
  timeAgoFromMinutes,
  getMapsLink,
}: DetailsModalProps) {
  if (!item) return null;
  const node = (
    <DetailsModalInner
      item={item}
      onClose={onClose}
      timeAgoFromMinutes={timeAgoFromMinutes}
      getMapsLink={getMapsLink}
    />
  );
  if (typeof document !== "undefined") {
    return createPortal(node, document.body);
  }
  return node;
}
