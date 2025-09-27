"use client";

import { Alert, AdoptionPet } from "@/types/app";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type ModalItem =
  | { kind: "alert"; alert: Alert }
  | { kind: "adoption"; adoption: AdoptionPet }
  | null;

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
  if (!item) return null;
  const isAlert = item.kind === "alert";
  const initialLm = isAlert ? item.alert.landmarkImageUrls ?? [] : [];
  const [lmUrls, setLmUrls] = useState<string[]>(initialLm);
  const [lmIndex, setLmIndex] = useState(0);
  const lmCount = lmUrls.length;
  const currentLm = useMemo(
    () => (lmCount ? lmUrls[Math.min(lmIndex, lmCount - 1)] : null),
    [lmUrls, lmIndex, lmCount]
  );

  // Keep local urls in sync if modal item changes
  useEffect(() => {
    setLmUrls(initialLm);
    setLmIndex(0);
  }, [item, initialLm]);

  // Fallback: if landmark urls are missing on alerts, look up the matching report by photo_path
  useEffect(() => {
    if (!isAlert) return;
    if (lmUrls.length > 0) return;
    const imageUrl = item.alert.imageUrl;
    if (!imageUrl) return;
    const marker = "/storage/v1/object/public/";
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;
    const rest = imageUrl.slice(idx + marker.length); // <bucket>/<path>
    const slash = rest.indexOf("/");
    if (slash === -1) return;
    const bucket = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    if (!path) return;

    const supabase = getSupabaseClient();
    supabase
      .from("reports")
      .select("landmark_media_paths")
      .eq("photo_path", path)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return;
        const arr = (data?.landmark_media_paths ?? []) as string[];
        if (Array.isArray(arr) && arr.length > 0) {
          const urls = arr
            .filter(Boolean)
            .map((p) => supabase.storage.from(bucket).getPublicUrl(p).data.publicUrl);
          setLmUrls(urls);
        }
      })
      .catch(() => {});
  }, [isAlert, lmUrls.length, item]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-soft surface">
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
                {timeAgoFromMinutes(item.alert.minutes)} {" · "} {item.alert.area}
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

        <div className="p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-1">
              {isAlert ? (
                item.alert.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.alert.imageUrl}
                    alt="alert"
                    className="h-32 w-full max-w-[180px] rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="grid h-32 w-full max-w-[180px] place-content-center rounded-xl text-4xl"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                    }}
                  >
                    {item.alert.emoji}
                  </div>
                )
              ) : (
                <div
                  className="grid h-32 w-full max-w-[180px] place-content-center rounded-xl text-4xl"
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
                <div className="relative mt-3 h-32 w-full max-w-[180px]">
                  {currentLm && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentLm}
                      alt={`landmark ${Math.min(lmIndex + 1, lmCount)} of ${lmCount}`}
                      className="h-full w-full object-cover rounded-xl"
                    />
                  )}
                  {lmCount > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous landmark"
                        className="absolute left-2 top-1/2 -translate-y-1/2 pill px-3 py-1 text-xs shadow-soft"
                        style={{ background: "var(--white)", border: "1px solid var(--border-color)" }}
                        onClick={() => setLmIndex((i) => (i - 1 + lmCount) % lmCount)}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        aria-label="Next landmark"
                        className="absolute right-2 top-1/2 -translate-y-1/2 pill px-3 py-1 text-xs shadow-soft"
                        style={{ background: "var(--white)", border: "1px solid var(--border-color)" }}
                        onClick={() => setLmIndex((i) => (i + 1) % lmCount)}
                      >
                        ▶
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

            <div className="md:col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {isAlert ? (
                <>
                  <DetailsRow label="Species / Breed" value="-" />
                  <DetailsRow label="Gender / Age" value="-" />

                  <DetailsRow label="Status" value={item.alert.type} />
                  <DetailsRow label="Distinctive Features" value="-" />

                  <DetailsRow label="Location" value={item.alert.area} />
                  <DetailsRow
                    label="Time"
                    value={timeAgoFromMinutes(item.alert.minutes)}
                  />

                  <DetailsRow label="Reporter Notes" value="-" />
                  <DetailsRow label="Rescue Status" value="-" />
                </>
              ) : (
                <>
                  <DetailsRow label="Name" value={item.adoption.name} />
                  <DetailsRow label="Kind" value={item.adoption.kind.toUpperCase()} />
                  <DetailsRow label="Age" value={item.adoption.age} />
                  <DetailsRow label="Notes" value={item.adoption.note} />
                  <DetailsRow label="Location" value={item.adoption.location} />
                </>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary px-4 py-2" type="button">
              Contact Reporter
            </button>
            <button className="btn btn-accent px-4 py-2" type="button">
              Emergency Hotline
            </button>
            {isAlert && (() => {
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
        </div>
      </div>
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
  return (
    <DetailsModalInner
      item={item}
      onClose={onClose}
      timeAgoFromMinutes={timeAgoFromMinutes}
      getMapsLink={getMapsLink}
    />
  );
}
