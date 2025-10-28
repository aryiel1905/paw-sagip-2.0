"use client";

import { useMemo, useState } from "react";
import { PET_MEDIA_BUCKET } from "@/data/supabaseApi";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

export type SimpleApplication = {
  id: string;
  created_at: string | null;
  status: string;
  petId: string | null;
  petName: string;
  species?: string;
  petPhotoUrl?: string | null;
  shelterContactName?: string;
  shelterEmail?: string;
  shelterPhone?: string;
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

function petEmojiFor(species?: string) {
  const value = (species || "").toLowerCase();
  if (value.includes("dog")) return "🐶";
  if (value.includes("cat")) return "🐱";
  return "🐾";
}

function petFallbackTheme(species?: string) {
  const value = (species || "").toLowerCase();
  if (value.includes("dog")) {
    // Warm beige radial
    return {
      background:
        "radial-gradient(circle at 50% 50%, #F8ECD9 0%, #EED9C2 45%, #DDBC9F 100%)",
      color: "#8C4F22",
    } as const;
  }
  if (value.includes("cat")) {
    // Sunny yellow radial
    return {
      background:
        "radial-gradient(circle at 50% 50%, #FFF3C4 0%, #FFE08A 45%, #FFB74A 100%)",
      color: "#8C6B00",
    } as const;
  }
  // Neutral soft gray radial
  return {
    background:
      "radial-gradient(circle at 50% 50%, #F3F4F6 0%, #E5E7EB 100%)",
    color: "#4A55C2",
  } as const;
}

type ResolvedApplication = SimpleApplication & {
  resolvedPhotoUrl: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = firstString(entry);
      if (result) return result;
    }
  }
  return null;
}

function resolvePetPhotoUrl(
  app: SimpleApplication,
  supabase: ReturnType<typeof getSupabaseClient>
): string | null {
  const raw = app as Record<string, unknown>;
  const candidates = [
    app.petPhotoUrl,
    raw.pet_photo_url,
    raw.petPhotoURL,
    raw.photo_url,
  ];

  const nested =
    asRecord(raw.pet) ||
    asRecord(raw.adoption_pet) ||
    asRecord(raw.adoption_pets) ||
    asRecord(raw.petData) ||
    null;

  if (nested) {
    candidates.push(
      nested.photo_url,
      nested.main_photo_url,
      nested.primary_photo_url,
      nested.photo,
      nested.photoUrl
    );
    candidates.push(
      firstString(nested.media_urls),
      firstString(nested.gallery_urls),
      firstString(nested.photos),
      firstString(nested.images)
    );
  }

  const urlCandidate = firstString(candidates);
  if (urlCandidate) {
    if (/^https?:\/\//i.test(urlCandidate) || urlCandidate.startsWith("//")) {
      return urlCandidate;
    }
  }

  const pathCandidates: (string | undefined | null)[] = [
    raw.pet_photo_path as string | undefined,
    raw.petMainPhotoPath as string | undefined,
  ];

  if (nested) {
    pathCandidates.push(
      nested.photo_path as string | undefined,
      nested.main_photo_path as string | undefined,
      nested.primary_photo_path as string | undefined,
      firstString(nested.media_paths),
      firstString(nested.gallery_paths)
    );
  }

  for (const path of pathCandidates) {
    if (!path) continue;
    const { data } = supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(path);
    if (data.publicUrl) return data.publicUrl;
  }

  if (urlCandidate && urlCandidate.length) return urlCandidate;
  return null;
}

type Props = {
  items: SimpleApplication[];
  loading?: boolean;
  onView?: (id: string) => void;
  onDeleted?: (id: string) => void;
};

