"use client";

import { AdoptionPet } from "@/types/app";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

type AdoptionSectionProps = {
  adoptionResults: AdoptionPet[];
  adoptionFilter: "all" | "dog" | "cat";
  setAdoptionFilter: (value: "all" | "dog" | "cat") => void;
  adoptionSort: "nearest" | "newest";
  setAdoptionSort: (value: "nearest" | "newest") => void;
};

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
    background: "radial-gradient(circle at 50% 50%, #F3F4F6 0%, #E5E7EB 100%)",
    color: "#4A55C2",
  } as const;
}

export function AdoptionSection({ adoptionResults }: AdoptionSectionProps) {
  async function goOrPrompt(to: string) {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("auth:postLoginRedirect", to);
          }
        } catch {}
        showToast(
          "success",
          "Please sign in to start an adoption application.",
        );
        try {
          window.dispatchEvent(
            new CustomEvent("app:signin", { detail: { mode: "login" } }),
          );
        } catch {}
        return;
      }
      window.location.href = to;
    } catch {
      // Fallback to navigation if auth fails to initialize for some reason
      window.location.href = to;
    }
  }
  return (
    <section
      id="adoption"
      data-onboard="adoption-section"
      className="mx-auto mt-23 mb-10 max-w-screen-2xl px-4 sm:px-6 lg:px-8 scroll-mt-23 snap-start overflow-hidden"
    >
      <div
        className=" rounded-2xl p-2 shadow-soft lg:h-[80vh]"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, color-mix(in srgb, #F57C00 60%, white 85%) 0%, color-mix(in srgb, #F57C00 80%, white 45%) 35%, #F57C00 65%, color-mix(in srgb, #F57C00 95%, black 10%) 100%)",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 items-stretch h-full">
          {/* Left: header + grid of small cards */}
          <div className="lg:col-span-2 min-h-[420px] flex flex-col">
            <div className="px-6 pt-4 pb-6 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <HeartHandshake
                    size={45}
                    strokeWidth={2.5}
                    className="shrink-0"
                  />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide">
                      ADOPTION
                    </h2>
                    <p className="opacity-90">
                      Browse rescued animals looking for a home.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="pill px-4 py-2 text-sm sm:text-base font-semibold whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    border: "1px solid var(--border-color)",
                    background: "var(--white)",
                    color: "#F57C00",
                    boxShadow:
                      "0 8px 16px -10px color-mix(in srgb, #F57C00 45%, transparent)",
                  }}
                  onClick={() => {
                    try {
                      window.dispatchEvent(
                        new CustomEvent("app:find-my-match"),
                      );
                    } catch {}
                  }}
                >
                  Find my match
                </button>
              </div>
            </div>
            <div className="px-6  flex-1 flex flex-col">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                {adoptionResults.slice(0, 9).map((pet) => (
                  <Link
                    key={pet.id}
                    href={`/adopt/${pet.id}`}
                    className="text-left rounded-2xl bg-white shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      border: `1px solid color-mix(in srgb, #F57C00 25%, white)`,
                      boxShadow: `0 12px 20px -12px color-mix(in srgb, #F57C00 40%, transparent)`,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      goOrPrompt(`/adopt/${pet.id}`);
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
                          : (pet.kind?.toUpperCase?.() ?? "")}
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
                {/* Fillers if fewer than 9 */}
                {Array.from({
                  length: Math.max(0, 9 - Math.min(9, adoptionResults.length)),
                }).map((_, idx) => (
                  <div
                    key={`ph-${idx}`}
                    className="rounded-2xl bg-white/20 border border-dashed shadow-soft"
                    style={{
                      borderColor: `color-mix(in srgb, #F57C00 35%, white)`,
                    }}
                  >
                    <div className="p-3">
                      <div className="relative rounded-xl overflow-hidden mb-2 h-28 sm:h-32"></div>
                      <div className="font-semibold text-[13px] sm:text-sm leading-5 truncate text-black/50">
                        &nbsp;
                      </div>
                      <div className="text-xs truncate text-black/30">
                        &nbsp;
                      </div>
                    </div>
                  </div>
                ))}
                {/* More tile */}
                <Link
                  href="/adopt"
                  className="text-left rounded-2xl bg-white shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    border: `1px solid color-mix(in srgb, #F57C00 25%, white)`,
                    boxShadow: `0 12px 20px -12px color-mix(in srgb, #F57C00 40%, transparent)`,
                  }}
                >
                  <div className="p-3 text-center">
                    <div className="rounded-xl overflow-hidden mb-2">
                      <div className="grid place-content-center h-28 sm:h-32 rounded-xl bg-gray-300 text-2xl sm:text-3xl text-gray-600">
                        ...
                      </div>
                    </div>
                    <div className="font-semibold tracking-wide">MORE</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: hero illustration */}
          <div className="hidden lg:block items-center justify-end pl-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Adopt Illustration.webp"
              alt="Adoption illustration"
              loading="lazy"
              decoding="async"
              className="p-2 max-w-[90%] h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
