import { AdoptionPet } from "@/types/app";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";

type AdoptionSectionProps = {
  adoptionResults: AdoptionPet[];
  adoptionFilter: "all" | "dog" | "cat";
  setAdoptionFilter: (value: "all" | "dog" | "cat") => void;
  adoptionSort: "nearest" | "newest";
  setAdoptionSort: (value: "nearest" | "newest") => void;
};

export function AdoptionSection({ adoptionResults }: AdoptionSectionProps) {
  return (
    <section
      id="adoption"
      className="mx-auto mt-30 mb-10 max-w-screen-2xl px-4 sm:px-6 lg:px-8 scroll-mt-23 snap-start"
    >
      <div
        className="surface rounded-2xl p-6 shadow-soft h-[80vh]"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, color-mix(in srgb, #F57C00 60%, white 85%) 0%, color-mix(in srgb, #F57C00 80%, white 45%) 35%, #F57C00 65%, color-mix(in srgb, #F57C00 95%, black 10%) 100%)",
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 items-stretch h-full">
          {/* Left: header + grid of small cards */}
          <div className="lg:col-span-2 min-h-[420px] flex flex-col">
            <div className="px-6 pt-4 pb-6 text-white">
              <div className="flex items-center gap-3">
                <HeartHandshake
                  size={35}
                  strokeWidth={2.5}
                  className="shrink-0"
                />
                <h2 className="text-3xl font-extrabold tracking-wide">
                  ADOPTION
                </h2>
              </div>
              <p className="mt-2 opacity-90">
                Browse rescued animals looking for a home.
              </p>
            </div>
            <div className="px-6 pb-6 flex-1 flex flex-col">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {adoptionResults.slice(0, 7).map((pet) => (
                  <Link
                    key={pet.id}
                    href={`/adopt/${pet.id}`}
                    className="text-left rounded-2xl bg-white shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      border: `1px solid color-mix(in srgb, #F57C00 25%, white)`,
                      boxShadow: `0 12px 20px -12px color-mix(in srgb, #F57C00 40%, transparent)`,
                    }}
                  >
                    <div className="p-3">
                      <div className="rounded-xl overflow-hidden mb-2">
                        {pet.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pet.imageUrl}
                            alt={`${pet.name} photo`}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div
                            className="grid place-content-center h-32 text-3xl"
                            style={{
                              background:
                                "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                            }}
                          >
                            {pet.emoji}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-sm truncate text-black">
                        {pet.kind.toUpperCase()}
                      </div>
                      <div className="text-xs truncate text-black/70">
                        {pet.age || pet.location || ""}
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Fillers if fewer than 7 */}
                {Array.from({
                  length: Math.max(0, 7 - Math.min(7, adoptionResults.length)),
                }).map((_, idx) => (
                  <div
                    key={`ph-${idx}`}
                    className="rounded-2xl bg-white/80 border border-dashed shadow-soft"
                    style={{
                      borderColor: `color-mix(in srgb, #F57C00 35%, white)`,
                    }}
                  >
                    <div className="p-3">
                      <div className="relative rounded-xl overflow-hidden mb-2 h-32">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `color-mix(in srgb, #F57C00 12%, white)`,
                          }}
                        />
                        <div
                          className="absolute inset-0 animate-shimmer"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                            backgroundSize: "200% 100%",
                          }}
                        />
                      </div>
                      <div className="font-semibold text-sm truncate text-black/50">
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
                      <div className="grid place-content-center h-32 rounded-xl bg-gray-300 text-3xl text-gray-600">
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
          <div className="hidden lg:block">
            <div className="h-full w-full grid place-items-center">
              <div className="w-[88%] h-[88%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Adopt Illustration.svg"
                  alt="Adoption illustration"
                  className="max-w-[85%] h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
