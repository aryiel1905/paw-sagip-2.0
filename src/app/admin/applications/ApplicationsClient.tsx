"use client";

import { useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

export type ApplicationItem = {
  id: string;
  created_at: string;
  status: string;
  applicant_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  adopt_what: string | null;
  home_type: string | null;
  pet_id: string | null;
  pet_name: string | null;
  pet_species: string | null;
  home_photo_paths: string[] | null;
};

const PET_MEDIA_BUCKET = "pet-media";
const STATUSES = [
  "pending",
  "reviewing",
  "approved",
  "declined",
  "on_hold",
] as const;

export default function ApplicationsClient({
  items,
}: {
  items: ApplicationItem[];
}) {
  const [rows, setRows] = useState(items);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const deriveName = (r: ApplicationItem) =>
    r.applicant_name || [r.first_name, r.last_name].filter(Boolean).join(" ");

  const expanded = useMemo(
    () => rows.find((r) => r.id === openId) || null,
    [rows, openId]
  );

  const publicUrls = (expanded?.home_photo_paths || []).map(
    (p) =>
      supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data.publicUrl
  );

  const changeStatus = async (
    id: string,
    status: (typeof STATUSES)[number]
  ) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/adoption-applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to update status");
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      showToast("success", `Status set to ${status}`);
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to update status";
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-4 grid gap-4">
      <div className="rounded-2xl p-4 surface shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold ink-heading">
              Adoption Applications
            </h2>
            <p className="ink-subtle text-sm">Latest first</p>
          </div>
        </div>

        {/* table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="ink-subtle text-left">
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3">Applicant</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Pet</th>
                <th className="py-2 pr-3">Adopt</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <td className="py-2 pr-3">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{deriveName(r) || "—"}</td>
                  <td className="py-2 pr-3">{r.email || r.phone || "—"}</td>
                  <td className="py-2 pr-3">
                    {r.pet_name || "(pet)"}{" "}
                    {r.pet_species ? `· ${r.pet_species}` : ""}
                  </td>
                  <td className="py-2 pr-3">{r.adopt_what || "—"}</td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button
                        className="pill px-2 py-1"
                        style={{ border: "1px solid var(--border-color)" }}
                        onClick={() =>
                          setOpenId((id) => (id === r.id ? null : r.id))
                        }
                      >
                        {openId === r.id ? "Hide" : "View"}
                      </button>
                      <select
                        className="rounded-xl px-2 py-1"
                        value={r.status}
                        onChange={(e) =>
                          changeStatus(
                            r.id,
                            e.target.value as (typeof STATUSES)[number]
                          )
                        }
                        disabled={busyId === r.id}
                        style={{ border: "1px solid var(--border-color)" }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="rounded-2xl p-4 surface shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold ink-heading">
                Application Details
              </div>
              <div className="ink-subtle text-sm">
                {new Date(expanded.created_at).toLocaleString()}
              </div>
            </div>
            <button
              className="pill px-3 py-1"
              style={{ border: "1px solid var(--border-color)" }}
              onClick={() => setOpenId(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="ink-subtle text-xs">Applicant</div>
              <div className="ink-heading">{deriveName(expanded) || "—"}</div>
              <div className="text-sm">{expanded.email || ""}</div>
              <div className="text-sm">{expanded.phone || ""}</div>
            </div>
            <div>
              <div className="ink-subtle text-xs">Pet</div>
              <div className="text-sm">
                {expanded.pet_name || "(pet)"}{" "}
                {expanded.pet_species ? `· ${expanded.pet_species}` : ""}
              </div>
            </div>
          </div>
          {publicUrls.length > 0 && (
            <div className="mt-4">
              <div className="ink-subtle text-xs">Home Photos</div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {publicUrls.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={u}
                    alt={`home ${i + 1}`}
                    className="w-full h-32 object-cover rounded-xl"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
