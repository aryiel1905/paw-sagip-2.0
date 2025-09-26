import { Alert, AdoptionPet } from "@/types/app";

type ModalItem =
  | { kind: "alert"; alert: Alert }
  | { kind: "adoption"; adoption: AdoptionPet }
  | null;

type DetailsModalProps = {
  item: ModalItem;
  onClose: () => void;
  timeAgoFromMinutes: (m: number) => string;
  getMapsLink: (a: Alert) => string | null;
};

function DetailsRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="ink-subtle">{label}</div>
      <div className="ink-heading">{value || "-"}</div>
    </>
  );
}

export function DetailsModal({
  item,
  onClose,
  timeAgoFromMinutes,
  getMapsLink,
}: DetailsModalProps) {
  if (!item) return null;
  const isAlert = item.kind === "alert";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-soft surface">
        <div
          className="flex items-center justify-between border-b p-5"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div>
            <h3 className="text-lg font-semibold ink-heading">
              {isAlert
                ? `Reported Pet - ${item.alert.type.toUpperCase()}`
                : `Adoption - ${item.adoption.name}`}
            </h3>
            {isAlert ? (
              <p className="text-sm ink-muted">
                {timeAgoFromMinutes(item.alert.minutes)} {" · "} {item.alert.area}
              </p>
            ) : (
              <p className="text-sm ink-muted">{item.adoption.location}</p>
            )}
          </div>
          <button
            className="pill px-3 py-1"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-1">
              {isAlert ? (
                item.alert.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.alert.imageUrl}
                    alt="alert"
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
                    {item.alert.emoji}
                  </div>
                )
              ) : (
                <div
                  className="grid h-32 w-full max-w-[180px] place-content-center rounded-xl text-4xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                  }}
                >
                  {item.adoption.emoji}
                </div>
              )}
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {isAlert ? (
                <>
                  <DetailsRow label="Species / Breed" value="-" />
                  <DetailsRow label="Gender / Age" value="-" />

                  <DetailsRow label="Status" value={item.alert.type} />
                  <DetailsRow label="Distinctive Features" value="-" />

                  <DetailsRow label="Location" value={item.alert.area} />
                  <DetailsRow
                    label="Time"
                    value={timeAgoFromMinutes(item.alert.minutes)}
                  />

                  <DetailsRow label="Reporter Notes" value="-" />
                  <DetailsRow label="Rescue Status" value="-" />
                </>
              ) : (
                <>
                  <DetailsRow label="Name" value={item.adoption.name} />
                  <DetailsRow label="Kind" value={item.adoption.kind.toUpperCase()} />
                  <DetailsRow label="Age" value={item.adoption.age} />
                  <DetailsRow label="Notes" value={item.adoption.note} />
                  <DetailsRow label="Location" value={item.adoption.location} />
                </>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary px-4 py-2" type="button">
              Contact Reporter
            </button>
            <button className="btn btn-accent px-4 py-2" type="button">
              Emergency Hotline
            </button>
            {isAlert && (() => {
              const link = getMapsLink(item.alert);
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
  );
}

