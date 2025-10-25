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
      className="mx-auto mt-23 mb-10 max-w-screen-2xl px-4 sm:px-6 lg:px-8 scroll-mt-23 snap-start overflow-hidden"
    >
      <div
        className=" rounded-2xl p-2 shadow-soft h-[80vh]"
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
                  size={45}
                  strokeWidth={2.5}
                  className="shrink-0"
                />
                <div>
                  <h2 className="text-3xl font-extrabold tracking-wide">
                    ADOPTION
                  </h2>

                  <p className="opacity-90">
                    Browse rescued animals looking for a home.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6  flex-1 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {adoptionResults.slice(0, 9).map((pet) => (
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
                            loading="lazy"
                            decoding="async"
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
                      <div className="relative rounded-xl overflow-hidden mb-2 h-32"></div>
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
          <div className="hidden lg:block items-center justify-end pl-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Adopt Illustration.svg"
              alt="Adoption illustration"
              className="p-2 max-w-[90%] h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
