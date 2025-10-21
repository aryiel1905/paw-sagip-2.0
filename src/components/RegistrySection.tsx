import { Dispatch, SetStateAction } from "react";

type RegistrySectionProps = {
  showPetProfile: boolean;
  setShowPetProfile: Dispatch<SetStateAction<boolean>>;
};

export function RegistrySection({
  showPetProfile,
  setShowPetProfile,
}: RegistrySectionProps) {
  return (
    <section
      id="registry"
      className="mx-auto mt-21 max-w-screen-2xl px-4 sm:px-6 lg:px-8 scroll-mt-23 snap-start"
      style={{ scrollMarginTop: 92 }}
    >
      <div className="mb-30 grid gap-6 lg:grid-cols-2">
        <div className=" surface rounded-2xl p-6 shadow-soft h-[83vh]">
          <h2 className="text-2xl font-extrabold tracking-tight ink-heading">
            Pet Registry
          </h2>
          <p className="ink-muted">
            Scan a QR or microchip to view a pet profile.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              className="btn btn-primary px-5 py-3"
              onClick={() => setShowPetProfile(true)}
              type="button"
            >
              Mock Scan
            </button>
            <button
              className="btn px-5 py-3"
              style={{ border: "1px solid var(--border-color)" }}
              type="button"
            >
              Register a Pet
            </button>
          </div>
        </div>
        <div
          className={`surface rounded-2xl p-6 shadow-soft ${
            showPetProfile ? "block" : "hidden"
          }`}
        >
          <div className="flex gap-4">
            <div
              className="grid h-24 w-24 place-content-center rounded-xl text-3xl"
              style={{
                background:
                  "color-mix(in srgb, var(--primary-green) 20%, #fff)",
              }}
            >
              PR
            </div>
            <div>
              <h3 className="text-xl font-bold ink-heading">Max</h3>
              <p className="ink-muted">Aspin - 2 years - Vaccinated</p>
              <p className="mt-1">
                Owner:{" "}
                <a
                  className="underline"
                  href="#"
                  style={{ color: "var(--primary-green)" }}
                >
                  Juan Dela Cruz
                </a>
              </p>
              <p className="ink-subtle text-xs">
                Barangay 123 - Registry ID: BRG-123-0001
              </p>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary px-4 py-2" type="button">
                  Contact Owner
                </button>
                <button
                  className="btn px-4 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  type="button"
                >
                  Report Lost
                </button>
                <button
                  className="btn px-4 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  type="button"
                >
                  Update Info
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
