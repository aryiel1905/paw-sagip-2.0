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

const TYPES = ["all", "lost", "found", "cruelty", "adoption"] as const;

export default function ReportsList({
  items,
  loading,
  onView,
  onDeleted,
}: Props) {
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
    <section className="h-[60vh] overflow-y-auto surface rounded-2xl shadow-soft p-5 w-full">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
        <h2 className="font-semibold ink-heading">My Reports</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            className="btn btn-accent px-4 py-2 flex items-center gap-2"
            onClick={() => (window.location.href = "/report-form?from=account")}
          >
            <FilePlus className="h-4 w-4" />
            Create report
          </button>
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
            <tr className=" text-left border-b">
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
                    <div className="text-xs ink-subtle">
                      ID: {r.custom_id || r.id}
                    </div>
                  </td>
                  <td className="py-3 pr-3">{dateShort(r.created_at)}</td>
                  <td className="py-3 pr-3">{r.location || "—"}</td>
                  <td className="py-3 pr-3 capitalize">{r.type || "—"}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`pill px-3 py-2  text-sm font-medium ${
                        r.status === "resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : r.status === "in_review"
                          ? "bg-sky-100 text-sky-700"
                          : r.status === "closed"
                          ? "bg-slate-100 text-slate-700"
                          : r.status === "open"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.status ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        className="btn px-3 py-1.5 border border-[var(--primary-mintgreen)] bg-[var(--primary-mintgreen)] text-white hover:brightness-95 hover:shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-mintgreen)] flex items-center justify-center gap-2"
                        onClick={() => onView?.(r.id)}
                        disabled={!onView}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        className="btn px-3 py-1.5 border border-[var(--primary-red)] bg-[var(--primary-red)] text-white transition-colors duration-200 hover:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-red)] flex items-center justify-center gap-2"
                        onClick={() => setConfirmId(r.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmId ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (deleting ? undefined : setConfirmId(null))}
          />
          <div className="relative surface rounded-2xl shadow-2xl p-5 w-[92%] max-w-md">
            <h3 className="ink-heading font-semibold mb-2">Delete report?</h3>
            <p className="ink-subtle text-sm mb-4">
              This action cannot be undone. The report and its media will be
              permanently removed.
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
                    // Pass the Supabase access token so the API can run DELETE under RLS as the user
                    const supabase = getSupabaseClient();
                    const { data: sessionData } =
                      await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token ?? null;
                    const resp = await fetch(`/api/reports/${confirmId}`, {
                      method: "DELETE",
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                      credentials: "same-origin",
                    });
                    if (!resp.ok) {
                      if (resp.status === 401 || resp.status === 403) {
                        showToast(
                          "error",
                          "You don't have permission to delete this report"
                        );
                      } else {
                        const t = await resp.text().catch(() => "");
                        showToast("error", t || "Could not delete the report");
                      }
                      return;
                    }
                    showToast("success", "Report deleted");
                    onDeleted?.(confirmId);
                    if (!onDeleted) {
                      // Fallback: light reload to refresh data
                      try {
                        window.location.reload();
                      } catch {}
                    }
                  } catch (e) {
                    console.error(e);
                    showToast(
                      "error",
                      "Could not delete the report. Please try again."
                    );
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
