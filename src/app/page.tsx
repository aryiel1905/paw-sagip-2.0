"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
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
import { showToast } from "@/lib/toast";
import {
  HeartHandshake,
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

// Union type for search modal selection
type ModalItem =
  | { kind: "alert"; alert: Alert }
  | { kind: "adoption"; adoption: AdoptionPet }
  | null;

// Emoji fallback for missing photos based on species
function speciesToEmoji(species?: string | null) {
  const s = (species ?? "").toLowerCase();
  if (s.includes("dog")) return "🐶";
  if (s.includes("cat")) return "🐱";
  return "🐾";
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
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportPhotoName, setReportPhotoName] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const reportPhotoInputRef = useRef<HTMLInputElement>(null!);
  const landmarkInputRef = useRef<HTMLInputElement>(null!);
  const landmarkInputMobileRef = useRef<HTMLInputElement>(null!);
  const isMountedRef = useRef(true);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);
  // Landmark photos (multiple)
  const [landmarkPhotos, setLandmarkPhotos] = useState<File[]>([]);
  const [landmarkPreviewUrls, setLandmarkPreviewUrls] = useState<string[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAlerts, setSearchAlerts] = useState<Alert[]>([]);
  const [searchAdoptions, setSearchAdoptions] = useState<AdoptionPet[]>([]);
  const [modalItem, setModalItem] = useState<ModalItem>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<number | null>(null);

  // Guard against state updates when the component unmounts while async work is in flight
  useEffect(() => {
    // Ensure the mounted flag is re-enabled on mount (important after client navigation)
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Simple text scoring for ranking ILIKE results by "best match"
  const scoreText = useCallback(
    (needle: string, hay: string | null | undefined) => {
      if (!needle) return 0;
      const q = needle.toLowerCase().trim();
      const t = (hay ?? "").toLowerCase();
      if (!q || !t) return 0;
      const idx = t.indexOf(q);
      if (idx === -1) return 0;
      let score = 1; // base for any match
      if (t === q) score += 120; // exact
      if (t.startsWith(q)) score += 80; // prefix
      if (idx === 0) score += 30; // occurs at start
      score += Math.max(0, 30 - idx); // earlier is better
      score += Math.min(40, q.length); // longer query slightly higher
      return score;
    },
    []
  );

  const runSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q || q.length < 2) {
        if (isMountedRef.current) {
          setSearchAlerts([]);
          setSearchAdoptions([]);
          setSearchLoading(false);
        }
        return;
      }

      setSearchLoading(true);

      try {
        const supabase = getSupabaseClient();

        // Alerts search via ILIKE across common text fields
        const qLower = q.toLowerCase();
        const alertTypeMatches = [
          "lost",
          "found",
          "cruelty",
          "adoption",
        ].filter((t) => t.includes(qLower));
        const qSafe = q.replace(/[,]/g, " ");
        const alertOrParts = [
          `location.ilike.%${qSafe}%`,
          `description.ilike.%${qSafe}%`,
          `pet_name.ilike.%${qSafe}%`,
          `species.ilike.%${qSafe}%`,
          ...alertTypeMatches.map((t) => `report_type.eq.${t}`),
        ];
        const { data: alertData, error: alertErr } = await supabase
          .from("alerts")
          .select(
            "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description"
          )
          .or(alertOrParts.join(","))
          .limit(25);

        if (alertErr) {
          console.error("Search alerts failed", alertErr.message ?? alertErr);
        }

        const toAlert = (item: AlertRow): Alert => {
          const supabase = getSupabaseClient();
          const imageUrl = item.photo_path
            ? supabase.storage
                .from(PET_MEDIA_BUCKET)
                .getPublicUrl(item.photo_path).data.publicUrl
            : null;
          const landmarkImageUrls = Array.isArray(item.landmark_media_paths)
            ? item.landmark_media_paths
                .filter(Boolean)
                .map(
                  (p) =>
                    supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data
                      .publicUrl
                )
            : [];
          const title =
            item.pet_name && item.pet_name.trim()
              ? item.pet_name
              : item.species
              ? `${item.report_type.toUpperCase()} ${item.species}`
              : item.report_type.toUpperCase();
          return {
            id: item.id,
            title,
            area: item.location,
            type: item.report_type,
            emoji: speciesToEmoji(item.species),
            minutes: resolveMinutes(item),
            imageUrl,
            latitude: item.latitude ?? null,
            longitude: item.longitude ?? null,
            landmarkImageUrls,
          };
        };

        let alertsList: Alert[] = Array.isArray(alertData)
          ? (alertData as AlertRow[]).map(toAlert)
          : [];

        // Rank alerts by best text match
        alertsList = alertsList
          .map((a) => {
            const score =
              scoreText(q, a.title) * 2 +
              scoreText(q, a.area) +
              scoreText(q, a.type);
            return { a, score };
          })
          .sort((x, y) => y.score - x.score)
          .slice(0, 5)
          .map((x) => x.a);

        // Adoption search via ILIKE across common text fields
        const kindMatches = ["dog", "cat"].filter((k) => k.includes(qLower));
        const adoptOrParts = [
          `pet_name.ilike.%${qSafe}%`,
          `location.ilike.%${qSafe}%`,
          `features.ilike.%${qSafe}%`,
          `age_size.ilike.%${qSafe}%`,
          ...kindMatches.map((k) => `species.ilike.%${k}%`),
        ];
        const { data: adoptData, error: adoptErr } = await supabase
          .from("adoption_pets")
          .select(
            "id, species, pet_name, age_size, features, location, emoji_code, status, created_at, photo_path, latitude, longitude"
          )
          // .eq("status", "available") // temporary: show all for debugging
          .or(adoptOrParts.join(","))
          .limit(25);

        if (adoptErr) {
          console.error("Search adoption failed", adoptErr.message ?? adoptErr);
        }

        let adoptList: AdoptionPet[] = Array.isArray(adoptData)
          ? (adoptData as AdoptionRow[]).map((item) => {
              const imageUrl = item.photo_path
                ? supabase.storage
                    .from(PET_MEDIA_BUCKET)
                    .getPublicUrl(item.photo_path).data.publicUrl
                : null;
              const s = (item.species ?? "").toLowerCase();
              const kind = s.startsWith("dog")
                ? "dog"
                : s.startsWith("cat")
                ? "cat"
                : "other";
              const emoji =
                item.emoji_code ??
                (kind === "dog" ? "🐶" : kind === "cat" ? "🐱" : "🐾");
              return {
                id: item.id,
                kind,
                name: item.pet_name ?? "",
                age: item.age_size ?? "",
                note: item.features ?? "",
                location: item.location ?? "",
                emoji,
                imageUrl,
                createdAt: item.created_at ?? null,
                latitude: item.latitude ?? null,
                longitude: item.longitude ?? null,
              } as AdoptionPet;
            })
          : [];

        adoptList = adoptList
          .map((p) => {
            const score =
              scoreText(q, p.name) * 2 +
              scoreText(q, p.location) +
              scoreText(q, p.note) +
              scoreText(q, p.kind) +
              scoreText(q, p.age);
            return { p, score };
          })
          .sort((x, y) => y.score - x.score)
          .slice(0, 5)
          .map((x) => x.p);

        if (isMountedRef.current) {
          setSearchAlerts(alertsList);
          setSearchAdoptions(adoptList);
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        if (isMountedRef.current) setSearchLoading(false);
      }
    },
    [scoreText]
  );

  const loadAlerts = useCallback(async () => {
    const supabase = getSupabaseClient();
    const toAlert = (item: AlertRow): Alert => {
      const imageUrl = item.photo_path
        ? supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(item.photo_path)
            .data.publicUrl
        : null;
      const landmarkImageUrls = Array.isArray(item.landmark_media_paths)
        ? item.landmark_media_paths
            .filter(Boolean)
            .map(
              (p) =>
                supabase.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data
                  .publicUrl
            )
        : [];
      // Derive a display title from mirrored report fields
      const displayTitle =
        item.pet_name?.trim() ||
        (item.species
          ? `${item.report_type.toUpperCase()} ${item.species}`
          : item.report_type.toUpperCase());
      return {
        id: item.id,
        title: displayTitle,
        area: item.location,
        type: item.report_type,
        emoji: speciesToEmoji(item.species),
        minutes: resolveMinutes(item),
        imageUrl,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        landmarkImageUrls,
      };
    };

    const { data, error } = await supabase
      .from("alerts")
      .select(
        "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn(
        "Falling back to client-side minutes",
        error.message ?? error
      );
      const fallback = await supabase
        .from("alerts")
        .select(
          "id,report_type,location,created_at,photo_path,pet_name,species,description"
        )
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
        const alertsFromAlerts = (fallback.data as AlertRow[]).map(toAlert);
        setAlerts(alertsFromAlerts);
      }
      return;
    }

    if (data && isMountedRef.current) {
      const alertsFromAlerts = (data as AlertRow[]).map(toAlert);
      setAlerts(alertsFromAlerts);
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

  // Close suggestions only when empty; keep them "sticky" if there is input
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) {
        if (searchQuery.trim().length === 0) {
          setSearchOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [searchQuery]);

  // Kick off the initial alert load and mark the section as loading
  useEffect(() => {
    setAlertsLoading(true);

    loadAlerts().finally(() => {
      if (isMountedRef.current) {
        setAlertsLoading(false);
      }
    });
  }, [loadAlerts]);

  // Continuously track user's location while the app is in use to keep distances fresh
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setMyLat(coords.latitude);
        setMyLng(coords.longitude);
      },
      () => {
        // If permission denied or error, leave myLat/myLng as-is; distances will hide automatically
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    geoWatchIdRef.current = watchId;
    return () => {
      if (geoWatchIdRef.current != null) {
        try {
          navigator.geolocation.clearWatch(geoWatchIdRef.current);
        } catch {}
        geoWatchIdRef.current = null;
      }
    };
  }, []);

  // Listen for realtime alert changes so the UI reflects updates/deletes too
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("public:alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
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
    const supabaseRealtime = getSupabaseClient();

    async function loadAdoptions() {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("adoption_pets")
        .select(
          "id, species, pet_name, age_size, features, location, emoji_code, status, created_at, photo_path, latitude, longitude"
        )
        // .eq("status", "available") // temporary: show all for debugging
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
          (data as AdoptionRow[]).map((item) => {
            const imageUrl = item.photo_path
              ? supabase.storage
                  .from(PET_MEDIA_BUCKET)
                  .getPublicUrl(item.photo_path).data.publicUrl
              : null;
            const s = (item.species ?? "").toLowerCase();
            const kind = s.startsWith("dog")
              ? "dog"
              : s.startsWith("cat")
              ? "cat"
              : "other";
            const emoji =
              item.emoji_code ??
              (kind === "dog" ? "🐶" : kind === "cat" ? "🐱" : "🐾");
            return {
              id: item.id,
              kind,
              name: item.pet_name ?? "",
              age: item.age_size ?? "",
              note: item.features ?? "",
              location: item.location ?? "",
              emoji,
              imageUrl,
              createdAt: item.created_at ?? null,
              latitude: item.latitude ?? null,
              longitude: item.longitude ?? null,
            } as AdoptionPet;
          })
        );
      }
    }

    loadAdoptions();

    // Realtime: subscribe to adoption_pets inserts/updates/deletes
    const channel = supabaseRealtime
      .channel("public:adoption_pets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "adoption_pets" },
        () => {
          if (!ignore) loadAdoptions();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabaseRealtime.removeChannel(channel);
    };
  }, []);

  const nearbyAlerts = useMemo(
    () =>
      alerts.filter(
        (a) => a.type === "lost" || a.type === "found" || a.type === "cruelty"
      ),
    [alerts]
  );

  // Human-friendly time formatter using minutes since creation
  const timeAgoFromMinutes = useCallback((minutes: number) => {
    const mins = Math.max(0, Math.floor(minutes));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
    const months = Math.floor(days / 30);
    if (months < 12)
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    const years = Math.floor(months / 12);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }, []);

  const getMapsLink = useCallback(
    (a: Alert): string | null => {
      const hasCoords =
        typeof a.latitude === "number" && typeof a.longitude === "number";
      if (hasCoords) {
        if (typeof myLat === "number" && typeof myLng === "number") {
          return `https://www.google.com/maps/dir/?api=1&origin=${myLat},${myLng}&destination=${a.latitude},${a.longitude}&travelmode=driving`;
        }
        return `https://www.google.com/maps?q=${a.latitude},${a.longitude}`;
      }
      // No coordinates -> do not provide a maps link to avoid imprecise geocoding
      return null;
    },
    [myLat, myLng]
  );

  // Shorten area to two most-specific segments (e.g., "Street, Barangay" or "Barangay, Town")
  const shortArea = useCallback((area: string) => {
    if (!area) return "";
    const parts = area
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }
    return parts[0] ?? area;
  }, []);

  const kmDistance = useCallback(
    (
      lat1?: number | null,
      lng1?: number | null,
      lat2?: number | null,
      lng2?: number | null
    ) => {
      if (
        lat1 == null ||
        lng1 == null ||
        lat2 == null ||
        lng2 == null ||
        Number.isNaN(lat1) ||
        Number.isNaN(lng1) ||
        Number.isNaN(lat2) ||
        Number.isNaN(lng2)
      )
        return null;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

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

  // Keep report type and alert filter in sync for lost/found
  const handleAlertFilterChange = useCallback((filter: AlertType) => {
    setAlertFilter(filter);
    if (filter === "lost" || filter === "found") {
      setReportType(filter);
    }
  }, []);

  const handleReportTypeChange = useCallback(
    (type: Exclude<AlertType, "all">) => {
      setReportType(type);
      if (type === "lost" || type === "found") {
        setAlertFilter(type);
      }
    },
    []
  );

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

  const handleSubmitReport = async (speciesValue?: string) => {
    const supabase = getSupabaseClient();
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;
    let uploadedLandmarkPaths: string[] = [];

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

    // Upload landmark photos (max 5)
    if (landmarkPhotos.length > 0) {
      const paths: string[] = [];
      for (const file of landmarkPhotos.slice(0, 5)) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
        const uniqueFileName = `${crypto.randomUUID()}${
          fileExt ? `.${fileExt}` : ""
        }`;
        const filePath = `reports/landmarks/${uniqueFileName}`;
        const { data: up, error: err } = await supabase.storage
          .from(PET_MEDIA_BUCKET)
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (err) {
          console.error("Failed to upload landmark photo", err.message ?? err);
          setReportStatus("error");
          return;
        }
        paths.push(up?.path ?? filePath);
      }
      uploadedLandmarkPaths = paths;
    }

    const payload = {
      type: reportType,
      description: reportDescription,
      condition: reportCondition,
      location: reportLocation,
      lat: reportLat,
      lng: reportLng,
      photoPath: uploadedPhotoPath,
      landmarkMediaPaths: uploadedLandmarkPaths,
      species: speciesValue || null,
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        try {
          const data = await response.json();
          console.error(
            "Submit report failed:",
            data?.error ?? response.statusText
          );
        } catch {
          console.error(
            "Submit report failed with status:",
            response.status,
            response.statusText
          );
        }
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
      // Clear landmark previews
      if (landmarkPreviewUrls.length) {
        try {
          landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        } catch {}
      }
      setLandmarkPhotos([]);
      setLandmarkPreviewUrls([]);
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

  // Handle landmark file selection with limits and previews
  const handleLandmarkPhotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const existing = landmarkPhotos.length;
    const availableSlots = Math.max(0, 5 - existing);
    const toAdd = files.slice(0, availableSlots);
    const tooMany = files.length > availableSlots;
    const overSize = toAdd.some((f) => f.size > 5 * 1024 * 1024);
    if (overSize) {
      showToast("error", "Each photo must be under 5 MB.");
      return;
    }
    const newFiles = [...landmarkPhotos, ...toAdd];
    const newUrls = [
      ...landmarkPreviewUrls,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ];
    setLandmarkPhotos(newFiles);
    setLandmarkPreviewUrls(newUrls);
    // Allow selecting the same file again by clearing input value
    try {
      (event.target as HTMLInputElement).value = "";
    } catch {}
    if (tooMany) {
      showToast("error", "You can upload up to 5 landmark photos.");
    }
  };

  const removeLandmarkAt = (index: number) => {
    if (index < 0 || index >= landmarkPhotos.length) return;
    const nextFiles = landmarkPhotos.filter((_, i) => i !== index);
    const nextUrls = landmarkPreviewUrls.filter((u, i) => {
      if (i === index) {
        try {
          URL.revokeObjectURL(u);
        } catch {}
        return false;
      }
      return true;
    });
    setLandmarkPhotos(nextFiles);
    setLandmarkPreviewUrls(nextUrls);
    if (nextFiles.length === 0) {
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
    }
  };

  const clearLandmarkPhotos = () => {
    try {
      landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    } catch {}
    setLandmarkPhotos([]);
    setLandmarkPreviewUrls([]);
    if (landmarkInputRef.current) landmarkInputRef.current.value = "";
    if (landmarkInputMobileRef.current)
      landmarkInputMobileRef.current.value = "";
  };

  return (
    <>
      <main className="pb-24">
        {/* Hero section with quick calls to action and nearby alerts */}
        <section
          id="home"
          className="mx-auto mt-5 max-w-screen-2xl px-4 sm:px-6 lg:px-8 scroll-mt-29 snap-start"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface rounded-2xl p-6 shadow-soft flex flex-col md:h-[520px] lg:h-[590px]">
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
                  Quick Report
                </button>
                <button
                  className="px-5 py-2.5 rounded-2xl font-semibold border-2 border-[#2a9d8f] text-[#2a9d8f] bg-white hover:bg-[#2a9d8f] hover:text-white transition-colors shadow-lg"
                  onClick={() => scrollToTarget("#adoption")}
                  type="button"
                >
                  Adopt a Pet
                </button>
              </div>
              <div className="mt-6 md:hidden">
                <label className="sr-only" htmlFor="pet-search">
                  Search pets
                </label>
                <div ref={searchBoxRef} className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        id="pet-search"
                        className="w-full rounded-xl px-4 py-3"
                        placeholder="Search alerts and adoption..."
                        style={{ border: "1px solid var(--border-color)" }}
                        type="search"
                        value={searchQuery}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchQuery(value);
                          if (searchDebounceRef.current) {
                            window.clearTimeout(searchDebounceRef.current);
                          }
                          searchDebounceRef.current = window.setTimeout(() => {
                            runSearch(value);
                          }, 250);
                          setSearchOpen(value.trim().length > 0);
                        }}
                        onFocus={() => {
                          if (searchQuery.trim().length > 0)
                            setSearchOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setSearchOpen(false);
                          if (e.key === "Enter") {
                            runSearch(searchQuery);
                            setSearchOpen(searchQuery.trim().length > 0);
                          }
                        }}
                      />

                      {false && searchOpen && (
                        <div
                          className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl surface"
                          style={{ border: "1px solid var(--border-color)" }}
                        >
                          <div className="w-full max-h-[60vh] overflow-y-auto">
                            {searchLoading ? (
                              <div className="p-3 text-sm ink-muted">
                                Searching...
                              </div>
                            ) : (
                              <>
                                {searchAlerts.length === 0 &&
                                searchAdoptions.length === 0 ? (
                                  <div className="p-3 text-sm ink-muted">
                                    No matches
                                  </div>
                                ) : (
                                  <>
                                    {searchAlerts.length > 0 && (
                                      <div className="h-[18vh]">
                                        <div className="px-3 py-2 text-xs ink-subtle uppercase tracking-wide pb-2 ">
                                          Alerts
                                        </div>
                                        <ul>
                                          {searchAlerts.map((a) => (
                                            <li
                                              key={`s-a-${a.id}`}
                                              className="cursor-pointer px-3 py-2 hover:bg-[#545454] flex items-center gap-3"
                                              onClick={() => {
                                                setModalItem({
                                                  kind: "alert",
                                                  alert: a,
                                                });
                                              }}
                                            >
                                              {a.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={a.imageUrl}
                                                  alt="alert"
                                                  className="h-8 w-8 rounded-md object-cover"
                                                />
                                              ) : (
                                                <div
                                                  className="grid h-8 w-8 place-content-center rounded-md text-base"
                                                  style={{
                                                    background:
                                                      "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                                  }}
                                                >
                                                  {a.emoji}
                                                </div>
                                              )}
                                              <div className="min-w-0">
                                                <div className="truncate text-sm ink-heading">
                                                  {a.title}
                                                </div>
                                                <div className="truncate text-xs ink-subtle">
                                                  {a.area}
                                                </div>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {searchAdoptions.length > 0 && (
                                      <div>
                                        <div className="px-3 py-2 text-xs ink-subtle uppercase tracking-wide">
                                          Adoption
                                        </div>
                                        <ul>
                                          {searchAdoptions.map((p) => (
                                            <li
                                              key={`s-p-${p.id}`}
                                              className="cursor-pointer px-3 py-2 hover:bg-gray-50/60 flex items-center gap-3"
                                              onClick={() => {
                                                setModalItem({
                                                  kind: "adoption",
                                                  adoption: p,
                                                });
                                              }}
                                            >
                                              <div
                                                className="grid h-8 w-8 place-content-center rounded-md text-base"
                                                style={{
                                                  background:
                                                    "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                                }}
                                              >
                                                {p.emoji}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="truncate text-sm ink-heading">
                                                  {p.name}
                                                </div>
                                                <div className="truncate text-xs ink-subtle">
                                                  {p.kind.toUpperCase()} �{" "}
                                                  {p.location}
                                                </div>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      className="px-5 py-3 rounded-2xl  bg-[#333333] hover:bg-[#535353] text-white transition-colors"
                      type="button"
                      onClick={() => {
                        runSearch(searchQuery);
                        setSearchOpen(searchQuery.trim().length > 0);
                      }}
                    >
                      Search
                    </button>
                  </div>
                  {searchOpen && (
                    <div
                      className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl surface"
                      style={{ border: "1px solid var(--border-color)" }}
                    >
                      <div className="w-full max-h-[60vh] overflow-y-auto">
                        {searchLoading ? (
                          <div className="p-3 text-sm ink-muted">
                            Searching...
                          </div>
                        ) : (
                          <>
                            {searchAlerts.length === 0 &&
                            searchAdoptions.length === 0 ? (
                              <div className="p-3 text-sm ink-muted">
                                No matches
                              </div>
                            ) : (
                              <>
                                {searchAlerts.length > 0 && (
                                  <div className="h-[18vh]">
                                    <div className="px-3 py-2 text-xs ink-subtle uppercase tracking-wide pb-2 ">
                                      Alerts
                                    </div>
                                    <ul>
                                      {searchAlerts.map((a) => (
                                        <li
                                          key={`s-a-${a.id}`}
                                          className="cursor-pointer px-3 py-2 hover:bg-gray-50/60 flex items-center gap-3"
                                          onClick={() => {
                                            setModalItem({
                                              kind: "alert",
                                              alert: a,
                                            });
                                          }}
                                        >
                                          {a.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={a.imageUrl}
                                              alt="alert"
                                              className="h-8 w-8 rounded-md object-cover"
                                            />
                                          ) : (
                                            <div
                                              className="grid h-8 w-8 place-content-center rounded-md text-base"
                                              style={{
                                                background:
                                                  "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                              }}
                                            >
                                              {a.emoji}
                                            </div>
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm ink-heading">
                                              {a.title}
                                            </div>
                                            <div className="truncate text-xs ink-subtle">
                                              {a.area}
                                            </div>
                                          </div>
                                          <button className="btn btn-accent px-2 py-1 text-[12px]">
                                            View
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {searchAdoptions.length > 0 && (
                                  <div>
                                    <div className="px-3 py-2 text-xs ink-subtle uppercase tracking-wide">
                                      Adoption
                                    </div>
                                    <ul>
                                      {searchAdoptions.map((p) => (
                                        <li
                                          key={`s-p-${p.id}`}
                                          className="cursor-pointer px-3 py-2 hover:bg-gray-50/60 flex items-center gap-3"
                                          onClick={() => {
                                            setModalItem({
                                              kind: "adoption",
                                              adoption: p,
                                            });
                                          }}
                                        >
                                          <div
                                            className="grid h-8 w-8 place-content-center rounded-md text-base"
                                            style={{
                                              background:
                                                "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                            }}
                                          >
                                            {p.emoji}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="truncate text-sm ink-heading">
                                              {p.name}
                                            </div>
                                            <div className="truncate text-xs ink-subtle">
                                              {p.kind.toUpperCase()} �{" "}
                                              {p.location}
                                            </div>
                                          </div>
                                          <div className="text-xs ink-subtle whitespace-nowrap ml-2">
                                            View &gt;
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="surface rounded-2xl p-6 shadow-soft flex flex-col h-[590px]">
              <h2 className="px-1 text-2xl font-extrabold tracking-tight ink-heading">
                Reports Near You
              </h2>
              <div className="mt-3 flex-1 overflow-y-auto">
                <ul className="space-y-3">
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
                  {nearbyAlerts.map((alert) => {
                    const dist = kmDistance(
                      myLat,
                      myLng,
                      alert.latitude,
                      alert.longitude
                    );
                    return (
                      <li key={alert.id} className="surface rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {alert.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={alert.imageUrl}
                                alt="alert photo"
                                className="h-15 w-15 rounded-xl object-cover"
                              />
                            ) : (
                              <div
                                className="grid h-15 w-15 place-content-center rounded-xl text-xl"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                }}
                              >
                                {alert.emoji}
                              </div>
                            )}
                            <div>
                              <p className="font-medium ink-heading">
                                {alert.title}
                              </p>
                              <p className="text-sm ink-heading">
                                {shortArea(alert.area)}
                              </p>
                              <p className="text-xs ink-muted">
                                {timeAgoFromMinutes(alert.minutes)}
                                {dist != null
                                  ? ` • ${dist.toFixed(1)} km away`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          {(() => {
                            const link = getMapsLink(alert);
                            return link ? (
                              <a
                                className="btn btn-primary px-4 py-2 text-[12px]"
                                style={{
                                  border: "1px solid var(--border-color)",
                                }}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open Google Maps
                              </a>
                            ) : null;
                          })()}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {/*<div className="mt-4">
                <a
                  className="hover:underline"
                  href="#alerts"
                  style={{ color: "var(--primary-green)" }}
                >
                  View all alerts {"->"}
                </a>
              </div>*/}
            </div>
          </div>
        </section>

        <AlertsSection
          filters={ALERT_FILTERS}
          activeFilter={alertFilter}
          onFilterChange={handleAlertFilterChange}
          filteredAlerts={filteredAlerts}
          myLat={myLat}
          myLng={myLng}
        />

        <ReportSection
          reportType={reportType}
          setReportType={handleReportTypeChange}
          reportDescription={reportDescription}
          setReportDescription={setReportDescription}
          reportCondition={reportCondition}
          setReportCondition={setReportCondition}
          reportLocation={reportLocation}
          setReportLocation={setReportLocation}
          reportLat={reportLat}
          reportLng={reportLng}
          setReportCoords={(lat, lng) => {
            setReportLat(lat);
            setReportLng(lng);
          }}
          reportPhotoName={reportPhotoName}
          reportStatus={reportStatus}
          handlePhotoChange={handlePhotoChange}
          handleSubmitReport={handleSubmitReport}
          reportPhotoInputRef={reportPhotoInputRef}
          reportPhotoPreviewUrl={reportPhotoPreviewUrl}
          landmarkPreviewUrls={landmarkPreviewUrls}
          handleLandmarkPhotosChange={handleLandmarkPhotosChange}
          removeLandmarkAt={removeLandmarkAt}
          clearLandmarkPhotos={clearLandmarkPhotos}
          landmarkInputRef={landmarkInputRef}
          landmarkInputMobileRef={landmarkInputMobileRef}
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

        {/*<CrueltySection />*/}

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
                <link.icon className="mx-auto mb-1 h-5 w-5" />
                <div className="text-[11px]">{link.label}</div>
              </a>
            ))}
          </div>
        </nav>
      </main>
      {/* DetailsModal moved to global layout */}
    </>
  );
}
