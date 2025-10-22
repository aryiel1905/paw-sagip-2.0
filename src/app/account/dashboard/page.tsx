"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import ProfileCard from "@/components/account/ProfileCard";
import MetricCard from "@/components/account/MetricCard";
import Tabs from "@/components/account/Tabs";
import OverviewPanel, {
  type RecentApplication,
  type RecentReport,
} from "@/components/account/OverviewPanel";
import ReportsList, {
  type SimpleReport,
} from "@/components/account/ReportsList";
import ApplicationsList, {
  type SimpleApplication,
} from "@/components/account/ApplicationsList";
import SettingsPanel from "@/components/account/SettingsPanel";
import ReportViewModal, {
  type ReportViewData,
} from "@/components/account/ReportViewModal";
import { fetchReportById } from "@/data/supabaseApi";

type UserInfo = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string | null;
};

type TabKey = "overview" | "reports" | "apps" | "settings";

export default function AccountDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [active, setActive] = useState<TabKey>("overview");

  const [myReports, setMyReports] = useState<SimpleReport[]>([]);
  const [myApps, setMyApps] = useState<SimpleApplication[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<ReportViewData | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!data.user) {
          try {
            window.dispatchEvent(
              new CustomEvent("app:signin", { detail: { mode: "login" } })
            );
          } catch {}
          setUser(null);
        } else {
          setUser({
            id: data.user.id,
            email: data.user.email ?? null,
            fullName:
              (data.user.user_metadata?.full_name as string | undefined) ??
              null,
            createdAt: data.user.created_at ?? null,
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
              createdAt: session.user.created_at ?? null,
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
            "id, created_at, report_type, location, species, pet_name, reporter_contact"
          );
        if (user.email) {
          r = r.or(`user_id.eq.${user.id},reporter_contact.eq.${user.email}`);
        } else {
          r = r.eq("user_id", user.id);
        }
        r = r.order("created_at", { ascending: false }).limit(100);

        const { data: rows, error: reportsError } = await r;
        if (reportsError) {
          console.error("Reports load failed", reportsError);
        }
        if (!cancelled && Array.isArray(rows)) {
          setMyReports(
            rows.map((row: any) => ({
              id: row.id,
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
        console.error("Reports load threw", err);
      }

      // Applications (email filter)
      try {
        let a = supabase
          .from("adoption_applications")
          .select(
            "id, created_at, status, email, phone, pet_id, adoption_pets:pet_id ( pet_name, species, location )"
          )
          .order("created_at", { ascending: false })
          .limit(100);
        if (user.email) a = a.eq("email", user.email);
        const { data: rows, error: appsError } = await a;
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

  async function openViewReport(id: string) {
    setViewOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewData(null);
    try {
      const rep = await fetchReportById(id);
      if (!rep) setViewError("Could not load report details.");
      else setViewData(rep as ReportViewData);
    } catch (e) {
      setViewError("Could not load report details.");
    } finally {
      setViewLoading(false);
    }
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
    <main className=" min-h-screen bg-black/80 overflow-hidden overflow-auto pt-10 px-4 py-4">
      <div className="max-w-full mx-auto ">
        <div className="mb-4 flex items-center justify-between">
          <h1
            className="text-3xl font-extrabold text-white tracking-wide
          "
          >
            My Account
          </h1>
          <div className="flex gap-2">
            <a
              href="/api/export"
              className="btn btn-primary px-4 py-2"
              aria-disabled
            >
              Export data
            </a>
            <button
              className="btn btn-accent px-4 py-2"
              onClick={() => (window.location.href = "/report-form")}
            >
              Create report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 lg:grid-cols-[320px,1fr,1fr] gap-4 items-start">
          <div className="grid gap-4 lg:col-span-1">
            <ProfileCard
              name={user.fullName}
              email={user.email}
              memberSince={user.createdAt}
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
                { key: "overview", label: "Overview" },
                { key: "reports", label: "My Reports" },
                { key: "apps", label: "Adoption Apps" },
                { key: "settings", label: "Settings" },
              ]}
            />

            {active === "overview" && (
              <OverviewPanel
                reports={(myReports.slice(0, 3) as RecentReport[]).map((r) => ({
                  id: r.id,
                  title: r.title,
                  type: r.type,
                  created_at: r.created_at,
                }))}
                apps={(myApps.slice(0, 2) as RecentApplication[]).map((a) => ({
                  id: a.id,
                  petName: a.petName,
                  species: a.species,
                  status: a.status,
                  created_at: a.created_at,
                }))}
              />
            )}
            {active === "reports" && (
              <>
                <ReportsList
                  items={myReports}
                  loading={dataLoading}
                  onView={(id) => openViewReport(id)}
                />
                <ReportViewModal
                  open={viewOpen}
                  data={viewData}
                  loading={viewLoading}
                  error={viewError}
                  onClose={() => setViewOpen(false)}
                />
              </>
            )}
            {active === "apps" && (
              <ApplicationsList items={myApps} loading={dataLoading} />
            )}
            {active === "settings" && (
              <SettingsPanel userEmail={user.email ?? ""} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
