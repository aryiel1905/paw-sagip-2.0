"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdoptionPet } from "@/types/app";
import { fetchAdoptionPetsPaged } from "@/data/supabaseApi";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

const PAGE_SIZE = 60;
const ACCENT = "#F57C00";

function gradient(base: string) {
  return `radial-gradient(circle at 50% 55%, color-mix(in srgb, ${base} 60%, white 85%) 0%, color-mix(in srgb, ${base} 80%, white 45%) 35%, ${base} 65%, color-mix(in srgb, ${base} 95%, black 10%) 100%)`;
}

function petFallbackTheme(kind?: string | null) {
  const value = (kind || "").toLowerCase();
  if (value.includes("dog"))
    return {
      background:
        "radial-gradient(circle at 50% 50%, #F8ECD9 0%, #EED9C2 45%, #DDBC9F 100%)",
      color: "#8C4F22",
    } as const;
  if (value.includes("cat"))
    return {
      background:
        "radial-gradient(circle at 50% 50%, #FFF3C4 0%, #FFE08A 45%, #FFB74A 100%)",
      color: "#8C6B00",
    } as const;
  return {
    background:
      "radial-gradient(circle at 50% 50%, #F3F4F6 0%, #E5E7EB 100%)",
    color: "#4A55C2",
  } as const;
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

export default function AdoptionBrowse() {
  const router = useRouter();
  const params = useSearchParams();
  const pageParam = Number(params.get("page") || "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [items, setItems] = useState<AdoptionPet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      controllerRef.current?.abort();
      const ctrl = new AbortController();
      controllerRef.current = ctrl;
      const { items: list, total: t } = await fetchAdoptionPetsPaged(
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
  }, [page]);

  useEffect(() => {
    fetchPage();
    return () => {
      try {
        controllerRef.current?.abort();
      } catch {}
    };
  }, [fetchPage]);

  const pages = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  useEffect(() => {
    const shouldOpenMatcher = params.get("match") === "1";
    if (!shouldOpenMatcher) return;
    try {
      window.dispatchEvent(new CustomEvent("app:find-my-match"));
    } catch {}
  }, [params]);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: gradient(ACCENT) }}
    >
      <main className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 pt-10 pb-12">
        <div className="mb-4 flex items-center justify-between gap-3">
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
                router.push("/#adoption");
              }
            }}
          >
            {/* Left arrow using unicode to avoid extra icon import */}
            <span aria-hidden>←</span>
            Back
          </button>
          <button
            type="button"
            className="pill px-3 py-1 font-semibold"
            style={{
              border: "1px solid var(--border-color)",
              background: "var(--white)",
              color: ACCENT,
            }}
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent("app:find-my-match"));
              } catch {}
            }}
          >
            Find my match
          </button>
        </div>

        <h1 className="text-3xl font-extrabold text-[#ffffff] mb-1 tracking-wide">
          ADOPTION
        </h1>
        <p className="text-[#ffffff] mb-6">
          {loading
            ? "Loading pets…"
            : total > 0
            ? `${total} available pet${total === 1 ? "" : "s"}`
            : "No pets available"}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {loading && items.length === 0
            ? Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={`ph-${idx}`}
                  className="rounded-2xl bg-white/70 border border-dashed shadow-soft"
                  style={{
                    borderColor: `color-mix(in srgb, ${ACCENT} 35%, white)`,
                  }}
                >
                  <div className="p-3">
                    <div className="relative rounded-xl overflow-hidden mb-2 h-28 sm:h-32" />
                    <div className="font-semibold text-[13px] sm:text-sm leading-5 truncate text-black/50">
                      &nbsp;
                    </div>
                    <div className="text-xs truncate text-black/30">&nbsp;</div>
                  </div>
                </div>
              ))
            : items.map((pet) => (
                <Link
                  key={pet.id}
                  href={`/adopt/${pet.id}`}
                  className="text-left rounded-2xl bg-white shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    border: `1px solid color-mix(in srgb, ${ACCENT} 25%, white)`,
                    boxShadow: `0 12px 20px -12px color-mix(in srgb, ${ACCENT} 40%, transparent)`,
                  }}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const supabase = getSupabaseClient();
                      const { data } = await supabase.auth.getSession();
                      if (!data.session?.user) {
                        try {
                          if (typeof window !== "undefined") {
                            sessionStorage.setItem(
                              "auth:postLoginRedirect",
                              `/adopt/${pet.id}`
                            );
                          }
                        } catch {}
                        showToast(
                          "success",
                          "Please sign in to start an adoption application."
                        );
                        try {
                          window.dispatchEvent(
                            new CustomEvent("app:signin", {
                              detail: { mode: "login" },
                            })
                          );
                        } catch {}
                        return;
                      }
                      router.push(`/adopt/${pet.id}`);
                    } catch {
                      router.push(`/adopt/${pet.id}`);
                    }
                  }}
                >
                  <div className="p-3">
                    <div className="rounded-xl overflow-hidden mb-2">
                      {pet.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pet.imageUrl}
                          alt={`${pet.name} photo`}
                          className="w-full h-28 sm:h-32 object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="grid place-content-center h-28 sm:h-32 text-5xl sm:text-6xl"
                          style={petFallbackTheme(pet.kind)}
                        >
                          {pet.emoji}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-[13px] sm:text-sm leading-5 truncate text-black">
                      {pet.name?.trim()
                        ? pet.name
                        : pet.kind?.toUpperCase?.() ?? ""}
                    </div>
                    <div className="text-xs truncate text-black/70">
                      {(() => {
                        const breed = (pet.breed || "").toString().trim();
                        const sex = (pet.sex || "").toString().trim();
                        const ageSize = (pet.age || "").toString().trim();
                        const parts: string[] = [];
                        if (breed) parts.push(breed);
                        if (sex) parts.push(sex);
                        if (ageSize) parts.push(ageSize);
                        return parts.length > 0 ? parts.join(" / ") : "—";
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
        </div>

        {totalPages > 1 && (
          <nav
            className="mt-8 flex items-center justify-center gap-2"
            aria-label="Pagination"
          >
            <Link
              href={{
                pathname: "/adopt",
                query: { page: Math.max(1, page - 1) },
              }}
              className="pill px-3 py-1"
              style={{ border: "1px solid var(--border-color)" }}
              aria-disabled={page <= 1}
              aria-label="Previous page"
            >
              Prev
            </Link>

            {pages.map((p, idx) =>
              typeof p === "number" ? (
                <Link
                  key={`p-${p}-${idx}`}
                  href={{ pathname: "/adopt", query: { page: p } }}
                  className="pill px-3 py-1"
                  style={{
                    border: `1px solid var(--border-color)`,
                    background: p === page ? "var(--white)" : undefined,
                    color: p === page ? ACCENT : undefined,
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

            <Link
              href={{
                pathname: "/adopt",
                query: { page: Math.min(totalPages, page + 1) },
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
      </main>

    </div>
  );
}
