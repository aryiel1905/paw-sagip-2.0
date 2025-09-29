import { AdoptionPet } from "@/types/app";
import Link from "next/link";

type AdoptionSectionProps = {
  adoptionResults: AdoptionPet[];
  adoptionFilter: "all" | "dog" | "cat";
  setAdoptionFilter: (value: "all" | "dog" | "cat") => void;
  adoptionSort: "nearest" | "newest";
  setAdoptionSort: (value: "nearest" | "newest") => void;
};

export function AdoptionSection({
  adoptionResults,
  adoptionFilter,
  setAdoptionFilter,
  adoptionSort,
  setAdoptionSort,
}: AdoptionSectionProps) {
  return (
    <section
      id="adoption"
      className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-23"
    >
      <div className="surface rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight ink-heading">
              Adoption Center
            </h2>
            <p className="ink-muted">
              Browse rescued animals looking for a home.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="rounded-xl px-3 py-2"
              onChange={(event) =>
                setAdoptionFilter(event.target.value as "all" | "dog" | "cat")
              }
              style={{ border: "1px solid var(--border-color)" }}
              value={adoptionFilter}
            >
              <option value="all">All</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
            <select
              className="rounded-xl px-3 py-2"
              onChange={(event) =>
                setAdoptionSort(event.target.value as "nearest" | "newest")
              }
              style={{ border: "1px solid var(--border-color)" }}
              value={adoptionSort}
            >
              <option value="nearest">Nearest</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adoptionResults.length === 0 ? (
            <article className="surface rounded-2xl p-4 shadow-soft">
              <p className="ink-muted">No pets listed yet. Check back soon.</p>
            </article>
          ) : (
            adoptionResults.map((pet) => (
              <article
                key={pet.id}
                className="surface rounded-2xl p-0 overflow-hidden shadow-soft"
              >
                {/* Photo header (fallback to emoji banner) */}
                {pet.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pet.imageUrl}
                    alt={`${pet.name} photo`}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div
                    className="grid h-40 w-full place-content-center text-5xl"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary-green) 20%, #fff)",
                    }}
                  >
                    <span>{pet.emoji}</span>
                  </div>
                )}

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-10 w-10 place-content-center rounded-lg text-xl"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary-green) 20%, #fff)",
                      }}
                    >
                      {pet.emoji}
                    </div>
                    <div>
                      <h3 className="font-semibold ink-heading">{pet.name}</h3>
                      <p className="ink-muted text-sm">
                        {pet.kind.toUpperCase()} {pet.age ? `- ${pet.age}` : ""}
                        {pet.note ? ` - ${pet.note}` : ""}
                      </p>
                      <p className="ink-subtle text-xs">{pet.location}</p>
                    </div>
                  </div>
                  <Link
                    href={`/adopt/${pet.id}`}
                    className="btn btn-primary mt-3 w-full inline-block text-center"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    Adopt {"->"}
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
