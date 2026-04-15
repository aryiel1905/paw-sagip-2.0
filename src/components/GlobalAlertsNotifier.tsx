"use client";

import { useEffect, useRef } from "react";
import { subscribeToAlertsIncremental } from "@/data/supabaseApi";
import {
  ALERTS_NOTIFY_KEY,
  SYSTEM_NOTIFY_KEY,
  ensureAudioReady,
  getNotifyEnabled,
  getSystemNotifyEnabled,
  notifyNewAlertWithDetails,
} from "@/lib/notify";

export function GlobalAlertsNotifier() {
  const liveNotifyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      liveNotifyRef.current = getNotifyEnabled() || getSystemNotifyEnabled();
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

  useEffect(() => {
    const unsubscribe = subscribeToAlertsIncremental({
      onInsert: (a) => {
        if (!liveNotifyRef.current) return;
        try {
          notifyNewAlertWithDetails({
            type: (a as any)?.type,
            title: (a as any)?.title ?? null,
            location: (a as any)?.near ?? (a as any)?.location ?? null,
          });
        } catch {
          notifyNewAlertWithDetails();
        }
      },
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let unlocked = false;

    const cleanup = () => {
      try {
        window.removeEventListener("pointerdown", unlock as EventListener);
        window.removeEventListener("keydown", unlock as EventListener);
        window.removeEventListener("touchstart", unlock as EventListener);
      } catch {}
    };

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

  return null;
}
