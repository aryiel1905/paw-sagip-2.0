"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  fetchAlerts,
  fetchAlertsGrouped,
  fetchAdoptionPets,
  searchAlerts as searchAlertsApi,
  searchAdoptionPets as searchAdoptionPetsApi,
  PET_MEDIA_BUCKET,
  subscribeToAlertsIncremental,
  subscribeToAdoptionsIncremental,
} from "@/data/supabaseApi";
import {
  AlertType,
  Alert,
  AdoptionPet,
  ReportStatus,
  AlertRow,
  AdoptionRow,
} from "@/types/app";
import { AlertsSection } from "@/components/AlertsSection";
import {
  ALERTS_NOTIFY_KEY,
  SYSTEM_NOTIFY_KEY,
  getNotifyEnabled,
  getSystemNotifyEnabled,
  notifyNewAlertWithDetails,
  ensureAudioReady,
} from "@/lib/notify";
import { ReportSection } from "@/components/ReportSection";
import { VideoTrimModal } from "@/components/VideoTrimModal";
import { RegistrySection } from "@/components/RegistrySection";
import { AdoptionSection } from "@/components/AdoptionSection";
import { CrueltySection } from "@/components/CrueltySection";
import { showToast } from "@/lib/toast";
import {
  CARD_VIDEO_FALLBACK_ICON,
  createTrimmedVideoFile,
  createVideoThumbnailBlob,
  getMediaKindFromFile,
  getVideoDuration,
  isVideoFile,
  isVideoUrl,
} from "@/lib/media";
import {
  HeartHandshake,
  BellRing,
  ClipboardList,
  House,
  User,
} from "lucide-react";

// Storage bucket name used when uploading report photos (centralized)
// Imported from data module for consistency across the app.

// Links backing the fixed mobile bottom navigation
const MOBILE_NAV_LINKS = [
  { href: "#home", label: "Home", icon: House },
  { href: "#alerts", label: "Alerts", icon: BellRing },
  { href: "#report", label: "Report", icon: ClipboardList },
  { href: "#adoption", label: "Adoption", icon: HeartHandshake },
];

// Per-section offsets (px) for the fixed mobile bottom nav
const MOBILE_NAV_OFFSETS: Record<string, number> = {
  "#home": 88,
  "#alerts": 88,
  "#report": 88,
  "#adoption": 88,
};

// Alerts section now shows three grouped panels (Found, Lost, Cruelty) without chips.

// Union type for search modal selection
type ModalItem =
  | { kind: "alert"; alert: Alert }
  | { kind: "adoption"; adoption: AdoptionPet }
  | null;

type TrimInfo = { start: number; end: number; duration: number };
type LandmarkMediaItem = {
  file: File;
  url: string;
  kind: "image" | "video";
  trim?: TrimInfo;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 20;
const MAX_RAW_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;

// Emoji fallback for missing photos based on species
function speciesToEmoji(species?: string | null) {
  const s = (species ?? "").trim().toLowerCase();
  if (/^others?(?:\b|;)/.test(s)) return "🐾";
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
      Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000),
    );
  }
  return 0;
}

