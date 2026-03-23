"use client";

import { useMemo, useState } from "react";
import { Eye, Trash2, FilePlus } from "lucide-react";
import { showToast } from "@/lib/toast";
import { getSupabaseClient } from "@/lib/supabaseClient";

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
  onDeleted?: (id: string) => void;
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

function StatusBadge({ status }: { status?: string }) {
  const cls =
    status === "resolved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "in_review"
      ? "bg-sky-100 text-sky-700"
      : status === "closed"
      ? "bg-slate-100 text-slate-700"
      : status === "open"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";
  return (
    <span className={`pill px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

const TYPES = ["all", "lost", "found", "cruelty", "adoption"] as const;

export default function ReportsList({ items, loading, onView, onDeleted }: Props) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    <section className="h-[60vh] overflow-y-auto surface rounded-2xl shadow-soft p-4 sm:p-5 w-full">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold ink-heading">My Reports</h2>
          <button
            className="btn btn-accent px-3 py-2 flex items-center gap-1.5 text-sm whitespace-nowrap"
            onClick={() => (window.location.href = "/report-form?from=account")}
          >
            <FilePlus className="h-4 w-4 shrink-0" />
            Create report
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border px-3 py-2 text-sm min-w-0"
            placeholder="Search by title, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border px-2 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
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
              <tr><td className="py-4 ink-muted" colSpan={6}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="py-4 ink-muted" colSpan={6}>No reports yet.</td></tr>
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
                  <td className="py-3 pr-3"><StatusBadge status={r.status} /></td>
                  <td className="py-3 pr-3">
                    <div className="grid gap-2 grid-cols-2">
                      <button
                        className="btn px-3 py-1.5 border border-[var(--primary-mintgreen)] bg-[var(--primary-mintgreen)] text-white hover:brightness-95 flex items-center justify-center gap-2"
                        onClick={() => onView?.(r.id)}
                        disabled={!onView}
                        type="button"
                      >
                        <Eye className="h-4 w-4" /> View
                      </button>
                      <button
                        className="btn px-3 py-1.5 border border-[var(--primary-red)] bg-[var(--primary-red)] text-white hover:brightness-90 flex items-center justify-center gap-2"
                        onClick={() => setConfirmId(r.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden flex flex-col gap-3">
        {loading ? (
          <p className="py-4 ink-muted text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 ink-muted text-sm">No reports yet.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="surface rounded-xl p-3 border border-[var(--border-color)]">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="font-medium ink-heading text-sm">{r.title}</div>
                  <div className="text-xs ink-subtle">{r.custom_id || r.id}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs ink-muted mb-2 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="capitalize">{r.type || "—"}</span>
                <span>{dateShort(r.created_at)}</span>
                {r.location && <span>{r.location}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn flex-1 px-3 py-2 border border-[var(--primary-mintgreen)] bg-[var(--primary-mintgreen)] text-white text-sm hover:brightness-95 flex items-center justify-center gap-1.5"
                  onClick={() => onView?.(r.id)}
                  disabled={!onView}
                  type="button"
                >
                  <Eye className="h-4 w-4" /> View
                </button>
                <button
                  className="btn flex-1 px-3 py-2 border border-[var(--primary-red)] bg-[var(--primary-red)] text-white text-sm hover:brightness-90 flex items-center justify-center gap-1.5"
                  onClick={() => setConfirmId(r.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirm dialog */}
      {confirmId ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (deleting ? undefined : setConfirmId(null))}
          />
          <div className="relative surface rounded-2xl shadow-2xl p-5 w-[92%] max-w-md">
            <h3 className="ink-heading font-semibold mb-2">Delete report?</h3>
            <p className="ink-subtle text-sm mb-4">
              This action cannot be undone. The report and its media will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="pill px-3 py-1.5"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={() => setConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn px-4 py-1.5 bg-[var(--primary-red)] text-white hover:brightness-90 disabled:opacity-60"
                onClick={async () => {
                  if (!confirmId) return;
                  setDeleting(true);
                  try {
                    const supabase = getSupabaseClient();
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token ?? null;
                    const resp = await fetch(`/api/reports/${confirmId}`, {
                      method: "DELETE",
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                      credentials: "same-origin",
                    });
                    if (!resp.ok) {
                      if (resp.status === 401 || resp.status === 403) {
                        showToast("error", "You don't have permission to delete this report");
                      } else {
                        const t = await resp.text().catch(() => "");
                        showToast("error", t || "Could not delete the report");
                      }
                      return;
                    }
                    showToast("success", "Report deleted");
                    onDeleted?.(confirmId);
                    if (!onDeleted) {
                      try { window.location.reload(); } catch {}
                    }
                  } catch (e) {
                    console.error(e);
                    showToast("error", "Could not delete the report. Please try again.");
                  } finally {
                    setDeleting(false);
                    setConfirmId(null);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
