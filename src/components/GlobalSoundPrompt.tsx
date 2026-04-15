"use client";

import { useEffect, useState } from "react";
import { BellRing, Volume2, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  ensureAudioReady,
  getNotifyEnabled,
  getSystemNotifyEnabled,
  playNotifySound,
  requestSystemNotifyPermission,
  setNotifyEnabled,
  setSystemNotifyEnabled,
} from "@/lib/notify";

const SESSION_DISMISS_KEY = "ps:alertsSoundPromptDismissed";
const SYSTEM_SESSION_DISMISS_KEY = "ps:alertsSystemPromptDismissed";
const SESSION_INIT_KEY = "ps:alertsSoundSessionInitialized";

export function GlobalSoundPrompt() {
  const [soundVisible, setSoundVisible] = useState(false);
  const [systemVisible, setSystemVisible] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const syncVisibility = (isLoggedIn: boolean) => {
      if (!isLoggedIn) {
        setSoundVisible(false);
        setSystemVisible(false);
        return;
      }
      try {
        const initialized = window.sessionStorage.getItem(SESSION_INIT_KEY);
        if (initialized !== "1") {
          setNotifyEnabled(false);
          window.sessionStorage.setItem(SESSION_INIT_KEY, "1");
        }
        const soundDismissed = window.sessionStorage.getItem(SESSION_DISMISS_KEY);
        const systemDismissed = window.sessionStorage.getItem(
          SYSTEM_SESSION_DISMISS_KEY,
        );
        const canAskSystem =
          "Notification" in window && Notification.permission === "default";

        setSoundVisible(!getNotifyEnabled() && soundDismissed !== "1");
        setSystemVisible(
          canAskSystem &&
            !getSystemNotifyEnabled() &&
            systemDismissed !== "1",
        );
      } catch {
        setSoundVisible(!getNotifyEnabled());
        setSystemVisible(false);
      }
    };

    try {
      const supabase = getSupabaseClient();
      supabase.auth.getSession().then(({ data }) => {
        syncVisibility(!!data.session?.user);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        syncVisibility(!!session?.user);
      });
      unsubscribe = () => {
        try {
          data.subscription.unsubscribe();
        } catch {}
      };
    } catch {
      setSoundVisible(false);
      setSystemVisible(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function enableSound() {
    try {
      await ensureAudioReady();
      setNotifyEnabled(true);
      try {
        await playNotifySound();
      } catch {}
    } catch {}
    setSoundVisible(false);
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {}
  }

  async function enableSystemNotifications() {
    let granted = false;
    try {
      const perm = await requestSystemNotifyPermission();
      granted = perm === "granted";
      setSystemNotifyEnabled(granted);
      if (granted) {
        try {
          new Notification("PawSagip", {
            body: "Browser notifications are now enabled.",
          });
        } catch {}
      }
    } catch {
      setSystemNotifyEnabled(false);
    }
    setSystemVisible(false);
    try {
      window.sessionStorage.setItem(SYSTEM_SESSION_DISMISS_KEY, "1");
    } catch {}
  }

  function dismissSoundForSession() {
    setSoundVisible(false);
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {}
  }

  function dismissSystemForSession() {
    setSystemVisible(false);
    try {
      window.sessionStorage.setItem(SYSTEM_SESSION_DISMISS_KEY, "1");
    } catch {}
  }

  if (!soundVisible && !systemVisible) return null;

  return (
    <>
      {soundVisible ? (
        <div className="fixed bottom-4 left-4 z-[70] max-w-sm">
          <div
            className="rounded-3xl border bg-white px-4 py-4 shadow-soft"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary-orange) 28%, white)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-orange)] text-white">
                <Volume2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-black">
                  Turn on sound alerts
                </div>
                <div className="mt-1 text-sm text-black/70">
                  Sound notifications are off for this session. Turn them on to
                  hear new live alerts.
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void enableSound()}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: "var(--primary-orange)" }}
                  >
                    Turn on sound
                  </button>
                  <button
                    type="button"
                    onClick={dismissSoundForSession}
                    className="rounded-full border px-3 py-2 text-sm font-medium text-black/70"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissSoundForSession}
                className="rounded-full p-1 text-black/45 transition hover:bg-black/5 hover:text-black/70"
                aria-label="Dismiss sound prompt"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {systemVisible ? (
        <div className="fixed right-4 bottom-4 z-[70] max-w-sm">
          <div
            className="rounded-3xl border bg-white px-4 py-4 shadow-soft"
            style={{
              borderColor:
                "color-mix(in srgb, var(--primary-green) 24%, white)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-green)] text-white">
                <BellRing size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-black">
                  Enable browser notifications
                </div>
                <div className="mt-1 text-sm text-black/70">
                  Turn them on here so the browser can show the native
                  permission popup from this click.
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void enableSystemNotifications()}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: "var(--primary-green)" }}
                  >
                    Enable notifications
                  </button>
                  <button
                    type="button"
                    onClick={dismissSystemForSession}
                    className="rounded-full border px-3 py-2 text-sm font-medium text-black/70"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissSystemForSession}
                className="rounded-full p-1 text-black/45 transition hover:bg-black/5 hover:text-black/70"
                aria-label="Dismiss browser notification prompt"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
