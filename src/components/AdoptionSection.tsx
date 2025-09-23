import { AdoptionPet } from "@/types/app";

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
                className="surface rounded-2xl p-4 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-12 w-12 place-content-center rounded-xl text-2xl"
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
                      {pet.kind.toUpperCase()} - {pet.age} - {pet.note}
                    </p>
                    <p className="ink-subtle text-xs">{pet.location}</p>
                  </div>
                </div>
                <button
                  className="btn mt-3 w-full"
                  style={{ border: "1px solid var(--border-color)" }}
                  type="button"
                >
                  Adopt {"->"}
                </button>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
