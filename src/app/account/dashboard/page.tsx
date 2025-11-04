"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { PET_MEDIA_BUCKET } from "@/data/supabaseApi";
import { showToast } from "@/lib/toast";
import ProfileCard from "@/components/account/ProfileCard";
import MetricCard from "@/components/account/MetricCard";
import Tabs from "@/components/account/Tabs";

import ReportsList, {
  type SimpleReport,
} from "@/components/account/ReportsList";
import ApplicationsList, {
  type SimpleApplication,
} from "@/components/account/ApplicationsList";
import SettingsPanel from "@/components/account/SettingsPanel";
import ReportViewModal from "@/components/account/ReportViewModal";
import AdoptionViewModal from "@/components/account/AdoptionViewModal";

type UserInfo = {
  id: string;
  email: string | null;
  fullName: string | null;
};

type TabKey = "overview" | "reports" | "apps" | "settings";

export default function AccountDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [active, setActive] = useState<TabKey>("reports");

  const [myReports, setMyReports] = useState<SimpleReport[]>([]);
  const [myApps, setMyApps] = useState<SimpleApplication[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [appViewOpen, setAppViewOpen] = useState(false);
  const [appViewId, setAppViewId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        let u: any = null;
        try {
          const { data } = await supabase.auth.getSession();
          u = data?.session?.user ?? null;
        } catch {
          // Network/auth failed; continue as guest
          u = null;
        }
        if (!mounted) return;
        if (!u) {
          try {
            window.dispatchEvent(
              new CustomEvent("app:signin", { detail: { mode: "login" } })
            );
          } catch {}
          setUser(null);
        } else {
          setUser({
            id: u.id,
            email: u.email ?? null,
            fullName:
              (u.user_metadata?.full_name as string | undefined) ?? null,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const supabase = getSupabaseClient();
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? null,
              fullName:
                (session.user.user_metadata?.full_name as string | undefined) ??
                null,
            }
          : null
      );
    });
    return () => {
      try {
        data.subscription.unsubscribe();
      } catch {}
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      const supabase = getSupabaseClient();
      // Reports (match either user_id OR reporter_contact = user.email)
      try {
        let r = supabase
          .from("reports")
          .select(
            "id, custom_id, created_at, report_type, location, species, pet_name, status, reporter_contact"
          );
        if (user.email) {
          r = r.or(`user_id.eq.${user.id},reporter_contact.eq.${user.email}`);
        } else {
          r = r.eq("user_id", user.id);
        }
        r = r.order("created_at", { ascending: false }).limit(100);

        const { data: rows } = await r.throwOnError();
        if (!cancelled && Array.isArray(rows)) {
          setMyReports(
            rows.map((row: any) => ({
              id: row.id,
              custom_id: row.custom_id ?? null,
              title:
                row.pet_name ||
                row.species ||
                row.report_type?.toUpperCase?.() ||
                "Report",
              type: row.report_type ?? "",
              location: row.location ?? "",
              created_at: row.created_at ?? null,
              status: (row.status as string | undefined) ?? undefined,
            }))
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err ?? "");
        console.error("Reports load threw", msg);
      }

      // Applications (email filter + future user linkage)
      try {
        const baseSelect = [
          "id, created_at, status, email, phone, pet_id, user_id",
          // Select all pet columns to avoid unknown-column errors across environments
          "adoption_pets:pet_id ( * )",
        ].join(", ");
        const buildQuery = () =>
          supabase
            .from("adoption_applications")
            .select(baseSelect)
            .order("created_at", { ascending: false })
            .limit(100);

        let rows: any[] | null = null;
        let appsErrorMsg: string | null = null;

        try {
          const query = buildQuery();
          const q = user.email
            ? query.or(`user_id.eq.${user.id},email.eq.${user.email}`)
            : query.eq("user_id", user.id);
          const { data } = await (q as any).throwOnError();
          rows = data ?? null;
        } catch (e) {
          appsErrorMsg = e instanceof Error ? e.message : String(e ?? "");
        }

        if (appsErrorMsg?.includes?.("user_id")) {
          // Fallback for environments without user_id column yet.
          try {
            let fallback = supabase
              .from("adoption_applications")
              .select(
                [
                  "id, created_at, status, email, phone, pet_id",
                  "adoption_pets:pet_id ( * )",
                ].join(", ")
              )
              .order("created_at", { ascending: false })
              .limit(100);
            if (user.email) {
              fallback = fallback.eq("email", user.email);
            } else {
              fallback = fallback.limit(0);
            }
            const { data: fbRows } = await (fallback as any).throwOnError();
            rows = fbRows ?? null;
            appsErrorMsg = null;
          } catch (e) {
            appsErrorMsg = e instanceof Error ? e.message : String(e ?? "");
          }
        }

        if (appsErrorMsg) {
          console.error("Applications load failed", appsErrorMsg);
        }
        if (!cancelled && Array.isArray(rows)) {
          setMyApps(
            rows.map((row: any) => {
              const ap = (
                Array.isArray(row.adoption_pets)
                  ? row.adoption_pets[0]
                  : row.adoption_pets
              ) as
                | {
                    pet_name?: string | null;
                    species?: string | null;
                    photo_path?: string | null;
                    main_photo_path?: string | null;
                    primary_photo_path?: string | null;
                    photo_url?: string | null;
                    main_photo_url?: string | null;
                    primary_photo_url?: string | null;
                    shelter_contact_name?: string | null;
                    shelter_contact_email?: string | null;
                    shelter_contact_phone?: string | null;
                  }
                | null
                | undefined;
              // Resolve a useful photo URL for the card:
              // Prefer storage paths → public URL; then fall back to any direct URL.
              const supa = getSupabaseClient();
              const pathCandidates = [
                ap?.photo_path,
                ap?.main_photo_path,
                ap?.primary_photo_path,
              ].filter(Boolean) as string[];
              let petPhotoUrl: string | null = null;
              for (const p of pathCandidates) {
                const { data } = supa.storage
                  .from(PET_MEDIA_BUCKET)
                  .getPublicUrl(p);
                if (data.publicUrl) {
                  petPhotoUrl = data.publicUrl;
                  break;
                }
              }
              if (!petPhotoUrl) {
                const urlCandidates = [
                  ap?.photo_url,
                  ap?.main_photo_url,
                  ap?.primary_photo_url,
                ].filter(
                  (u): u is string => typeof u === "string" && u.length > 0
                );
                petPhotoUrl =
                  urlCandidates.find((u) => /^https?:\/\//i.test(u)) ||
                  urlCandidates[0] ||
                  null;
              }
              return {
                id: row.id,
                created_at: row.created_at ?? null,
                status: row.status ?? "pending",
                petId: row.pet_id ?? null,
                petName: ap?.pet_name ?? "",
                species: ap?.species ?? "",
                shelterContactName: ap?.shelter_contact_name ?? undefined,
                shelterEmail: ap?.shelter_contact_email ?? undefined,
                shelterPhone: ap?.shelter_contact_phone ?? undefined,
                // Helps ApplicationsList resolve the image immediately
                petPhotoUrl,
              } as SimpleApplication & { petPhotoUrl?: string | null };
            })
          );
        }
      } catch {}

      if (!cancelled) setDataLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function openViewReport(id: string) {
    setViewId(id);
    setViewOpen(true);
  }

  function openViewApplication(id: string) {
    setAppViewId(id);
    setAppViewOpen(true);
  }

  const metrics = useMemo(
    () => ({ reports: myReports.length, apps: myApps.length }),
    [myReports.length, myApps.length]
  );

  if (loading) {
    return (
      <main className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="surface rounded-2xl shadow-soft p-6 max-w-md">
            <div className="ink-muted text-sm">Loading your account…</div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="surface rounded-2xl shadow-soft p-6 max-w-md">
            <h1 className="text-xl font-semibold ink-heading mb-2">
              My Account
            </h1>
            <p className="ink-muted text-sm mb-4">
              Please sign in to view your account details.
            </p>
            <button
              className="btn btn-accent px-4 py-2"
              onClick={() => {
                try {
                  window.dispatchEvent(
                    new CustomEvent("app:signin", { detail: { mode: "login" } })
                  );
                } catch {}
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <div
        className="fixed inset-x-0 top-[var(--snap-top)] bottom-0 bg-black/95 z-0 pointer-events-none"
        aria-hidden="true"
      />
      <main className="relative z-10 box-border px-4 pt-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="py-2 mb-2 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              My Account
            </h1>
            <div className="flex gap-2">
              {/*}
              <a
                href="/api/export"
                className="btn btn-primary px-4 py-2"
                aria-disabled
              >
                Export data
              </a>
              */}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
            <div className="grid gap-4 order-2 md:order-1 lg:sticky lg:top-4 self-start">
              <ProfileCard
                name={user.fullName}
                email={user.email}
                onEdit={() => showToast("info", "Profile editing coming soon")}
              />
              <MetricCard
                title="Total Reports"
                count={metrics.reports}
                summary={
                  metrics.reports > 0
                    ? `${metrics.reports} total`
                    : "No reports yet"
                }
                tone="amber"
              />
              <MetricCard
                title="Adoption Applications"
                count={metrics.apps}
                summary={
                  metrics.apps > 0
                    ? `${metrics.apps} total`
                    : "No applications yet"
                }
                tone="green"
              />
            </div>

            <div className="grid gap-4 order-1 md:order-2 min-w-0 w-full">
              <div className="w-full">
                <Tabs
                  active={active}
                  onChange={(k) => setActive(k as TabKey)}
                  tabs={[
                    { key: "reports", label: "My Reports" },
                    { key: "apps", label: "Adoption Applications" },
                    { key: "settings", label: "Settings" },
                  ]}
                />
              </div>

              <div className="w-full">
                {active === "reports" && (
                  <>
                    <ReportsList
                      items={myReports}
                      loading={dataLoading}
                      onView={(id) => openViewReport(id)}
                      onDeleted={(id) =>
                        setMyReports((prev) => prev.filter((r) => r.id !== id))
                      }
                    />
                    <ReportViewModal
                      open={viewOpen}
                      reportId={viewId}
                      onClose={() => setViewOpen(false)}
                    />
                  </>
                )}
                {active === "apps" && (
                  <>
                    <ApplicationsList
                      items={myApps}
                      loading={dataLoading}
                      onView={(id) => openViewApplication(id)}
                      onDeleted={(id) =>
                        setMyApps((prev) => prev.filter((a) => a.id !== id))
                      }
                    />
                    <AdoptionViewModal
                      open={appViewOpen}
                      applicationId={appViewId}
                      onClose={() => setAppViewOpen(false)}
                    />
                  </>
                )}
                {active === "settings" && (
                  <SettingsPanel userEmail={user.email ?? ""} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
