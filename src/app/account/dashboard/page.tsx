"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
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
          const { data } = await supabase.auth.getUser();
          u = data?.user ?? null;
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
        const baseSelect =
          "id, created_at, status, email, phone, pet_id, user_id, adoption_pets:pet_id ( pet_name, species, location )";
        const buildQuery = () =>
          supabase
            .from("adoption_applications")
            .select(baseSelect)
            .order("created_at", { ascending: false })
            .limit(100);

        let rows: any[] | null = null;
        let appsError: any = null;

        const query = buildQuery();
        if (user.email) {
          const { data, error } = await query.or(
            `user_id.eq.${user.id},email.eq.${user.email}`
          );
          rows = data ?? null;
          appsError = error ?? null;
        } else {
          const { data, error } = await query.eq("user_id", user.id);
          rows = data ?? null;
          appsError = error ?? null;
        }

        if (appsError?.message?.includes?.("user_id")) {
          // Fallback for environments without user_id column yet.
          let fallback = supabase
            .from("adoption_applications")
            .select(
              "id, created_at, status, email, phone, pet_id, adoption_pets:pet_id ( pet_name, species, location )"
            )
            .order("created_at", { ascending: false })
            .limit(100);
          if (user.email) {
            fallback = fallback.eq("email", user.email);
          } else {
            fallback = fallback.limit(0);
          }
          const { data: fbRows, error: fbError } = await fallback;
          rows = fbRows ?? null;
          appsError = fbError ?? null;
        }

        if (appsError) {
          console.error("Applications load failed", appsError);
        }
        if (!cancelled && Array.isArray(rows)) {
          setMyApps(
            rows.map((row: any) => ({
              id: row.id,
              created_at: row.created_at ?? null,
              status: row.status ?? "pending",
              petId: row.pet_id ?? null,
              petName: row.adoption_pets?.pet_name ?? "",
              species: row.adoption_pets?.species ?? "",
              shelterContactName:
                row.adoption_pets?.shelter_contact_name ?? undefined,
              shelterEmail:
                row.adoption_pets?.shelter_contact_email ?? undefined,
              shelterPhone:
                row.adoption_pets?.shelter_contact_phone ?? undefined,
            }))
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
        className="fixed inset-0 bg-black/80 -z-10 pointer-events-none"
        aria-hidden="true"
      />
      <main
        className="box-border overflow-hidden pt-2 px-4"
        style={{ height: "calc(99dvh - var(--nav-h, 64px))" }}
      >
        <div className="max-w-[90%] mx-auto h-full pt-7">
          <div className="py-2 mb-2 flex items-center justify-between">
            <h1
              className="text-3xl font-extrabold text-white tracking-wide
            "
            >
              MY ACCOUNT{" "}
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

          <div className="grid grid-cols-4 lg:grid-cols-[320px,1fr,1fr] gap-4 items-start">
            <div className="grid gap-4 lg:col-span-1">
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

            <div className="grid gap-3 lg:col-span-3">
              <Tabs
                active={active}
                onChange={(k) => setActive(k as TabKey)}
                tabs={[
                  { key: "reports", label: "My Reports" },
                  { key: "apps", label: "Adoption Apps" },
                  { key: "settings", label: "Settings" },
                ]}
              />

              {active === "reports" && (
                <>
                  <ReportsList
                    items={myReports}
                    loading={dataLoading}
                    onView={(id) => openViewReport(id)}
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
      </main>
    </>
  );
}
