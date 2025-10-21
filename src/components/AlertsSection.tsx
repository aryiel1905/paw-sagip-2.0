"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Alert } from "@/types/app";
import { DetailsModal } from "@/components/DetailsModal";
import { MapPin, Search, AlertTriangle } from "lucide-react";

type AlertsSectionProps = {
  alerts: Alert[];
};

export function AlertsSection({ alerts }: AlertsSectionProps) {
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
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return null;
  };

  const [selected, setSelected] = useState<Alert | null>(null);

  const grouped = useMemo(() => {
    const take = (t: "found" | "lost" | "cruelty") =>
      alerts.filter((a) => a.type === t);
    return {
      found: take("found"),
      lost: take("lost"),
      cruelty: take("cruelty"),
    };
  }, [alerts]);

  return (
    <section
      id="alerts"
      className="relative  scroll-mt-23 snap-start w-full "
      style={{ scrollMarginTop: 63 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 items-stretch h-[91vh]">
        {(
          [
            {
              key: "found" as const,
              title: "FOUND",
              description: "View reports of rescued or sighted pets.",
              base: "#2A9D8F",
              items: grouped.found,
              icon: MapPin,
            },
            {
              key: "lost" as const,
              title: "LOST",
              description: "See all active missing pet reports.",
              base: "#6B6B6B",
              items: grouped.lost,
              icon: Search,
            },
            {
              key: "cruelty" as const,
              title: "CRUELTY",
              description: "Check submitted animal cruelty cases.",
              base: "#F57C00",
              items: grouped.cruelty,
              icon: AlertTriangle,
            },
          ] as const
        ).map((col) => (
          <div
            key={col.key}
            className="min-h-[420px] flex flex-col"
            style={{
              background: `radial-gradient(circle at 50% 55%, color-mix(in srgb, ${col.base} 60%, white 85%) 0%, color-mix(in srgb, ${col.base} 80%, white 45%) 35%, ${col.base} 65%, color-mix(in srgb, ${col.base} 95%, black 10%) 100%)`,
            }}
          >
            <div className="px-6 pt-12 pb-4 text-white">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = col.icon;
                  return (
                    <Icon size={45} strokeWidth={2.5} className="shrink-0" />
                  );
                })()}
                <div>
                  <h3 className="text-3xl font-extrabold tracking-wide">
                    {col.title}
                  </h3>
                  <p className="opacity-90">{col.description}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-2 flex-1 flex flex-col">
              {col.items.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={`ph-${col.key}-${idx}`}
                      className="rounded-2xl bg-white/20 border border-dashed shadow-soft"
                      style={{
                        borderColor: `color-mix(in srgb, ${col.base} 35%, white)`,
                      }}
                    >
                      <div className="p-3">
                        <div className="relative rounded-xl overflow-hidden mb-2 h-28"></div>
                        <div className="font-semibold text-sm truncate text-black/50">
                          &nbsp;
                        </div>
                        <div className="text-xs truncate text-black/30">
                          &nbsp;
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {col.items.slice(0, 6).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        if (typeof document !== "undefined") {
                          document.body.classList.add("modal-open");
                        }
                        setSelected(alert);
                      }}
                      className="text-left rounded-2xl bg-white shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        border: `1px solid color-mix(in srgb, ${col.base} 25%, white)`,
                        boxShadow: `0 12px 20px -12px color-mix(in srgb, ${col.base} 40%, transparent)`,
                      }}
                    >
                      <div className="p-3">
                        <div className="rounded-xl overflow-hidden mb-2">
                          {alert.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={alert.imageUrl}
                            alt="alert"
                            className="w-full h-28 object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          ) : (
                            <div
                              className="grid place-content-center h-28 text-3xl"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                              }}
                            >
                              {alert.emoji}
                            </div>
                          )}
                        </div>
                        <div className="font-semibold text-sm truncate text-black">
                          {alert.title}
                        </div>
                        <div className="text-xs truncate text-black/70">
                          {shortArea(alert.area)}
                        </div>
                      </div>
                    </button>
                  ))}
                  {Array.from({
                    length: Math.max(0, 6 - Math.min(6, col.items.length)),
                  }).map((_, idx) => (
                    <div
                      key={`ph-${col.key}-${idx}`}
                      className="rounded-2xl bg-[white/80] border border-dashed shadow-soft"
                      style={{
                        borderColor: `color-mix(in srgb, ${col.base} 35%, white)`,
                      }}
                    >
                      <div className="p-3">
                        <div className="relative rounded-xl overflow-hidden mb-2 h-28"></div>
                        <div className="font-semibold text-sm truncate text-black/50">
                          &nbsp;
                        </div>
                        <div className="text-xs truncate text-black/30">
                          &nbsp;
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5">
                <a
                  href={`/alerts?type=${col.key}`}
                  className="btn w-full py-3 text-center block font-semibold rounded-full transition-colors duration-300 ease-in-out bg-white text-[var(--btn-accent)] border-2 border-[var(--btn-accent)] hover:bg-[var(--btn-accent)] hover:text-white hover:border-white focus-visible:bg-[var(--btn-accent)] focus-visible:text-white focus-visible:border-white"
                  style={{
                    ["--btn-accent" as any]: col.base,
                    boxShadow: `0 10px 18px -12px color-mix(in srgb, ${col.base} 55%, transparent)`,
                  } as React.CSSProperties}
                >
                  View More
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
      <DetailsModal
        item={selected ? { kind: "alert", alert: selected } : null}
        onClose={() => setSelected(null)}
        timeAgoFromMinutes={timeAgoFromMinutes}
        getMapsLink={(a) => getMapsLink(a)}
      />
    </section>
  );
}
