"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertType,
  Alert,
  AdoptionPet,
  ReportStatus,
  AlertRow,
  AdoptionRow,
} from "@/types/app";
import { AlertsSection } from "@/components/AlertsSection";
import { ReportSection } from "@/components/ReportSection";
import { RegistrySection } from "@/components/RegistrySection";
import { AdoptionSection } from "@/components/AdoptionSection";
import { CrueltySection } from "@/components/CrueltySection";
import {
  HeartHandshake,
  Locate,
  Navigation2,
  ShieldAlert,
  BellRing,
  ClipboardList,
  IdCard,
  House,
} from "lucide-react";

// Storage bucket name used when uploading report photos
const PET_MEDIA_BUCKET = "pet-media";

// Links backing the fixed mobile bottom navigation
const MOBILE_NAV_LINKS = [
  { href: "#home", label: "Home", icon: House },
  { href: "#alerts", label: "Alerts", icon: BellRing },
  { href: "#report", label: "Report", icon: ClipboardList },
  { href: "#registry", label: "Registry", icon: IdCard },
  { href: "#adoption", label: "Adoption", icon: HeartHandshake },
];

// Per-section offsets (px) for the fixed mobile bottom nav
const MOBILE_NAV_OFFSETS: Record<string, number> = {
  "#home": 88,
  "#alerts": 88,
  "#report": 88,
  "#registry": 88,
  "#adoption": 88,
};

// Tabs used to filter the alert feed client-side
const ALERT_FILTERS: AlertType[] = [
  "all",
  "lost",
  "found",
  "cruelty",
  "adoption",
];

// Map alert types to icon badges displayed in cards
function mapEmoji(type: Exclude<AlertType, "all">) {
  switch (type) {
    case "lost":
      return "🔎";
    case "found":
      return "📍";
    case "cruelty":
      return "🚨";
    case "adoption":
      return "🐾";
    default:
      return "🐾";
  }
}

// Derive \"minutes ago\" fallback when Supabase does not return the computed field
function resolveMinutes(item: AlertRow) {
  if (item.minutes !== undefined && item.minutes !== null) {
    const parsed = Number(item.minutes);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  if (item.created_at) {
    return Math.max(
      0,
      Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000)
    );
  }
  return 0;
}

