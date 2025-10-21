"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertType } from "@/types/app";
import { fetchAlertsPaged } from "@/data/supabaseApi";
import { DetailsModal } from "@/components/DetailsModal";
import { ArrowLeft } from "lucide-react";

const PAGE_SIZE = 60;

function timeAgoFromMinutes(minutes: number) {
  const mins = Math.max(0, Math.floor(minutes));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function shortArea(area: string) {
  if (!area) return "";
  const parts = area
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return parts[0] ?? area;
}

function typeToAccent(t: AlertType | null | undefined): string {
  switch (t) {
    case "found":
      return "#2A9D8F";
    case "lost":
      return "#6B6B6B";
    case "cruelty":
      return "#F57C00";
    default:
      return "var(--primary-green)";
  }
}

function resolveTitle(t: AlertType | null | undefined) {
  return t === "found" || t === "lost" || t === "cruelty"
    ? t.toUpperCase()
    : "ALL ALERTS";
}

function gradientForAccent(base: string) {
  return `radial-gradient(circle at 50% 55%, color-mix(in srgb, ${base} 60%, white 85%) 0%, color-mix(in srgb, ${base} 80%, white 45%) 35%, ${base} 65%, color-mix(in srgb, ${base} 95%, black 10%) 100%)`;
}

function buildPages(current: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const show = new Set<number>();
  show.add(1);
  show.add(2);
  show.add(totalPages);
  show.add(totalPages - 1);
  show.add(current);
  show.add(current - 1);
  show.add(current + 1);
  const arr = Array.from(show)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  for (let i = 0; i < arr.length; i++) {
    pages.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] !== arr[i] + 1) pages.push("…");
  }
  return pages;
}

export default function AlertsBrowse() {
  const router = useRouter();
  const params = useSearchParams();
  const type = (params.get("type") as AlertType | null) ?? "all";
  const pageParam = Number(params.get("page") || "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [items, setItems] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Alert | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const accent = typeToAccent(type);
  const title = resolveTitle(type);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      controllerRef.current?.abort();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      const { items: list, total: t } = await fetchAlertsPaged(
        type,
        page,
        PAGE_SIZE,
        { signal: ctrl.signal }
      );
      setItems(list);
      setTotal(t);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [type, page]);

  useEffect(() => {
    fetchPage();
    // Cleanup on unmount
    return () => {
      try {
        controllerRef.current?.abort();
      } catch {}
    };
  }, [fetchPage]);

  const pages = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: gradientForAccent(accent) }}
    >
      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pt-10 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            className="pill px-3 py-1 flex items-center gap-2"
            style={{
              border: "1px solid var(--border-color)",
              background: "var(--white)",
            }}
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/#alerts");
              }
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <h1 className="text-[#ffffff] text-3xl font-extrabold mb-1 tracking-wide">
          {title}
        </h1>
        <p className="text-[#ffffff] mb-6">
          {loading
            ? "Loading alerts…"
            : total > 0
            ? `${total} report${total === 1 ? "" : "s"} found`
            : "No alerts found"}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {loading && items.length === 0
            ? Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={`ph-${idx}`}
                  className="rounded-2xl bg-white/70 border border-dashed shadow-soft"
                  style={{
                    borderColor: `color-mix(in srgb, ${accent} 35%, white)`,
                  }}
                >
                  <div className="p-3">
                    <div className="relative rounded-xl overflow-hidden mb-2 h-28" />
                    <div className="font-semibold text-sm truncate text-black/50">
                      &nbsp;
                    </div>
                    <div className="text-xs truncate text-black/30">&nbsp;</div>
                  </div>
                </div>
              ))
            : items.map((alert) => (
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
                    border: `1px solid color-mix(in srgb, ${accent} 25%, white)`,
                    boxShadow: `0 12px 20px -12px color-mix(in srgb, ${accent} 40%, transparent)`,
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
                    <div className="text-xs text-black/50">
                      {timeAgoFromMinutes(alert.minutes)}
                    </div>
                  </div>
                </button>
              ))}
        </div>

        {totalPages > 1 && (
          <nav
            className="mt-8 flex items-center justify-center gap-2"
            aria-label="Pagination"
          >
            {/* Prev */}
            <Link
              href={{
                pathname: "/alerts",
                query: { type, page: Math.max(1, page - 1) },
              }}
              className="pill px-3 py-1"
              style={{ border: "1px solid var(--border-color)" }}
              aria-disabled={page <= 1}
              aria-label="Previous page"
            >
              Prev
            </Link>

            {/* Pages */}
            {pages.map((p, idx) =>
              typeof p === "number" ? (
                <Link
                  key={`p-${p}-${idx}`}
                  href={{ pathname: "/alerts", query: { type, page: p } }}
                  className="pill px-3 py-1"
                  style={{
                    border: `1px solid var(--border-color)`,
                    background: p === page ? "var(--white)" : undefined,
                    color: p === page ? accent : undefined,
                  }}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </Link>
              ) : (
                <span key={`dots-${idx}`} className="px-2 select-none">
                  {p}
                </span>
              )
            )}

            {/* Next */}
            <Link
              href={{
                pathname: "/alerts",
                query: { type, page: Math.min(totalPages, page + 1) },
              }}
              className="pill px-3 py-1"
              style={{ border: "1px solid var(--border-color)" }}
              aria-disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next
            </Link>
          </nav>
        )}

        <DetailsModal
          item={selected ? { kind: "alert", alert: selected } : null}
          onClose={() => setSelected(null)}
          timeAgoFromMinutes={timeAgoFromMinutes}
          getMapsLink={() => null}
        />
      </main>
    </div>
  );
}