export default function Home() {
  const router = useRouter();
  // Reactive state hooks grouped by feature (alerts, adoption, report wizard, UI helpers)
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const liveNotifyRef = useRef<boolean>(false);
  const [adoptions, setAdoptions] = useState<AdoptionPet[]>([]);
  const [showPetProfile, setShowPetProfile] = useState(false);
  const [adoptionFilter, setAdoptionFilter] = useState<"all" | "dog" | "cat">(
    "all",
  );
  const [reportPhotoPreviewUrl, setReportPhotoPreviewUrl] = useState<
    string | null
  >(null);

  const [adoptionSort, setAdoptionSort] = useState<"nearest" | "newest">(
    "nearest",
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
  const [reportPhotoKind, setReportPhotoKind] = useState<
    "image" | "video" | null
  >(null);
  const [reportPhotoTrim, setReportPhotoTrim] = useState<TrimInfo | null>(null);
  const [mainExtraMedia, setMainExtraMedia] = useState<LandmarkMediaItem[]>([]);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const reportPhotoInputRef = useRef<HTMLInputElement>(null!);
  const landmarkInputRef = useRef<HTMLInputElement>(null!);
  const landmarkInputMobileRef = useRef<HTMLInputElement>(null!);
  const isMountedRef = useRef(true);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);
  // Landmark photos (multiple)
  const [landmarkMedia, setLandmarkMedia] = useState<LandmarkMediaItem[]>([]);
  const [isReadyAuth, setIsReadyAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [trimQueue, setTrimQueue] = useState<
    {
      file: File;
      duration: number;
      target: "main" | "landmark";
      slot?: "primary" | "extra";
    }[]
  >([]);
  const [activeTrim, setActiveTrim] = useState<{
    file: File;
    duration: number;
    target: "main" | "landmark";
    slot?: "primary" | "extra";
  } | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimPreviewUrl, setTrimPreviewUrl] = useState<string | null>(null);
  const trimPreviewUrlRef = useRef<string | null>(null);
  const latestPrimaryPreviewRef = useRef<string | null>(null);
  const latestMainExtraMediaRef = useRef<LandmarkMediaItem[]>([]);
  const latestLandmarkMediaRef = useRef<LandmarkMediaItem[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAlerts, setSearchAlerts] = useState<Alert[]>([]);
  const [searchAdoptions, setSearchAdoptions] = useState<AdoptionPet[]>([]);
  const [modalItem, setModalItem] = useState<ModalItem>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

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
    [],
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
        // Abort previous search
        try {
          searchControllerRef.current?.abort();
        } catch {}
        const controller = new AbortController();
        searchControllerRef.current = controller;

        // Parallelize searches
        const [alertsListRaw, adoptListRaw] = await Promise.all([
          searchAlertsApi(q, 25, { signal: controller.signal }),
          searchAdoptionPetsApi(q, 25, { signal: controller.signal }),
        ]);
        let alertsList: Alert[] = alertsListRaw;

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
        let adoptList: AdoptionPet[] = adoptListRaw;

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
          startTransition(() => {
            setSearchAlerts(alertsList);
            setSearchAdoptions(adoptList);
          });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (e instanceof Error && e.name === "AbortError") return;
        console.error("Search failed", e);
      } finally {
        if (isMountedRef.current) setSearchLoading(false);
      }
    },
    [scoreText],
  );

  const loadAlerts = useCallback(async () => {
    const data = await fetchAlertsGrouped(6);
    if (isMountedRef.current) setAlerts(data);
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

  // Lightweight auth-state for mobile bottom nav
  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getSession().then(({ data }) => {
        setIsLoggedIn(!!data.session?.user);
        setIsReadyAuth(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        setIsLoggedIn(!!session?.user);
      });
      return () => {
        try {
          data.subscription.unsubscribe();
        } catch {}
      };
    } catch {
      setIsReadyAuth(true);
    }
  }, []);

  // If navigated to home with ?goto=section, scroll to that section once mounted
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const goto = (url.searchParams.get("goto") || "").trim();
    if (!goto) return;
    const target = goto.startsWith("#") ? goto : `#${goto}`;
    // Use same helper to perform smooth scroll with offset
    scrollToTarget(target);
    // Clean up the query param to keep the URL tidy
    url.searchParams.delete("goto");
    window.history.replaceState(null, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
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
    // Incremental realtime updates to avoid reload flicker
    const unsubscribe = subscribeToAlertsIncremental({
      onInsert: (a) => {
        setAlerts((prev) => [a, ...prev].slice(0, 50));
        try {
          const title = (a as any)?.title || "New report";
          const area = (a as any)?.area || (a as any)?.location || "";
          const label = area ? `${title} • ${area}` : String(title);
          showToast("info", `New report: ${label}`);
        } catch {}
        // Notify (sound and/or system) if either preference enabled
        if (liveNotifyRef.current) {
          try {
            const details = {
              type: (a as any)?.type,
              title: (a as any)?.title ?? null,
              location: (a as any)?.near ?? (a as any)?.location ?? null,
            };
            notifyNewAlertWithDetails(details);
          } catch {
            notifyNewAlertWithDetails();
          }
        }
      },
      onUpdate: (a) =>
        setAlerts((prev) => prev.map((x) => (x.id === a.id ? a : x))),
      onDelete: (id) => setAlerts((prev) => prev.filter((x) => x.id !== id)),
    });
    return () => unsubscribe();
  }, []);

  // Load adoption listings once and ignore late responses after unmount
  useEffect(() => {
    let ignore = false;
    async function loadAdoptionsOnce() {
      const data = await fetchAdoptionPets(50);
      if (!ignore) setAdoptions(data);
    }
    loadAdoptionsOnce();
    const unsubscribe = subscribeToAdoptionsIncremental({
      onInsert: (p) => setAdoptions((prev) => [p, ...prev].slice(0, 50)),
      onUpdate: (p) =>
        setAdoptions((prev) => prev.map((x) => (x.id === p.id ? p : x))),
      onDelete: (id) => setAdoptions((prev) => prev.filter((x) => x.id !== id)),
    });
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, []);

  // Initialize and keep notify preference in a ref
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const enabled = getNotifyEnabled() || getSystemNotifyEnabled();
      liveNotifyRef.current = enabled;
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === ALERTS_NOTIFY_KEY || e.key === SYSTEM_NOTIFY_KEY) {
        read();
      }
    };
    const onCustom = () => read();
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "ps:alertsNotifyChanged",
      onCustom as EventListener,
    );
    window.addEventListener(
      "ps:alertsSystemNotifyChanged",
      onCustom as EventListener,
    );
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "ps:alertsNotifyChanged",
        onCustom as EventListener,
      );
      window.removeEventListener(
        "ps:alertsSystemNotifyChanged",
        onCustom as EventListener,
      );
    };
  }, []);

  // Once per session: on first user gesture, if notifications are enabled, unlock audio context
  useEffect(() => {
    if (typeof window === "undefined") return;
    let unlocked = false;
    const unlock = async () => {
      if (unlocked) return;
      unlocked = true;
      try {
        if (getNotifyEnabled()) {
          await ensureAudioReady();
        }
      } catch {}
      cleanup();
    };
    const cleanup = () => {
      try {
        window.removeEventListener("pointerdown", unlock as EventListener);
        window.removeEventListener("keydown", unlock as EventListener);
        window.removeEventListener("touchstart", unlock as EventListener);
      } catch {}
    };
    window.addEventListener(
      "pointerdown",
      unlock as EventListener,
      { once: true } as any,
    );
    window.addEventListener(
      "keydown",
      unlock as EventListener,
      { once: true } as any,
    );
    window.addEventListener(
      "touchstart",
      unlock as EventListener,
      { once: true } as any,
    );
    return cleanup;
  }, []);

  const nearbyAlerts = useMemo(
    () =>
      alerts.filter(
        (a) => a.type === "lost" || a.type === "found" || a.type === "cruelty",
      ),
    [alerts],
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
    [myLat, myLng],
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
      lng2?: number | null,
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
    [],
  );

  // Alerts are grouped by type within AlertsSection; no local filtering here.

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

  // Alert filter chips removed; keep report type independent.

  const handleReportTypeChange = useCallback(
    (type: Exclude<AlertType, "all">) => {
      setReportType(type);
    },
    [],
  );

  const clearMainMedia = useCallback(() => {
    setReportPhoto(null);
    setReportPhotoName("");
    setReportPhotoKind(null);
    setReportPhotoTrim(null);
    setReportPhotoPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setMainExtraMedia((prev) => {
      prev.forEach((item) => {
        try {
          URL.revokeObjectURL(item.url);
        } catch {}
      });
      return [];
    });
  }, []);

  const setMainMedia = useCallback(
    (file: File, kind: "image" | "video", trim?: TrimInfo) => {
      setReportPhoto(file);
      setReportPhotoName(file.name);
      setReportPhotoKind(kind);
      setReportPhotoTrim(trim ?? null);
      setReportPhotoPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return URL.createObjectURL(file);
      });
    },
    [],
  );

  const addExtraMainMedia = useCallback((file: File, trim?: TrimInfo) => {
    const url = URL.createObjectURL(file);
    setMainExtraMedia((prev) => [
      ...prev,
      { file, url, kind: getMediaKindFromFile(file), trim },
    ]);
  }, []);

  const removeMainMediaAt = useCallback(
    (index: number) => {
      if (index < 0) return;
      if (index === 0) {
        if (mainExtraMedia.length > 0) {
          const [nextPrimary, ...remaining] = mainExtraMedia;
          setReportPhoto(nextPrimary.file);
          setReportPhotoName(nextPrimary.file.name);
          setReportPhotoKind(nextPrimary.kind);
          setReportPhotoTrim(nextPrimary.trim ?? null);
          setReportPhotoPreviewUrl((prev) => {
            if (prev) {
              try {
                URL.revokeObjectURL(prev);
              } catch {}
            }
            return nextPrimary.url;
          });
          setMainExtraMedia(remaining);
          return;
        }
        clearMainMedia();
        try {
          if (reportPhotoInputRef.current) reportPhotoInputRef.current.value = "";
        } catch {}
        return;
      }
      setMainExtraMedia((prev) => {
        const target = prev[index - 1];
        if (!target) return prev;
        try {
          URL.revokeObjectURL(target.url);
        } catch {}
        return prev.filter((_, i) => i !== index - 1);
      });
    },
    [clearMainMedia, mainExtraMedia]
  );

  const mainMediaItems = useMemo(
    () => [
      ...(reportPhoto && reportPhotoPreviewUrl && reportPhotoKind
        ? [
            {
              url: reportPhotoPreviewUrl,
              kind: reportPhotoKind,
            },
          ]
        : []),
      ...mainExtraMedia.map((item) => ({ url: item.url, kind: item.kind })),
    ],
    [mainExtraMedia, reportPhoto, reportPhotoKind, reportPhotoPreviewUrl]
  );

  const addLandmarkMedia = useCallback((file: File, trim?: TrimInfo) => {
    const url = URL.createObjectURL(file);
    setLandmarkMedia((prev) => [
      ...prev,
      { file, url, kind: getMediaKindFromFile(file), trim },
    ]);
  }, []);

  useEffect(() => {
    if (activeTrim || trimQueue.length === 0) return;
    const [next, ...rest] = trimQueue;
    setTrimQueue(rest);
    setActiveTrim(next);
    setTrimStart(0);
    setTrimEnd(Math.min(next.duration, MAX_VIDEO_SECONDS));
  }, [activeTrim, trimQueue]);

  useEffect(() => {
    if (!activeTrim) {
      if (trimPreviewUrlRef.current) {
        try {
          URL.revokeObjectURL(trimPreviewUrlRef.current);
        } catch {}
        trimPreviewUrlRef.current = null;
      }
      setTrimPreviewUrl((prev) => (prev ? null : prev));
      return;
    }
    const url = URL.createObjectURL(activeTrim.file);
    if (trimPreviewUrlRef.current) {
      try {
        URL.revokeObjectURL(trimPreviewUrlRef.current);
      } catch {}
    }
    trimPreviewUrlRef.current = url;
    setTrimPreviewUrl(url);
    return () => {
      if (trimPreviewUrlRef.current === url) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        trimPreviewUrlRef.current = null;
      }
    };
  }, [activeTrim]);

  const clampTrim = useCallback(
    (start: number, end: number, duration: number) => {
      const safeDuration = Math.max(0, duration || 0);
      const s = Math.max(0, Math.min(start, safeDuration));
      let e = Math.max(0, Math.min(end, safeDuration));
      if (e - s > MAX_VIDEO_SECONDS) {
        e = Math.min(s + MAX_VIDEO_SECONDS, safeDuration);
      }
      if (e < s) e = s;
      return { s, e };
    },
    [],
  );

  const onTrimStartChange = useCallback(
    (value: number) => {
      if (!activeTrim) return;
      const next = clampTrim(value, trimEnd, activeTrim.duration);
      setTrimStart(next.s);
      setTrimEnd(next.e);
    },
    [activeTrim, clampTrim, trimEnd],
  );

  const onTrimEndChange = useCallback(
    (value: number) => {
      if (!activeTrim) return;
      const next = clampTrim(trimStart, value, activeTrim.duration);
      setTrimStart(next.s);
      setTrimEnd(next.e);
    },
    [activeTrim, clampTrim, trimStart],
  );

  const onTrimRangeChange = useCallback(
    (startValue: number, endValue: number) => {
      if (!activeTrim) return;
      const next = clampTrim(startValue, endValue, activeTrim.duration);
      setTrimStart(next.s);
      setTrimEnd(next.e);
    },
    [activeTrim, clampTrim]
  );

  const confirmTrim = useCallback(() => {
    if (!activeTrim) return;
    const info: TrimInfo = {
      start: trimStart,
      end: trimEnd,
      duration: activeTrim.duration,
    };
    if (activeTrim.target === "main") {
      if (activeTrim.slot === "extra") {
        addExtraMainMedia(activeTrim.file, info);
      } else {
        setMainMedia(activeTrim.file, "video", info);
      }
    } else {
      addLandmarkMedia(activeTrim.file, info);
    }
    setActiveTrim(null);
  }, [activeTrim, addExtraMainMedia, addLandmarkMedia, setMainMedia, trimEnd, trimStart]);

  const cancelTrim = useCallback(() => {
    if (!activeTrim) return;
    setActiveTrim(null);
  }, [activeTrim]);

  const isAllowedVideo = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    const allowedExt =
      name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm");
    const allowedType =
      file.type === "video/mp4" ||
      file.type === "video/quicktime" ||
      file.type === "video/webm";
    return allowedExt || allowedType;
  }, []);

  // Track the selected photo/video locally so it can be uploaded prior to submitting the report
  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const existing = (reportPhoto ? 1 : 0) + mainExtraMedia.length;
    const available = Math.max(0, 5 - existing);
    const toAdd = files.slice(0, available);
    let needsPrimary = existing === 0;

    for (const file of toAdd) {
      const slot: "primary" | "extra" = needsPrimary ? "primary" : "extra";
      const isVideo = isVideoFile(file);
      if (isVideo) {
        if (!isAllowedVideo(file)) {
          showToast("error", "Only MP4, MOV, or WEBM videos are allowed.");
          continue;
        }
        if (file.size > MAX_VIDEO_BYTES) {
          showToast("error", "Each video must be under 100 MB.");
          continue;
        }
        try {
          const duration = await getVideoDuration(file);
          if (duration > MAX_VIDEO_SECONDS) {
            setTrimQueue((prev) => [...prev, { file, duration, target: "main", slot }]);
          } else if (slot === "primary") {
            setMainMedia(file, "video", { start: 0, end: duration, duration });
          } else {
            addExtraMainMedia(file, { start: 0, end: duration, duration });
          }
          needsPrimary = false;
        } catch {
          showToast("error", "Unable to read video duration.");
        }
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        showToast("error", "Each photo must be under 5 MB.");
        continue;
      }
      if (slot === "primary") {
        setMainMedia(file, "image");
      } else {
        addExtraMainMedia(file);
      }
      needsPrimary = false;
    }

    try {
      event.target.value = "";
    } catch {}
    if (files.length > available) {
      showToast("error", "You can upload up to 5 main media items.");
    }
  };

  // Handle the full report submission flow including optional photo upload
  // and error handling. Resets the form on success and reloads alerts.
  useEffect(() => {
    latestPrimaryPreviewRef.current = reportPhotoPreviewUrl;
  }, [reportPhotoPreviewUrl]);

  useEffect(() => {
    latestMainExtraMediaRef.current = mainExtraMedia;
  }, [mainExtraMedia]);

  useEffect(() => {
    latestLandmarkMediaRef.current = landmarkMedia;
  }, [landmarkMedia]);

  useEffect(() => {
    return () => {
      if (latestPrimaryPreviewRef.current) {
        URL.revokeObjectURL(latestPrimaryPreviewRef.current);
      }
      try {
        latestMainExtraMediaRef.current.forEach((item) =>
          URL.revokeObjectURL(item.url)
        );
        latestLandmarkMediaRef.current.forEach((item) =>
          URL.revokeObjectURL(item.url)
        );
      } catch {}
    };
  }, []);

  type QuickReporter = {
    reporterContact?: string | null;
    reporterName?: string | null;
    isAnonymous?: boolean;
    petStatus?: "roaming" | "in_custody";
    eventAt?: string | null;
    features?: string | null;
    isAggressive?: boolean;
    isFriendly?: boolean;
  };

  const uploadProcessedVideo = async (
    file: File,
    target: "reports" | "reports/landmarks",
    trim?: TrimInfo | null,
  ) => {
    const sourceFile =
      trim && Number.isFinite(trim.end - trim.start)
        ? await createTrimmedVideoFile(file, {
            startSeconds: trim.start,
            endSeconds: trim.end,
          })
        : file;
    if (sourceFile.size > MAX_RAW_VIDEO_UPLOAD_BYTES) {
      throw new Error(
        "The selected clip is still too large to upload. Please trim it shorter or use a smaller video.",
      );
    }
    const supabase = getSupabaseClient();
    const ext = sourceFile.name.split(".").pop()?.toLowerCase() || "webm";
    const rawPath = `${target}/raw/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(PET_MEDIA_BUCKET)
      .upload(rawPath, sourceFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: sourceFile.type || "application/octet-stream",
      });
    if (uploadError) {
      throw new Error(uploadError.message ?? "Raw video upload failed");
    }
    const form = new FormData();
    form.append("sourcePath", rawPath);
    form.append("target", target);
    form.append("cleanupSource", "true");
    const res = await fetch("/api/media/ingest", {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.path) {
      throw new Error(data?.error || "Video upload failed");
    }
    return data.path as string;
  };

  const uploadMainVideoThumbnail = async (file: File, trim?: TrimInfo | null) => {
    const seekSeconds = Math.max(0.2, (trim?.start ?? 0) + 0.2);
    const blob = await createVideoThumbnailBlob(file, { seekSeconds });
    const filePath = `reports/${crypto.randomUUID()}-thumb.jpg`;
    const { data, error } = await getSupabaseClient().storage
      .from(PET_MEDIA_BUCKET)
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });
    if (error) {
      throw new Error(error.message ?? "Thumbnail upload failed");
    }
    return data?.path ?? filePath;
  };

  const handleSubmitReport = async (
    speciesValue?: string,
    reporter?: QuickReporter,
  ) => {
    const supabase = getSupabaseClient();
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;
    let uploadedVideoThumbnailPath: string | null = null;
    let uploadedLandmarkPaths: string[] = [];

    if (reportPhoto) {
      if (reportPhotoKind === "video") {
        try {
          uploadedPhotoPath = await uploadProcessedVideo(
            reportPhoto,
            "reports",
            reportPhotoTrim,
          );
          uploadedVideoThumbnailPath = await uploadMainVideoThumbnail(
            reportPhoto,
            reportPhotoTrim,
          );
        } catch (err) {
          console.error("Failed to upload report video or thumbnail", err);
          setReportStatus("error");
          return;
        }
      } else {
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
            uploadError.message ?? uploadError,
          );
          setReportStatus("error");
          return;
        }

        uploadedPhotoPath = uploadData?.path ?? filePath;
      }
    }

    const attachedMedia = [...mainExtraMedia, ...landmarkMedia];
    // Upload attached media (main extras + landmarks, max 5)
    if (attachedMedia.length > 0) {
      const paths: string[] = [];
      for (const item of attachedMedia.slice(0, 5)) {
        if (item.kind === "video") {
          try {
            const path = await uploadProcessedVideo(
              item.file,
              "reports/landmarks",
              item.trim,
            );
            paths.push(path);
          } catch (err) {
            console.error("Failed to upload landmark video", err);
            setReportStatus("error");
            return;
          }
        } else {
          const fileExt = item.file.name.split(".").pop()?.toLowerCase() ?? "";
          const uniqueFileName = `${crypto.randomUUID()}${
            fileExt ? `.${fileExt}` : ""
          }`;
          const filePath = `reports/landmarks/${uniqueFileName}`;
          const { data: up, error: err } = await supabase.storage
            .from(PET_MEDIA_BUCKET)
            .upload(filePath, item.file, {
              cacheControl: "3600",
              upsert: false,
            });
          if (err) {
            console.error(
              "Failed to upload landmark photo",
              err.message ?? err,
            );
            setReportStatus("error");
            return;
          }
          paths.push(up?.path ?? filePath);
        }
      }
      uploadedLandmarkPaths = paths;
    }

    // Determine anonymous from passed value, fallback to draft if present
    let draftAnon = reporter?.isAnonymous ?? false;
    if (reporter?.isAnonymous == null) {
      try {
        const raw =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem("reportDraft")
            : null;
        if (raw) {
          const d = JSON.parse(raw);
          if (d && typeof d.anonymous === "boolean") draftAnon = d.anonymous;
        }
      } catch {}
    }

    const payload = {
      type: reportType,
      description: reportDescription,
      condition: reportCondition,
      location: reportLocation,
      lat: reportLat,
      lng: reportLng,
      photoPath: uploadedPhotoPath,
      videoThumbnailPath: uploadedVideoThumbnailPath,
      landmarkMediaPaths: uploadedLandmarkPaths,
      species: speciesValue || null,
      isAnonymous: draftAnon,
      // iREPORT pet status
      petStatus: reporter?.petStatus ?? "roaming",
      eventAt: reporter?.eventAt ?? null,
      features: reporter?.features ?? null,
      // Map quick reporter info (server will null these if anonymous)
      reporterContact: draftAnon
        ? null
        : reporter?.reporterContact?.trim?.() || null,
      reporterName: draftAnon ? null : reporter?.reporterName?.trim?.() || null,
      isAggressive: reporter?.isAggressive ?? null,
      isFriendly: reporter?.isFriendly ?? null,
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
            data?.error ?? response.statusText,
          );
        } catch {
          console.error(
            "Submit report failed with status:",
            response.status,
            response.statusText,
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
      setReportPhotoKind(null);
      setReportPhotoTrim(null);
      setMainExtraMedia((prev) => {
        prev.forEach((item) => {
          try {
            URL.revokeObjectURL(item.url);
          } catch {}
        });
        return [];
      });
      if (reportPhotoInputRef.current) {
        reportPhotoInputRef.current.value = "";
      }
      if (reportPhotoPreviewUrl) {
        URL.revokeObjectURL(reportPhotoPreviewUrl);
        setReportPhotoPreviewUrl(null);
      }
      clearLandmarkPhotos();
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
  const handleLandmarkPhotosChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const existing = landmarkMedia.length;
    const availableSlots = Math.max(0, 5 - existing);
    const toAdd = files.slice(0, availableSlots);
    const tooMany = files.length > availableSlots;

    for (const file of toAdd) {
      const isVideo = isVideoFile(file);
      if (isVideo) {
        if (!isAllowedVideo(file)) {
          showToast("error", "Only MP4, MOV, or WEBM videos are allowed.");
          continue;
        }
        if (file.size > MAX_VIDEO_BYTES) {
          showToast("error", "Each video must be under 100 MB.");
          continue;
        }
        try {
          const duration = await getVideoDuration(file);
          if (duration > MAX_VIDEO_SECONDS) {
            setTrimQueue((prev) => [
              ...prev,
              { file, duration, target: "landmark" },
            ]);
          } else {
            addLandmarkMedia(file, { start: 0, end: duration, duration });
          }
        } catch {
          showToast("error", "Unable to read video duration.");
        }
      } else {
        if (file.size > MAX_IMAGE_BYTES) {
          showToast("error", "Each photo must be under 5 MB.");
          continue;
        }
        addLandmarkMedia(file);
      }
    }

    // Allow selecting the same file again by clearing input value
    try {
      (event.target as HTMLInputElement).value = "";
    } catch {}
    if (tooMany) {
      showToast("error", "You can upload up to 5 landmark items.");
    }
  };

  const removeLandmarkAt = (index: number) => {
    if (index < 0 || index >= landmarkMedia.length) return;
    setLandmarkMedia((prev) => {
      const target = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (target?.url) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {}
      }
      return next;
    });
    if (landmarkMedia.length === 1) {
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
    }
  };

  const clearLandmarkPhotos = () => {
    try {
      landmarkMedia.forEach((item) => URL.revokeObjectURL(item.url));
    } catch {}
    setLandmarkMedia([]);
    if (landmarkInputRef.current) landmarkInputRef.current.value = "";
    if (landmarkInputMobileRef.current)
      landmarkInputMobileRef.current.value = "";
  };

  useEffect(() => {
    // Hide scrollbar for the whole page while on Home
    document.documentElement.classList.add("scrollbar-none");
    document.body.classList.add("scrollbar-none");
    return () => {
      document.documentElement.classList.remove("scrollbar-none");
      document.body.classList.remove("scrollbar-none");
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-home-reveal]"),
    );
    if (nodes.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      nodes.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
          } else {
            el.classList.remove("is-visible");
          }
        });
      },
      {
        root: null,
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    nodes.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <main className="pt-5 pb-24 md:pb-0">
        {/* Hero section with quick calls to action and nearby alerts */}
        <section
          id="home"
          className="mb-11.5 mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 scroll-mt-30 min-h-[calc(100svh-64px)] flex items-center md:block md:min-h-0 relative"
          style={{ scrollMarginTop: 91 }}
        >
          <div className="mb-3 max-w-7xl mx-auto pb-15 px-4 grid grid-cols-1 gap-10 md:grid-cols-[40%_60%] xl:grid-cols-[35%_65%] items-center">
            <div
              data-home-reveal
              className="home-reveal order-last md:order-first text-left"
              style={{ transitionDelay: "40ms" }}
            >
              <h1 className="hero-title">
                Find.
                <br />
                <span className="hero-title--accent">Rescue.</span>
                <br />
                Reunite.
              </h1>

              <p className="hero-sub mt-2">
                Report lost or found pets, and help coordinate safe rescues in
                your barangay.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 justify-start">
                <button
                  className="flex flex-1 btn btn-accent btn-xl border-2 border-[var(--primary-orange)] shadow-2xl whitespace-nowrap"
                  data-onboard="quick-report"
                  onClick={() => scrollToTarget("#report")}
                  type="button"
                >
                  Quick Report
                </button>
                <button
                  className="flex flex-1 btn btn-accent btn-xl border-2 border-[var(--primary-orange)] shadow-2xl whitespace-nowrap"
                  onClick={() => scrollToTarget("#adoption")}
                  type="button"
                >
                  Adopt a Pet
                </button>
              </div>
              <div className="mt-6 hidden md:hidden">
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
                                          {searchAlerts.map((a) => {
                                            const previewUrl =
                                              a.previewImageUrl ?? a.imageUrl;
                                            return <li
                                              key={`s-a-${a.id}`}
                                              className="cursor-pointer px-3 py-2 hover:bg-[#545454] flex items-center gap-3"
                                              onClick={() => {
                                                setModalItem({
                                                  kind: "alert",
                                                  alert: a,
                                                });
                                              }}
                                            >
                                              {previewUrl ? (
                                                isVideoUrl(previewUrl) ? (
                                                  <div
                                                    className="grid h-8 w-8 place-content-center rounded-md text-base"
                                                    style={{
                                                      background:
                                                        "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                                    }}
                                                  >
                                                    {CARD_VIDEO_FALLBACK_ICON}
                                                  </div>
                                                ) : (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img
                                                    src={previewUrl}
                                                    alt="alert"
                                                    className="h-8 w-8 rounded-md object-cover"
                                                  />
                                                )
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
                                            </li>;
                                          })}
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
                                      {searchAlerts.map((a) => {
                                        const previewUrl =
                                          a.previewImageUrl ?? a.imageUrl;
                                        return <li
                                          key={`s-a-${a.id}`}
                                          className="cursor-pointer px-3 py-2 hover:bg-gray-50/60 flex items-center gap-3"
                                          onClick={() => {
                                            setModalItem({
                                              kind: "alert",
                                              alert: a,
                                            });
                                          }}
                                        >
                                          {previewUrl ? (
                                            isVideoUrl(previewUrl) ? (
                                              <div
                                                className="grid h-8 w-8 place-content-center rounded-md text-base"
                                                style={{
                                                  background:
                                                    "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                                }}
                                              >
                                                {CARD_VIDEO_FALLBACK_ICON}
                                              </div>
                                            ) : (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={previewUrl}
                                                alt="alert"
                                                className="h-8 w-8 rounded-md object-cover"
                                              />
                                            )
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
                                        </li>;
                                      })}
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

            <div
              data-home-reveal
              className="home-reveal w-full relative order-first md:order-last mb-8 md:mb-0 hidden md:flex justify-center"
              style={{ transitionDelay: "120ms" }}
            >
              <div className="hero-ellipse-shadow" aria-hidden="true"></div>
              <Image
                src="/LandingPage_PawSagip.webp"
                alt="Illustration of rescuing pets"
                width={700}
                height={520}
                loading="lazy"
                fetchPriority="low"
                className="relative z-10 w-full h-auto max-w-md md:max-w-none"
              />
            </div>
          </div>
        </section>

        <div data-home-reveal className="home-reveal">
          <AlertsSection alerts={alerts} />
        </div>

        <div data-home-reveal className="home-reveal">
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
            mainMediaItems={mainMediaItems}
            removeMainMediaAt={removeMainMediaAt}
            landmarkMedia={landmarkMedia.map((item) => ({
              url: item.url,
              kind: item.kind,
            }))}
            handleLandmarkPhotosChange={handleLandmarkPhotosChange}
            removeLandmarkAt={removeLandmarkAt}
            clearLandmarkPhotos={clearLandmarkPhotos}
            landmarkInputRef={landmarkInputRef}
            landmarkInputMobileRef={landmarkInputMobileRef}
          />
        </div>

        <div data-home-reveal className="home-reveal">
          <AdoptionSection
            adoptionResults={adoptionResults}
            adoptionFilter={adoptionFilter}
            setAdoptionFilter={setAdoptionFilter}
            adoptionSort={adoptionSort}
            setAdoptionSort={setAdoptionSort}
          />
        </div>

        <nav className="fixed inset-x-0 bottom-3 px-3 md:hidden z-40">
          <div className="surface mx-auto grid max-w-lg grid-flow-col auto-cols-fr rounded-2xl text-center text-sm shadow-soft">
            {(isReadyAuth
              ? [
                  ...MOBILE_NAV_LINKS,
                  ...(isLoggedIn
                    ? [{ href: "/account", label: "My Account", icon: User }]
                    : []),
                ]
              : MOBILE_NAV_LINKS
            ).map((link) => (
              <a
                key={link.href}
                className="py-3 px-1"
                data-onboard={
                  link.href === "#report"
                    ? "report"
                    : link.href === "#adoption"
                      ? "adoption"
                      : link.href === "/account"
                        ? "updates"
                        : undefined
                }
                onClick={() => {
                  if (link.href.startsWith("/")) {
                    router.push(link.href);
                  } else {
                    scrollToTarget(
                      link.href,
                      MOBILE_NAV_OFFSETS[link.href] ?? 0,
                    );
                  }
                }}
              >
                <link.icon className="mx-auto mb-1 h-5 w-5" />
                <div className="text-[12px] font-medium">{link.label}</div>
              </a>
            ))}
          </div>
        </nav>
      </main>
      <VideoTrimModal
        open={!!activeTrim}
        fileUrl={trimPreviewUrl}
        duration={activeTrim?.duration ?? 0}
        start={trimStart}
        end={trimEnd}
        maxDuration={MAX_VIDEO_SECONDS}
        onChangeRange={onTrimRangeChange}
        onConfirm={confirmTrim}
        onCancel={cancelTrim}
      />
      {/* DetailsModal moved to global layout */}
    </>
  );
}