export default function Home() {
  // Reactive state hooks grouped by feature (alerts, adoption, report wizard, UI helpers)
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [adoptions, setAdoptions] = useState<AdoptionPet[]>([]);
  const [alertFilter, setAlertFilter] = useState<AlertType>("all");
  const [showPetProfile, setShowPetProfile] = useState(false);
  const [adoptionFilter, setAdoptionFilter] = useState<"all" | "dog" | "cat">(
    "all"
  );
  const [reportPhotoPreviewUrl, setReportPhotoPreviewUrl] = useState<
    string | null
  >(null);

  const [adoptionSort, setAdoptionSort] = useState<"nearest" | "newest">(
    "nearest"
  );
  const [reportType, setReportType] =
    useState<Exclude<AlertType, "all">>("found");
  const [reportDescription, setReportDescription] = useState("");
  const [reportCondition, setReportCondition] = useState("Healthy");
  const [reportLocation, setReportLocation] = useState("");
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportPhotoName, setReportPhotoName] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const reportPhotoInputRef = useRef<HTMLInputElement>(null!);
  const isMountedRef = useRef(true);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);

  // Guard against state updates when the component unmounts while async work is in flight
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const loadAlerts = useCallback(async () => {
    const toAlert = (item: AlertRow): Alert => {
      const imageUrl = item.photo_path
        ? supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(item.photo_path)
            .data.publicUrl
        : null;
      return {
        id: item.id,
        title: item.title,
        area: item.area,
        type: item.type,
        emoji: mapEmoji(item.type),
        minutes: resolveMinutes(item),
        imageUrl,
      };
    };

    const { data, error } = await supabase
      .from("alerts")
      .select("id,title,area,type,created_at,photo_path")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn(
        "Falling back to client-side minutes",
        error.message ?? error
      );
      const fallback = await supabase
        .from("alerts")
        .select("id,title,area,type,created_at,photo_path")
        .order("created_at", { ascending: false })
        .limit(50);

      if (fallback.error) {
        console.error(
          "Failed to load alerts",
          fallback.error.message ?? fallback.error
        );
        return;
      }

      if (fallback.data && isMountedRef.current) {
        setAlerts((fallback.data as AlertRow[]).map(toAlert));
      }
      return;
    }

    if (data && isMountedRef.current) {
      setAlerts((data as AlertRow[]).map(toAlert));
    }
  }, []);

  const scrollToTarget = useCallback((target: string, offset?: number) => {
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      const selector = target.startsWith("#") ? target : `#${target}`;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;

      if (typeof offset === "number" && !Number.isNaN(offset)) {
        const y = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: "smooth" });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 75);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ target: string }>;
      const target = customEvent.detail?.target;
      if (target) {
        scrollToTarget(target);
      }
    };

    window.addEventListener("app:navigate", handler as EventListener);
    return () => {
      window.removeEventListener("app:navigate", handler as EventListener);
    };
  }, [scrollToTarget]);

  // Clear any lingering location hash on first load so mobile view lands on the hero
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.hash) {
      const cleanPath = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", cleanPath);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  // Kick off the initial alert load and mark the section as loading
  useEffect(() => {
    setAlertsLoading(true);

    loadAlerts().finally(() => {
      if (isMountedRef.current) {
        setAlertsLoading(false);
      }
    });
  }, [loadAlerts]);

  // Listen for realtime alert inserts so the UI reflects new reports immediately
  useEffect(() => {
    const channel = supabase
      .channel("public:alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => {
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAlerts]);

  // Load adoption listings once and ignore late responses after unmount
  useEffect(() => {
    let ignore = false;

    async function loadAdoptions() {
      const { data, error } = await supabase
        .from("adoption_pets")
        .select(
          "id, kind, name, age, note, location, emoji_code, status, created_at"
        )
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (ignore) {
        return;
      }

      if (error) {
        console.error("Failed to load adoption pets", error.message ?? error);
        return;
      }

      if (data && data.length > 0) {
        setAdoptions(
          (data as AdoptionRow[]).map((item) => ({
            id: item.id,
            kind: item.kind,
            name: item.name,
            age: item.age ?? "",
            note: item.note ?? "",
            location: item.location ?? "",
            emoji: item.emoji_code ?? "P0",
          }))
        );
      }
    }

    loadAdoptions();

    return () => {
      ignore = true;
    };
  }, []);

  const nearbyAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);

  const filteredAlerts = useMemo(() => {
    if (alertFilter === "all") {
      return alerts;
    }
    return alerts.filter((alert) => alert.type === alertFilter);
  }, [alerts, alertFilter]);

  const adoptionResults = useMemo(() => {
    let pets = adoptions;
    if (adoptionFilter !== "all") {
      pets = pets.filter((pet) => pet.kind === adoptionFilter);
    }
    if (adoptionSort === "newest") {
      return [...pets].reverse();
    }
    return pets;
  }, [adoptions, adoptionFilter, adoptionSort]);

  // Track the selected photo locally so it can be uploaded prior to submitting the report
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReportPhoto(file);
    setReportPhotoName(file ? file.name : "");
    setReportPhotoPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  };

  // Handle the full report submission flow including optional photo upload
  // and error handling. Resets the form on success and reloads alerts.
  useEffect(() => {
    return () => {
      if (reportPhotoPreviewUrl) {
        URL.revokeObjectURL(reportPhotoPreviewUrl);
      }
    };
  }, [reportPhotoPreviewUrl]);

  const handleSubmitReport = async () => {
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;

    if (reportPhoto) {
      const fileExt = reportPhoto.name.split(".").pop()?.toLowerCase() ?? "";
      const uniqueFileName = `${crypto.randomUUID()}${
        fileExt ? `.${fileExt}` : ""
      }`;
      const filePath = `reports/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .upload(filePath, reportPhoto, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(
          "Failed to upload report photo",
          uploadError.message ?? uploadError
        );
        setReportStatus("error");
        return;
      }

      uploadedPhotoPath = uploadData?.path ?? filePath;
    }

    const payload = {
      type: reportType,
      description: reportDescription,
      condition: reportCondition,
      location: reportLocation,
      photoPath: uploadedPhotoPath,
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setReportStatus("error");
        return;
      }

      setReportStatus("success");
      setReportDescription("");
      setReportLocation("");
      setReportPhoto(null);
      setReportPhotoName("");
      if (reportPhotoInputRef.current) {
        reportPhotoInputRef.current.value = "";
      }
      if (reportPhotoPreviewUrl) {
        URL.revokeObjectURL(reportPhotoPreviewUrl);
        setReportPhotoPreviewUrl(null);
      }
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setReportStatus("idle");
          }
        }, 5000);
      }

      await loadAlerts();
    } catch (error) {
      console.error("Failed to submit report", error);
      setReportStatus("error");
    }
  };

  return (
    <>
      <main className="pb-24">
        {/* Hero section with quick calls to action and nearby alerts */}
        <section
          id="home"
          className="mx-auto mt-5 max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-29"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface rounded-2xl p-6 shadow-soft">
              <h1 className="text-3xl font-extrabold tracking-tight ink-heading sm:text-4xl">
                Find. <span style={{ color: "#2a9d8f" }}>Rescue.</span> Reunite.
              </h1>
              <p className="ink-muted mt-2">
                Report lost or found pets, receive nearby alerts, and help
                coordinate safe rescues in your barangay.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  className="px-5 py-3 rounded-2xl font-semibold bg-orange-400 hover:bg-orange-500 text-white transition-colors shadow-lg"
                  onClick={() => scrollToTarget("#report")}
                  type="button"
                >
                  Report a Stray
                </button>
                <button
                  className="px-5 py-2.5 rounded-2xl font-semibold border-2 border-[#2a9d8f] text-[#2a9d8f] bg-white hover:bg-[#2a9d8f] hover:text-white transition-colors shadow-lg"
                  onClick={() => scrollToTarget("#adoption")}
                  type="button"
                >
                  Adopt a Pet
                </button>
              </div>
              <div className="mt-6">
                <label className="sr-only" htmlFor="pet-search">
                  Search pets
                </label>
                <div className="flex gap-2">
                  <input
                    id="pet-search"
                    className="w-full rounded-xl px-4 py-3"
                    placeholder="Search by name, breed, location."
                    style={{ border: "1px solid var(--border-color)" }}
                    type="search"
                  />
                  <button
                    className="px-5 py-3 rounded-2xl  bg-[#333333] hover:bg-[#535353] text-white transition-colors"
                    type="button"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            <div className="surface rounded-2xl p-6 shadow-soft">
              <h2 className="text-lg font-bold ink-heading">Nearby Alerts</h2>
              <ul className="mt-3 space-y-3">
                {alertsLoading && (
                  <li
                    className="rounded-xl p-3"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    Loading alerts...
                  </li>
                )}
                {!alertsLoading && nearbyAlerts.length === 0 && (
                  <li
                    className="rounded-xl p-3 ink-muted"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    No alerts available yet.
                  </li>
                )}
                {nearbyAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    {alert.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={alert.imageUrl}
                        alt="alert photo"
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="grid h-10 w-10 place-content-center rounded-xl text-xl"
                        style={{
                          background:
                            "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                        }}
                      >
                        {alert.emoji}
                      </div>
                    )}
                    <div>
                      <p className="font-medium ink-heading">{alert.title}</p>
                      <p className="text-sm ink-muted">
                        {alert.area} - {alert.minutes} mins ago
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <a
                  className="hover:underline"
                  href="#alerts"
                  style={{ color: "var(--primary-green)" }}
                >
                  View all alerts {"->"}
                </a>
              </div>
            </div>
          </div>
        </section>

        <AlertsSection
          filters={ALERT_FILTERS}
          activeFilter={alertFilter}
          onFilterChange={setAlertFilter}
          filteredAlerts={filteredAlerts}
        />

        <ReportSection
          reportType={reportType}
          setReportType={setReportType}
          reportDescription={reportDescription}
          setReportDescription={setReportDescription}
          reportCondition={reportCondition}
          setReportCondition={setReportCondition}
          reportLocation={reportLocation}
          setReportLocation={setReportLocation}
          reportPhotoName={reportPhotoName}
          reportStatus={reportStatus}
          handlePhotoChange={handlePhotoChange}
          handleSubmitReport={handleSubmitReport}
          reportPhotoInputRef={reportPhotoInputRef}
          reportPhotoPreviewUrl={reportPhotoPreviewUrl}
        />

        <RegistrySection
          showPetProfile={showPetProfile}
          setShowPetProfile={setShowPetProfile}
        />

        <AdoptionSection
          adoptionResults={adoptionResults}
          adoptionFilter={adoptionFilter}
          setAdoptionFilter={setAdoptionFilter}
          adoptionSort={adoptionSort}
          setAdoptionSort={setAdoptionSort}
        />

        <CrueltySection />

        <nav className="fixed inset-x-0 bottom-4 px-4 md:hidden">
          <div className="surface mx-auto grid max-w-md grid-cols-5 rounded-2xl text-center text-sm shadow-soft">
            {MOBILE_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                className="py-3"
                onClick={() =>
                  scrollToTarget(link.href, MOBILE_NAV_OFFSETS[link.href] ?? 0)
                }
              >
                <link.icon className="mx-auto   mb-1 h-5 w-5" />
                <div className="text-[11px]">{link.label}</div>
              </a>
            ))}
          </div>
        </nav>
      </main>
    </>
  );
}
