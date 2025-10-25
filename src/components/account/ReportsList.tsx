"use client";

import { useMemo, useState } from "react";

export type SimpleReport = {
  id: string;
  custom_id?: string | null;
  title: string;
  type: string;
  location?: string;
  created_at: string | null;
  status?: string | undefined;
};

type Props = {
  items: SimpleReport[];
  loading?: boolean;
  onView?: (id: string) => void;
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

const TYPES = ["all", "lost", "found", "cruelty", "adoption"] as const;

export default function ReportsList({ items, loading, onView }: Props) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return items
      .filter((r) => (type === "all" ? true : r.type === type))
      .filter((r) => {
        if (!needle) return true;
        const t = `${r.title} ${r.location ?? ""} ${r.type}`.toLowerCase();
        return t.includes(needle);
      });
  }, [items, q, type]);

  return (
    <section className="surface rounded-2xl shadow-soft p-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <h2 className="font-semibold ink-heading">My Reports</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            className="flex-1 sm:w-64 rounded-xl border px-3 py-2 text-sm"
            placeholder="Search by title, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="ink-subtle text-left border-b">
              <th className="py-2 pr-3">Report</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Location</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 ink-muted" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-4 ink-muted" colSpan={6}>
                  No reports yet.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="font-medium ink-heading">{r.title}</div>
                    <div className="text-xs ink-subtle">ID: {r.custom_id || r.id}</div>
                  </td>
                  <td className="py-3 pr-3">{dateShort(r.created_at)}</td>
                  <td className="py-3 pr-3">{r.location || "—"}</td>
                  <td className="py-3 pr-3 capitalize">{r.type || "—"}</td>
                  <td className="py-3 pr-3">
                    <span className={`pill px-2 py-0.5 text-xs font-medium ${
                      r.status === "resolved"
                        ? "bg-emerald-100 text-emerald-700"
                        : r.status === "in_review"
                        ? "bg-sky-100 text-sky-700"
                        : r.status === "closed"
                        ? "bg-slate-100 text-slate-700"
                        : r.status === "open"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                    }`}>{r.status ?? "—"}</span>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <a
                      className="inline-block btn btn-primary px-3 py-1.5 mr-2"
                      href="/report-form"
                    >
                      Update
                    </a>
                    <button
                      className="inline-block btn px-3 py-1.5 border"
                      onClick={() => onView?.(r.id)}
                      disabled={!onView}
                      type="button"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
