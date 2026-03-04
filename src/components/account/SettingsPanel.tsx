"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import { clearSupabaseAuthArtifacts } from "@/lib/authCleanup";
import {
  ALERTS_NOTIFY_KEY,
  ALERTS_NOTIFY_SOUND_KEY,
  DEFAULT_NOTIFY_SOUND_URL,
  ensureAudioReady,
  getNotifyEnabled,
  getNotifySoundPreference,
  setNotifyEnabled,
  setNotifySoundPreference,
  SYSTEM_NOTIFY_KEY,
  getSystemNotifyEnabled,
  setSystemNotifyEnabled as setSystemNotifyPref,
  requestSystemNotifyPermission,
} from "@/lib/notify";

type Props = {
  userEmail: string;
};

type SoundOption = {
  file: string;
  url: string;
};

export default function SettingsPanel({ userEmail }: Props) {
  const [notifyEnabled, setNotifyEnabledState] = useState(false);
  const [systemNotifyEnabled, setSystemNotifyEnabledState] = useState(false);
  const [soundOptions, setSoundOptions] = useState<SoundOption[]>([]);
  const [soundLoading, setSoundLoading] = useState(true);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [selectedSoundUrl, setSelectedSoundUrl] = useState<string | null>(null);
  const [savedSoundUrl, setSavedSoundUrl] = useState<string | null>(null);
  const [isEditingSound, setIsEditingSound] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const toSoundLabel = (file: string) => {
    const base = file.replace(/\.[^/.]+$/, "");
    const spaced = base.replace(/[-_]+/g, " ").trim();
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
      if (e.key === ALERTS_NOTIFY_SOUND_KEY) {
        const pref = getNotifySoundPreference();
        const effective = pref || DEFAULT_NOTIFY_SOUND_URL;
        setSavedSoundUrl(effective);
        setSelectedSoundUrl(effective);
      }
    };
    const onCustom = () => setNotifyEnabledState(getNotifyEnabled());
    const onCustomSystem = () =>
      setSystemNotifyEnabledState(getSystemNotifyEnabled());
    const onCustomSound = () => {
      const pref = getNotifySoundPreference();
      const effective = pref || DEFAULT_NOTIFY_SOUND_URL;
      setSavedSoundUrl(effective);
      setSelectedSoundUrl(effective);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(
      "ps:alertsNotifyChanged",
      onCustom as EventListener,
    );
    window.addEventListener(
      "ps:alertsSystemNotifyChanged",
      onCustomSystem as EventListener,
    );
    window.addEventListener(
      "ps:alertsNotifySoundChanged",
      onCustomSound as EventListener,
    );
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        "ps:alertsNotifyChanged",
        onCustom as EventListener,
      );
      window.removeEventListener(
        "ps:alertsSystemNotifyChanged",
        onCustomSystem as EventListener,
      );
      window.removeEventListener(
        "ps:alertsNotifySoundChanged",
        onCustomSound as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSounds() {
      setSoundLoading(true);
      setSoundError(null);
      try {
        const resp = await fetch("/api/notify-sounds", {
          cache: "no-store",
        });
        if (!resp.ok) throw new Error("Failed");
        const data = (await resp.json()) as SoundOption[];
        const list = Array.isArray(data) ? data : [];
        if (!active) return;
        setSoundOptions(list);
        const pref = getNotifySoundPreference();
        const effective = pref || DEFAULT_NOTIFY_SOUND_URL;
        setSelectedSoundUrl(effective);
        setSavedSoundUrl(effective);
      } catch {
        if (!active) return;
        setSoundOptions([]);
        setSoundError("Unable to load sounds right now.");
        const pref = getNotifySoundPreference();
        const effective = pref || DEFAULT_NOTIFY_SOUND_URL;
        setSelectedSoundUrl(effective);
        setSavedSoundUrl(effective);
      } finally {
        if (active) setSoundLoading(false);
      }
    }
    loadSounds();
    return () => {
      active = false;
      if (previewRef.current) {
        try {
          previewRef.current.pause();
        } catch {}
        previewRef.current = null;
      }
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
      next ? "Alert notifications enabled" : "Alert notifications disabled",
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
            : "Notification permission was denied.",
        );
        return;
      }
    }
    setSystemNotifyPref(next);
    setSystemNotifyEnabledState(next);
    showToast(
      "success",
      next ? "Browser notifications enabled" : "Browser notifications disabled",
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
      "Enable browser notifications and allow permission first",
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
      "Delete account (soft delete)? Your data will be disabled and you will be logged out.",
    );
    if (!ok) return;
    // Note: Implement a server route to mark profile deleted if needed.
    await onLogout();
  }

  async function previewSound(url: string) {
    try {
      if (previewRef.current) {
        previewRef.current.pause();
        previewRef.current.currentTime = 0;
      }
      const audio = new Audio(url);
      previewRef.current = audio;
      await audio.play();
    } catch {
      showToast("error", "Unable to play preview");
    }
  }

  function selectSound(url: string) {
    setSelectedSoundUrl(url);
    void previewSound(url);
  }

  function saveSoundSelection() {
    if (!selectedSoundUrl) return;
    setNotifySoundPreference(selectedSoundUrl);
    setSavedSoundUrl(selectedSoundUrl);
    try {
      if (previewRef.current) {
        previewRef.current.pause();
        previewRef.current.currentTime = 0;
      }
    } catch {}
    showToast("success", "Notification sound saved");
    setIsEditingSound(false);
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
            <div className="flex items-center gap-2">
              <span className="text-sm">Sound alerts</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifyEnabled}
                aria-label="Toggle sound alerts"
                onClick={toggleNotify}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifyEnabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    notifyEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
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
          <div className="mt-5 border-t border-black/10 pt-4">
            <h4 className="font-semibold ink-heading mb-2">
              Notification sound
            </h4>
            <p className="text-sm ink-muted mb-3">
              Tap a sound name to preview it, then save your choice.
            </p>
            {soundLoading ? (
              <p className="text-sm ink-subtle">Loading sounds...</p>
            ) : soundError ? (
              <p className="text-sm text-red-600">{soundError}</p>
            ) : soundOptions.length === 0 ? (
              <p className="text-sm ink-subtle">
                No sounds found in public/sounds.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {soundOptions.map((option) => {
                  const isSelected = option.url === selectedSoundUrl;
                  return (
                    <button
                      key={option.url}
                      type="button"
                      disabled={!isEditingSound}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-green-600 bg-green-50"
                          : "border-black/10 hover:border-black/20"
                      }`}
                      onClick={() => selectSound(option.url)}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-green-600 bg-green-600"
                              : "border-black/30"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        <span className="text-sm font-medium">
                          {toSoundLabel(option.file)}
                        </span>
                      </span>
                      <span className="text-xs ink-subtle">Preview</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className={`btn px-3 py-2 ${
                  isEditingSound
                    ? "btn-primary hover:brightness-95"
                    : "border hover:border-black/30 hover:bg-black/5"
                }`}
                onClick={() => {
                  if (isEditingSound) {
                    saveSoundSelection();
                  } else {
                    setIsEditingSound(true);
                  }
                }}
                disabled={isEditingSound ? !selectedSoundUrl : false}
              >
                {isEditingSound ? "Save sound" : "Edit sound"}
              </button>
              <span className="text-xs ink-subtle">
                Current:{" "}
                {savedSoundUrl
                  ? toSoundLabel(
                      soundOptions.find((opt) => opt.url === savedSoundUrl)
                        ?.file ||
                        savedSoundUrl.split("/").pop() ||
                        "Default",
                    )
                  : "Default"}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm">Browser notifications</span>
              <button
                type="button"
                role="switch"
                aria-checked={systemNotifyEnabled}
                aria-label="Toggle browser notifications"
                onClick={toggleSystemNotify}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  systemNotifyEnabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    systemNotifyEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <button
              type="button"
              className="btn px-3 py-2 border"
              onClick={testSystemNotification}
            >
              Test notification
            </button>
            <span className="text-xs ink-subtle">
              Shows OS notifications. You may need to allow permission in the
              browser.
            </span>
          </div>
        </div>
        {/*
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
        </div>
        */}
      </div>
    </section>
  );
}
