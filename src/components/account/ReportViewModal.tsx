"use client";

import { useEffect } from "react";

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
  loading,
  error,
  onClose,
}: {
  open: boolean;
  data: ReportViewData | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const body = document.body as HTMLBodyElement;
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [open, onClose]);

  if (!open) return null;

  const mapLink =
    data && typeof data.latitude === "number" && typeof data.longitude === "number"
      ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
      : null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl shadow-soft surface">
        <div
          className="flex items-center justify-between border-b p-5"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div>
            <h3 className="text-lg font-semibold ink-heading">
              Report — {data?.type?.toUpperCase() || ""}
            </h3>
            <p className="text-sm ink-muted">{data?.location || ""}</p>
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
            {loading ? (
              <div className="ink-muted text-sm">Loading details…</div>
            ) : error ? (
              <div className="ink-muted text-sm">{error}</div>
            ) : data?.mainUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.mainUrl}
                alt="report"
                className="h-40 w-full max-w-[220px] rounded-xl object-cover"
              />
            ) : (
              <div
                className="grid h-40 w-full max-w-[220px] place-content-center rounded-xl text-4xl"
                style={{ background: "var(--card-bg)" }}
              >
                🐾
              </div>
            )}

            {data && data.landmarkUrls?.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {data.landmarkUrls.slice(0, 6).map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${u}-${i}`}
                    src={u}
                    alt={`landmark ${i + 1}`}
                    className="h-16 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 grid gap-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="ink-subtle">Condition</div>
              <div className="ink-heading">{data?.condition || "-"}</div>
              <div className="ink-subtle">When</div>
              <div className="ink-heading">{data?.event_at || "-"}</div>
              <div className="ink-subtle">Species</div>
              <div className="ink-heading">{data?.species || "-"}</div>
              <div className="ink-subtle">Breed</div>
              <div className="ink-heading">{data?.breed || "-"}</div>
              <div className="ink-subtle">Gender</div>
              <div className="ink-heading">{data?.gender || "-"}</div>
              <div className="ink-subtle">Age/Size</div>
              <div className="ink-heading">{data?.age_size || "-"}</div>
              <div className="ink-subtle">Status</div>
              <div className="ink-heading">{data?.status || "-"}</div>
            </div>

            <div>
              <div className="ink-subtle text-sm mb-1">Features</div>
              <div className="ink-heading text-sm break-words">
                {data?.features || "-"}
              </div>
            </div>

            <div>
              <div className="ink-subtle text-sm mb-1">Description</div>
              <div className="ink-heading text-sm break-words">
                {data?.description || "-"}
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
              {data && data.is_anonymous ? null : data?.reporter_contact ? (
                <span className="pill px-3 py-1 text-xs" style={{ border: "1px solid var(--border-color)" }}>
                  Contact: {data.reporter_contact}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

