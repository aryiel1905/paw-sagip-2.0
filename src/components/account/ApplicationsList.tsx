"use client";

export type SimpleApplication = {
  id: string;
  created_at: string | null;
  status: string;
  petId: string | null;
  petName: string;
  species?: string;
  shelterContactName?: string;
  shelterEmail?: string;
  shelterPhone?: string;
};

type Props = {
  items: SimpleApplication[];
  loading?: boolean;
};

function dateShort(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ApplicationsList({ items, loading }: Props) {
  return (
    <section className="surface rounded-2xl shadow-soft p-5">
      <h2 className="font-semibold ink-heading mb-3">Adoption Applications</h2>
      {loading ? (
        <div className="ink-muted text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="ink-muted text-sm">No applications yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((a) => (
            <article key={a.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="ink-heading font-medium">{a.petName || "Pet"}</div>
                  <div className="text-xs ink-subtle">Submitted {dateShort(a.created_at)}</div>
                </div>
                <span className={`pill px-2 py-0.5 text-xs font-medium ${
                  a.status === "approved"
                    ? "bg-emerald-100 text-emerald-700"
                    : a.status === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : a.status === "reviewing" || a.status === "in_review"
                    ? "bg-sky-100 text-sky-700"
                    : a.status === "declined"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-700"
                }`}>{a.status}</span>
              </div>

              <div className="mt-3 text-sm">
                <div className="ink-subtle">Shelter Contact</div>
                {a.shelterEmail || a.shelterPhone || a.shelterContactName ? (
                  <div className="space-y-0.5">
                    {a.shelterContactName ? (
                      <div className="ink-heading">{a.shelterContactName}</div>
                    ) : null}
                    {a.shelterEmail ? (
                      <div>
                        <a className="text-[var(--primary-mintgreen)]" href={`mailto:${a.shelterEmail}`}>
                          {a.shelterEmail}
                        </a>
                      </div>
                    ) : null}
                    {a.shelterPhone ? <div>{a.shelterPhone}</div> : null}
                  </div>
                ) : (
                  <div className="ink-muted">Contact info unavailable.</div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <a className="btn px-3 py-2 border" href={a.petId ? `/adopt/${a.petId}` : "#"}>
                  View
                </a>
                <a
                  className={`btn btn-primary px-3 py-2 ${a.shelterEmail ? "" : "opacity-50 pointer-events-none"}`}
                  href={a.shelterEmail ? `mailto:${a.shelterEmail}` : "#"}
                >
                  Email shelter
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