export default function ApplicationsList({
  items,
  loading,
  onView,
  onDeleted,
}: Props) {
  const supabase = getSupabaseClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resolvedItems = useMemo<ResolvedApplication[]>(() => {
    return items.map((item) => ({
      ...item,
      resolvedPhotoUrl: resolvePetPhotoUrl(item, supabase),
    }));
  }, [items, supabase]);

  return (
    <section className="surface rounded-2xl shadow-soft p-5">
      <h2 className="font-semibold ink-heading mb-3">Adoption Applications</h2>
      {loading ? (
        <div className="ink-muted text-sm">Loading…</div>
      ) : resolvedItems.length === 0 ? (
        <div className="ink-muted text-sm">No applications yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resolvedItems.map((a) => (
            <article key={a.id} className="rounded-xl border p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)] sm:items-stretch">
                <div className="relative w-full overflow-hidden rounded-xl min-h-[120px] sm:h-full">
                  {a.resolvedPhotoUrl ? (
                    <img
                      src={a.resolvedPhotoUrl}
                      alt={a.petName || "Pet"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center text-3xl font-semibold"
                      style={petFallbackTheme(a.species)}
                    >
                      <span aria-hidden="true">{petEmojiFor(a.species)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="ink-heading font-medium">
                        {a.petName || "Pet"}
                      </div>
                      <div className="text-xs ink-subtle">
                        Submitted {dateShort(a.created_at)}
                      </div>
                    </div>
                    <span
                      className={`pill px-2 py-0.5 text-xs font-medium ${
                        a.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : a.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : a.status === "reviewing" || a.status === "in_review"
                          ? "bg-sky-100 text-sky-700"
                          : a.status === "declined"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  <div className="text-sm">
                    <div className="ink-subtle">Shelter Contact</div>
                    {a.shelterEmail ||
                    a.shelterPhone ||
                    a.shelterContactName ? (
                      <div className="space-y-0.5">
                        {a.shelterContactName ? (
                          <div className="ink-heading">
                            {a.shelterContactName}
                          </div>
                        ) : null}
                        {a.shelterEmail ? (
                          <div>
                            <a
                              className="text-[var(--primary-mintgreen)]"
                              href={`mailto:${a.shelterEmail}`}
                            >
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

                  <div className="flex flex-wrap gap-2">
                    {onView ? (
                      <button
                        type="button"
                        className="btn px-3 py-1 border border-transparent bg-[var(--primary-mintgreen)] text-white transition-colors duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-mintgreen)]"
                        onClick={() => onView(a.id)}
                      >
                        View
                      </button>
                    ) : (
                      <a
                        className="btn px-3 py-1 border border-transparent bg-[var(--primary-mintgreen)] text-white transition-colors duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-mintgreen)]"
                        href={a.petId ? `/adopt/${a.petId}` : "#"}
                      >
                        View
                      </a>
                    )}
                    {/* <a
                      className={`btn btn-primary px-3 py-1 ${
                        a.shelterEmail ? "" : "opacity-50 pointer-events-none"
                      }`}
                      href={a.shelterEmail ? `mailto:${a.shelterEmail}` : "#"}
                    >
                      Email shelter
                    </a> */}
                    <button
                      type="button"
                      className="inline-block btn px-3 py-1.5 bg-rose-600 text-white transition-colors duration-200 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-600"
                      onClick={() => setConfirmId(a.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmId ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (deleting ? undefined : setConfirmId(null))}
          />
          <div className="relative surface rounded-2xl shadow-2xl p-5 w-[92%] max-w-md">
            <h3 className="ink-heading font-semibold mb-2">
              Delete application?
            </h3>
            <p className="ink-subtle text-sm mb-4">
              This action cannot be undone. The application and its uploaded
              documents/photos will be permanently removed.
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
                className="btn px-4 py-1.5 bg-rose-600 text-white hover:brightness-95 disabled:opacity-60"
                onClick={async () => {
                  if (!confirmId) return;
                  setDeleting(true);
                  try {
                    const { data: sessionData } =
                      await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token ?? null;
                    const resp = await fetch(
                      `/api/adoption-applications/${confirmId}`,
                      {
                        method: "DELETE",
                        headers: token
                          ? { Authorization: `Bearer ${token}` }
                          : undefined,
                        credentials: "same-origin",
                      }
                    );
                    if (!resp.ok) {
                      if (resp.status === 401 || resp.status === 403) {
                        showToast(
                          "error",
                          "You don't have permission to delete this application"
                        );
                      } else {
                        const t = await resp.text().catch(() => "");
                        showToast(
                          "error",
                          t || "Could not delete the application"
                        );
                      }
                      return;
                    }
                    showToast("success", "Application deleted");
                    onDeleted?.(confirmId);
                    if (!onDeleted) {
                      try {
                        window.location.reload();
                      } catch {}
                    }
                  } catch (e) {
                    console.error(e);
                    showToast(
                      "error",
                      "Could not delete the application. Please try again."
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
