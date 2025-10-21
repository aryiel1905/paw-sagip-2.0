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
import { AdoptionPet, Alert, AlertType, ModalItem } from "@/types/app";
import {
  searchAlerts as searchAlertsApi,
  searchAdoptionPets as searchAdoptionPetsApi,
} from "@/data/supabaseApi";

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
  const searchControllerRef = useRef<AbortController | null>(null);

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
        // Abort previous search if running
        try {
          searchControllerRef.current?.abort();
        } catch {}
        const controller = new AbortController();
        searchControllerRef.current = controller;

        // Parallel searches via centralized API
        const [alertsRaw, adoptionsRaw] = await Promise.all([
          searchAlertsApi(q, 25, { signal: controller.signal }),
          searchAdoptionPetsApi(q, 25, { signal: controller.signal }),
        ]);

        const alertsRanked = alertsRaw
          .map((a) => ({
            a,
            score:
              scoreText(q, a.title) * 2 +
              scoreText(q, a.area) +
              scoreText(q, a.type),
          }))
          .sort((x, y) => y.score - x.score)
          .slice(0, 5)
          .map((x) => x.a);

        const adoptionsRanked = adoptionsRaw
          .map((p) => ({
            p,
            score:
              scoreText(q, p.name) * 2 +
              scoreText(q, p.location) +
              scoreText(q, p.note) +
              scoreText(q, p.kind) +
              scoreText(q, p.age),
          }))
          .sort((x, y) => y.score - x.score)
          .slice(0, 5)
          .map((x) => x.p);

        if (isMountedRef.current) {
          setAlerts(alertsRanked);
          setAdoptions(adoptionsRanked);
        }
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
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
