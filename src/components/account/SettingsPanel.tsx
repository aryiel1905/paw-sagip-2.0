"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import { clearSupabaseAuthArtifacts } from "@/lib/authCleanup";
import {
  ALERTS_NOTIFY_KEY,
  ensureAudioReady,
  getNotifyEnabled,
  setNotifyEnabled,
  SYSTEM_NOTIFY_KEY,
  getSystemNotifyEnabled,
  setSystemNotifyEnabled as setSystemNotifyPref,
  requestSystemNotifyPermission,
} from "@/lib/notify";

type Props = {
  userEmail: string;
};

export default function SettingsPanel({ userEmail }: Props) {
  const [notifyEnabled, setNotifyEnabledState] = useState(false);
  const [systemNotifyEnabled, setSystemNotifyEnabledState] = useState(false);

  useEffect(() => {
    // Load preference
    setNotifyEnabledState(getNotifyEnabled());
    setSystemNotifyEnabledState(getSystemNotifyEnabled());
    const onStorage = (e: StorageEvent) => {
      if (e.key === ALERTS_NOTIFY_KEY) {
        setNotifyEnabledState(getNotifyEnabled());
      }
      if (e.key === SYSTEM_NOTIFY_KEY) {
        setSystemNotifyEnabledState(getSystemNotifyEnabled());
      }
    };
    const onCustom = () => setNotifyEnabledState(getNotifyEnabled());
    const onCustomSystem = () =>
      setSystemNotifyEnabledState(getSystemNotifyEnabled());
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "ps:alertsNotifyChanged",
      onCustom as EventListener
    );
    window.addEventListener(
      "ps:alertsSystemNotifyChanged",
      onCustomSystem as EventListener
    );
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "ps:alertsNotifyChanged",
        onCustom as EventListener
      );
      window.removeEventListener(
        "ps:alertsSystemNotifyChanged",
        onCustomSystem as EventListener
      );
    };
  }, []);

  async function toggleNotify() {
    const next = !notifyEnabled;
    if (next) {
      // Prime audio on user gesture; ignore result silently
      await ensureAudioReady();
    }
    setNotifyEnabled(next);
    setNotifyEnabledState(next);
    showToast(
      "success",
      next ? "Alert notifications enabled" : "Alert notifications disabled"
    );
    // Optional: provide immediate feedback when turning on
    if (next) {
      try {
        const mod = await import("@/lib/notify");
        await mod.playNotifySound();
      } catch {}
    }
  }

  async function toggleSystemNotify() {
    const next = !systemNotifyEnabled;
    if (next) {
      const perm = await requestSystemNotifyPermission();
      if (perm !== "granted") {
        setSystemNotifyEnabledState(false);
        setSystemNotifyPref(false);
        showToast(
          "error",
          perm === "unsupported"
            ? "Browser notifications are not supported on this device."
            : "Notification permission was denied."
        );
        return;
      }
    }
    setSystemNotifyPref(next);
    setSystemNotifyEnabledState(next);
    showToast(
      "success",
      next
        ? "Browser notifications enabled"
        : "Browser notifications disabled"
    );
    if (next) {
      try {
        new Notification("PawSagip", {
          body: "You'll receive alert notifications here.",
        });
      } catch {}
    }
  }

  function testSystemNotification() {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("PawSagip", { body: "Test notification" });
          showToast("success", "Test notification shown");
          return;
        }
      }
    } catch {}
    showToast(
      "error",
      "Enable browser notifications and allow permission first"
    );
  }

  async function testSound() {
    try {
      await ensureAudioReady();
      // Use custom sound if available; else fallback pattern
      const mod = await import("@/lib/notify");
      await mod.playNotifySound();
      showToast("success", "Test sound played");
    } catch {
      showToast("error", "Unable to play test sound");
    }
  }
  async function onLogout() {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      clearSupabaseAuthArtifacts();
      showToast("success", "Logged out");
      try {
        window.location.href = "/";
      } catch {}
    } catch {
      showToast("error", "Failed to log out");
    }
  }

  async function onSoftDelete() {
    const ok = confirm(
      "Delete account (soft delete)? Your data will be disabled and you will be logged out."
    );
    if (!ok) return;
    // Note: Implement a server route to mark profile deleted if needed.
    await onLogout();
  }

  return (
    <section className="surface rounded-2xl shadow-soft p-5 w-full">
      <h2 className="font-semibold ink-heading mb-4">Settings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        <div className="surface rounded-2xl p-5">
          <h3 className="font-semibold ink-heading mb-3">
            Alerts Notifications
          </h3>
          <p className="text-sm ink-muted mb-3">
            Play a short sound and vibrate when new reports are posted in
            Alerts.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className={`px-3 py-2 rounded-md text-sm border ${
                notifyEnabled ? "bg-green-600 text-white border-green-600" : ""
              }`}
              onClick={toggleNotify}
              aria-pressed={notifyEnabled}
            >
              {notifyEnabled ? "Enabled" : "Enable"}
            </button>
            <button
              type="button"
              className="btn px-3 py-2 border"
              onClick={testSound}
            >
              Test sound
            </button>
            <span className="text-xs ink-subtle">
              Requires one-time click to allow audio. You can change this
              anytime.
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className={`px-3 py-2 rounded-md text-sm border ${
                systemNotifyEnabled
                  ? "bg-green-600 text-white border-green-600"
                  : ""
              }`}
              onClick={toggleSystemNotify}
              aria-pressed={systemNotifyEnabled}
            >
              {systemNotifyEnabled ? "Browser notifications on" : "Enable browser notifications"}
            </button>
            <button
              type="button"
              className="btn px-3 py-2 border"
              onClick={testSystemNotification}
            >
              Test notification
            </button>
            <span className="text-xs ink-subtle">
              Shows OS notifications. You may need to allow permission in the browser.
            </span>
          </div>
        </div>
        {/*}
        <div className="surface rounded-2xl p-5">
          <h3 className="font-semibold ink-heading mb-3">Privacy & Data</h3>
          <p className="text-sm ink-muted mb-3">
            Download a copy of your reports and applications, or delete your
            account.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary px-3 py-2" disabled>
              Export data
            </button>
            <button className="btn px-3 py-2 border" onClick={onSoftDelete}>
              Delete account
            </button>
          </div>
        </div>*/}
      </div>
    </section>
  );
}
