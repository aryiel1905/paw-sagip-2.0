"use client";

import { useEffect, useRef, useState } from "react";
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
  const audioReadyRef = useRef(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      liveNotifyRef.current = getNotifyEnabled() || getSystemNotifyEnabled();
      setShowUnlockPrompt(getNotifyEnabled() && !audioReadyRef.current);
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
      onInsert: async (a) => {
        if (!liveNotifyRef.current) return;
        try {
          audioReadyRef.current = await ensureAudioReady();
          if (audioReadyRef.current) {
            setShowUnlockPrompt(false);
          }
          notifyNewAlertWithDetails({
            type: (a as any)?.type,
            title: (a as any)?.title ?? null,
            location: (a as any)?.area ?? (a as any)?.location ?? null,
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
        audioReadyRef.current = await ensureAudioReady();
        if (audioReadyRef.current) {
          setShowUnlockPrompt(false);
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

  async function unlockFromPrompt() {
    try {
      audioReadyRef.current = await ensureAudioReady();
      if (audioReadyRef.current) {
        setShowUnlockPrompt(false);
      }
    } catch {}
  }

  return showUnlockPrompt ? (
    <div className="fixed inset-x-3 bottom-24 z-[70] md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm">
      <button
        type="button"
        onClick={() => void unlockFromPrompt()}
        className="w-full rounded-2xl border px-4 py-3 text-left shadow-soft"
        style={{
          borderColor: "color-mix(in srgb, var(--primary-orange) 40%, white)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--primary-orange) 18%, white) 0%, white 100%)",
        }}
      >
        <div className="text-sm font-semibold text-black">
          Tap to enable alert sounds
        </div>
        <div className="mt-1 text-xs text-black/70">
          Browsers require one interaction on each page open before live alert
          sounds can play.
        </div>
      </button>
    </div>
  ) : null;
}
