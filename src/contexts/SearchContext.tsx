"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  AdoptionPet,
  AdoptionRow,
  Alert,
  AlertRow,
  AlertType,
  ModalItem,
} from "@/types/app";

const PET_MEDIA_BUCKET = "pet-media";

type SearchContextValue = {
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  alerts: Alert[];
  adoptions: AdoptionPet[];
  runSearch: (q: string) => Promise<void>;
  openItem: (item: ModalItem) => void;
  closeModal: () => void;
  modalItem: ModalItem;
  timeAgoFromMinutes: (minutes: number) => string;
  getMapsLink: (a: Alert) => string | null;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionPet[]>([]);
  const [modalItem, setModalItem] = useState<ModalItem>(null);
  const isMountedRef = useRef(true);

  // Track user's location globally (for directions link)
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setMyLat(coords.latitude);
        setMyLng(coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => {
      try {
        navigator.geolocation.clearWatch(id);
      } catch {}
    };
  }, []);

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
      return null;
    },
    [myLat, myLng]
  );

  const scoreText = useCallback(
    (needle: string, hay: string | null | undefined) => {
      if (!needle) return 0;
      const q = needle.toLowerCase().trim();
      const t = (hay ?? "").toLowerCase();
      if (!q || !t) return 0;
      const idx = t.indexOf(q);
      if (idx === -1) return 0;
      let score = 1;
      if (t === q) score += 120;
      if (t.startsWith(q)) score += 80;
      if (idx === 0) score += 30;
      score += Math.max(0, 30 - idx);
      score += Math.min(40, q.length);
      return score;
    },
    []
  );

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || q.length < 2) {
        if (isMountedRef.current) {
          setAlerts([]);
          setAdoptions([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const supabase = getSupabaseClient();

        // Alerts
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
        const { data: alertData } = await supabase
          .from("alerts")
          .select(
            "id,report_type,location,created_at,photo_path,latitude,longitude,landmark_media_paths,pet_name,species,description"
          )
          .or(alertOrParts.join(","))
          .limit(25);

        const toAlert = (item: AlertRow): Alert => {
          const supa = getSupabaseClient();
          const imageUrl = item.photo_path
            ? supa.storage.from(PET_MEDIA_BUCKET).getPublicUrl(item.photo_path)
                .data.publicUrl
            : null;
          const landmarkImageUrls = Array.isArray(item.landmark_media_paths)
            ? item.landmark_media_paths
                .filter(Boolean)
                .map(
                  (p) =>
                    supa.storage.from(PET_MEDIA_BUCKET).getPublicUrl(p).data
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

        // Adoptions
        const kindMatches = ["dog", "cat"].filter((k) => k.includes(qLower));
        const adoptOrParts = [
          `pet_name.ilike.%${qSafe}%`,
          `location.ilike.%${qSafe}%`,
          `features.ilike.%${qSafe}%`,
          `age_size.ilike.%${qSafe}%`,
          ...kindMatches.map((k) => `species.ilike.%${k}%`),
        ];
        const { data: adoptData } = await supabase
          .from("adoption_pets")
          .select(
            "id, species, pet_name, age_size, features, location, emoji_code, status, created_at, photo_path, latitude, longitude"
          )
          .or(adoptOrParts.join(","))
          .limit(25);

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
          setAlerts(alertsList);
          setAdoptions(adoptList);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [scoreText]
  );

  const openItem = useCallback((item: ModalItem) => setModalItem(item), []);
  const closeModal = useCallback(() => setModalItem(null), []);

  // Compatibility: allow other components to open the modal via event
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ item: ModalItem }>;
      if (ce.detail?.item) setModalItem(ce.detail.item);
    };
    window.addEventListener("app:open-details", handler as EventListener);
    return () =>
      window.removeEventListener("app:open-details", handler as EventListener);
  }, []);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      loading,
      alerts,
      adoptions,
      runSearch,
      openItem,
      closeModal,
      modalItem,
      timeAgoFromMinutes,
      getMapsLink,
    }),
    [
      query,
      loading,
      alerts,
      adoptions,
      runSearch,
      openItem,
      closeModal,
      modalItem,
      timeAgoFromMinutes,
      getMapsLink,
    ]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

function speciesToEmoji(species?: string | null) {
  const s = (species ?? "").toLowerCase();
  if (s.includes("dog")) return "🐶";
  if (s.includes("cat")) return "🐱";
  return "🐾";
}

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
