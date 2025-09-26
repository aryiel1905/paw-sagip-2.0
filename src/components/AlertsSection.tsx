/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { AlertType, Alert } from "@/types/app";
import { DetailsModal } from "@/components/DetailsModal";

type AlertsSectionProps = {
  filters: AlertType[];
  activeFilter: AlertType;
  onFilterChange: (filter: AlertType) => void;
  filteredAlerts: Alert[];
  myLat?: number | null;
  myLng?: number | null;
};

export function AlertsSection({
  filters,
  activeFilter,
  onFilterChange,
  filteredAlerts,
  myLat,
  myLng,
}: AlertsSectionProps) {
  // Human-friendly time formatter using minutes since creation
  const timeAgoFromMinutes = (minutes: number) => {
    const mins = Math.max(0, Math.floor(minutes));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
    const months = Math.floor(days / 30);
    if (months < 12)
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  };

  const kmDistance = (
    lat1?: number | null,
    lng1?: number | null,
    lat2?: number | null,
    lng2?: number | null
  ) => {
    if (
      lat1 == null ||
      lng1 == null ||
      lat2 == null ||
      lng2 == null ||
      Number.isNaN(lat1) ||
      Number.isNaN(lng1) ||
      Number.isNaN(lat2) ||
      Number.isNaN(lng2)
    )
      return null;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Shorten area similar to Nearby Alerts in the hero
  const shortArea = (area: string) => {
    if (!area) return "";
    const parts = area
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
    return parts[0] ?? area;
  };

  const getMapsLink = (a: Alert): string | null => {
    const lat = (a as any).latitude as number | undefined;
    const lng = (a as any).longitude as number | undefined;
    if (typeof lat === "number" && typeof lng === "number") {
      if (typeof myLat === "number" && typeof myLng === "number") {
        return `https://www.google.com/maps/dir/?api=1&origin=${myLat},${myLng}&destination=${lat},${lng}&travelmode=walking`;
      }
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    // No coordinates -> no link (avoid imprecise text search)
    return null;
  };
  const [selected, setSelected] = useState<Alert | null>(null);

  return (
    <section
      id="alerts"
      className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-23"
    >
      <div className="surface rounded-2xl p-6 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="px-1 text-2xl font-extrabold tracking-tight ink-heading">
            Alerts
          </h2>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1 sm:mt-0 w-full sm:w-auto">
            {filters.map((filter) => (
              <button
                key={filter}
                className={`pill px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm ${
                  activeFilter === filter ? "bg-[#2a9d8f] text-white" : ""
                }`}
                onClick={() => onFilterChange(filter)}
                style={{ border: "1px solid var(--border-color)" }}
                type="button"
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAlerts.length === 0 ? (
            <article className="surface rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="ink-muted">No alerts yet. Check back soon.</p>
              </div>
            </article>
          ) : (
            filteredAlerts.map((alert) => (
              <article key={alert.id} className="surface rounded-2xl p-4">
                <div className="flex items-center justify-start">
                  <div className="flex items-center gap-3">
                    {alert.imageUrl ? (
                      <img
                        src={alert.imageUrl}
                        alt="alert photo"
                        className="h-25 w-25 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="grid h-10 w-10 place-content-center rounded-xl text-xl"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                        }}
                      >
                        {alert.emoji}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold ink-heading">
                        {alert.title}
                      </h3>
                      <p className="text-sm ink-heading">
                        {(() => shortArea(alert.area))()}
                      </p>
                      <p className="text-xs ink-muted">
                        {timeAgoFromMinutes(alert.minutes)}
                        {(() => {
                          const d = kmDistance(
                            myLat,
                            myLng,
                            (alert as any).latitude as number | null,
                            (alert as any).longitude as number | null
                          );
                          if (d == null) return "";
                          if (alert.type === "found") {
                            return ` • ${d.toFixed(1)} km away`;
                          }
                          if (alert.type === "lost") {
                            return ` • last seen ${d.toFixed(1)} km away`;
                          }
                          return "";
                        })()}
                      </p>
                      <button
                        className="pill px-3 py-1 text-xs mt-2"
                        style={{ border: "1px solid var(--border-color)" }}
                        type="button"
                        onClick={() => setSelected(alert)}
                      >
                        More Details
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl shadow-soft surface">
            <div
              className="flex items-center justify-between border-b p-5"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div>
                <h3 className="text-lg font-semibold ink-heading">
                  Reported Pet — {selected.type.toUpperCase()}
                </h3>
                <p className="text-sm ink-muted">
                  {timeAgoFromMinutes(selected.minutes)} • {selected.area}
                </p>
              </div>
              <button
                className="pill px-3 py-1"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={() => setSelected(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-5 md:grid-cols-3">
                {/* Photo / Emoji */}
                <div className="md:col-span-1">
                  {selected.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imageUrl}
                      alt="reported pet"
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
                      {selected.emoji}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="md:col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="ink-subtle">Species / Breed</div>
                  <div className="ink-heading">—</div>

                  <div className="ink-subtle">Gender / Age</div>
                  <div className="ink-heading">—</div>

                  <div className="ink-subtle">Status</div>
                  <div className="ink-heading">{selected.type}</div>

                  <div className="ink-subtle">Distinctive Features</div>
                  <div className="ink-heading">—</div>

                  <div className="ink-subtle">Location</div>
                  <div className="ink-heading">{selected.area}</div>

                  <div className="ink-subtle">Time</div>
                  <div className="ink-heading">
                    {timeAgoFromMinutes(selected.minutes)}
                  </div>

                  <div className="ink-subtle">Reporter Notes</div>
                  <div className="ink-heading">—</div>

                  <div className="ink-subtle">Rescue Status</div>
                  <div className="ink-heading">—</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn btn-primary px-4 py-2" type="button">
                  Contact Reporter
                </button>
                <button className="btn btn-accent px-4 py-2" type="button">
                  Emergency Hotline
                </button>
                {(() => {
                  const link = getMapsLink(selected);
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
      )}
      <DetailsModal
        item={selected ? { kind: "alert", alert: selected } : null}
        onClose={() => setSelected(null)}
        timeAgoFromMinutes={timeAgoFromMinutes}
        getMapsLink={(a) => getMapsLink(a)}
      />
    </section>
  );
}
