"use client";

export type RecentReport = {
  id: string;
  title: string;
  type: string;
  created_at: string | null;
};

export type RecentApplication = {
  id: string;
  petName: string;
  species?: string;
  status: string;
  created_at: string | null;
};

type Props = {
  reports: RecentReport[];
  apps: RecentApplication[];
};

function dateShort(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function TypePill({ type }: { type: string }) {
  const map: Record<string, string> = {
    lost: "bg-orange-100 text-orange-700",
    found: "bg-sky-100 text-sky-700",
    cruelty: "bg-rose-100 text-rose-700",
    adoption: "bg-emerald-100 text-emerald-700",
  };
  const cls = map[type?.toLowerCase?.() || ""] || "bg-slate-100 text-slate-700";
  return <span className={`pill px-2 py-0.5 text-xs font-medium ${cls}`}>{type}</span>;
}

export default function OverviewPanel({ reports, apps }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section className="surface rounded-2xl shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold ink-heading">Recent Reports</h2>
          <a href="/report-form" className="text-sm text-[var(--primary-mintgreen)] font-medium">
            Create report
          </a>
        </div>
        <ul className="divide-y divide-[var(--border-color)]">
          {reports.length === 0 ? (
            <li className="py-4 text-sm ink-muted">No recent reports.</li>
          ) : (
            reports.map((r) => (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <TypePill type={r.type} />
                <div className="min-w-0">
                  <div className="ink-heading font-medium truncate">{r.title}</div>
                  <div className="text-xs ink-subtle">{dateShort(r.created_at)}</div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="surface rounded-2xl shadow-soft p-5">
        <h2 className="font-semibold ink-heading mb-3">Recent Applications</h2>
        <ul className="divide-y divide-[var(--border-color)]">
          {apps.length === 0 ? (
            <li className="py-4 text-sm ink-muted">No recent applications.</li>
          ) : (
            apps.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="ink-heading font-medium">{a.petName || "Pet"}</div>
                    <div className="text-xs ink-subtle">{dateShort(a.created_at)}</div>
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
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

