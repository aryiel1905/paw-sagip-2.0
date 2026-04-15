"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
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
  stopNotifySound,
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
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  function stopPreviewSound(resetTime = true) {
    try {
      if (!previewRef.current) return;
      previewRef.current.pause();
      if (resetTime) previewRef.current.currentTime = 0;
    } catch {}
    setPreviewPlaying(false);
  }

  const toSoundLabel = (file: string) => {
    const base = file.replace(/\.[^/.]+$/, "");
    const spaced = base.replace(/[-_]+/g, " ").trim();
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const selectedSoundLabel = savedSoundUrl
    ? toSoundLabel(
        soundOptions.find((opt) => opt.url === savedSoundUrl)?.file ||
          savedSoundUrl.split("/").pop() ||
          "Default",
      )
    : "Default";

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
        stopPreviewSound();
        previewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showSoundPicker) return;
    const body = document.body as HTMLBodyElement;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSoundUrl(savedSoundUrl || DEFAULT_NOTIFY_SOUND_URL);
        stopPreviewSound();
        setShowSoundPicker(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
    };
  }, [savedSoundUrl, showSoundPicker]);

  async function toggleNotify() {
    const next = !notifyEnabled;
    if (next) {
      // Prime audio on user gesture; ignore result silently
      await ensureAudioReady();
    }
    setNotifyEnabled(next);
    setNotifyEnabledState(next);
    if (!next) {
      stopPreviewSound();
      stopNotifySound();
    }
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
      await ensureAudioReady();
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
      stopPreviewSound();
      const audio = new Audio(url);
      previewRef.current = audio;
      audio.onended = () => {
        setPreviewPlaying(false);
      };
      await audio.play();
      setPreviewPlaying(true);
    } catch {
      setPreviewPlaying(false);
      showToast("error", "Unable to play preview");
    }
  }

  function selectSound(url: string) {
    setSelectedSoundUrl(url);
    void previewSound(url);
  }

  async function toggleSelectedPreview(url: string) {
    if (!previewRef.current || selectedSoundUrl !== url) {
      setSelectedSoundUrl(url);
      await previewSound(url);
      return;
    }
    if (previewPlaying) {
      stopPreviewSound(false);
      return;
    }
    try {
      await previewRef.current.play();
      setPreviewPlaying(true);
    } catch {
      showToast("error", "Unable to play preview");
      setPreviewPlaying(false);
    }
  }

  async function toggleCurrentSoundPreview() {
    const url = savedSoundUrl || selectedSoundUrl || DEFAULT_NOTIFY_SOUND_URL;
    if (!url) return;
    if (previewRef.current && !previewRef.current.paused) {
      stopPreviewSound(false);
      return;
    }
    await previewSound(url);
  }

  function saveSoundSelection() {
    if (!selectedSoundUrl) return;
    setNotifySoundPreference(selectedSoundUrl);
    setSavedSoundUrl(selectedSoundUrl);
    try {
      stopPreviewSound();
    } catch {}
    showToast("success", "Notification sound saved");
    setShowSoundPicker(false);
  }

  function openSoundPicker() {
    setSelectedSoundUrl(savedSoundUrl || DEFAULT_NOTIFY_SOUND_URL);
    setShowSoundPicker(true);
  }

  function closeSoundPicker() {
    setSelectedSoundUrl(savedSoundUrl || DEFAULT_NOTIFY_SOUND_URL);
    stopPreviewSound();
    setShowSoundPicker(false);
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
              Current sound is shown below. Click edit to choose from all sounds.
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
              <button
                type="button"
                className="w-full rounded-2xl border px-4 py-3 text-left text-white shadow-sm transition hover:brightness-95"
                style={{
                  borderColor: "#d96f00",
                  background:
                    "linear-gradient(135deg, var(--primary-orange) 0%, #f39a42 100%)",
                }}
                onClick={() => void toggleCurrentSoundPreview()}
                aria-label={previewPlaying ? "Pause current sound" : "Play current sound"}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/70 bg-white/15 px-2 text-white backdrop-blur-sm transition hover:bg-white/20"
                      title={previewPlaying ? "Pause" : "Play"}
                    >
                      {previewPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {selectedSoundLabel}
                      </p>
                      <p className="truncate text-xs text-white/85">
                        Tap card to {previewPlaying ? "pause" : "play"} preview
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    Selected
                  </span>
                </div>
              </button>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn px-3 py-2 border hover:border-black/30 hover:bg-black/5"
                onClick={openSoundPicker}
                disabled={soundLoading || !!soundError || soundOptions.length === 0}
              >
                Edit sound
              </button>
              <span className="rounded-full border border-black/10 bg-white px-2 py-1 text-xs ink-subtle">
                Current: {selectedSoundLabel}
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

      {showSoundPicker ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close sound picker"
            onClick={closeSoundPicker}
          />
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-soft p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-black">
                  Choose notification sound
                </h3>
                <p className="text-sm text-black/60">
                  Scroll, preview, and select your preferred sound.
                </p>
              </div>
              <button
                type="button"
                className="pill px-3 py-1"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={closeSoundPicker}
              >
                Close
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {soundOptions.map((option) => {
                  const isSelected = option.url === selectedSoundUrl;
                  return (
                    <button
                      key={option.url}
                      type="button"
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-left transition hover:border-black/20"
                      onClick={() => {
                        if (isSelected) {
                          void toggleSelectedPreview(option.url);
                          return;
                        }
                        selectSound(option.url);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {isSelected ? (
                          <span
                            className="rounded-full bg-[var(--primary-orange)] px-2 py-0.5 text-[11px] font-semibold text-white"
                          >
                            Selected
                          </span>
                        ) : (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-black/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                          </span>
                        )}
                        <span className="text-sm font-medium">
                          {toSoundLabel(option.file)}
                        </span>
                      </span>
                      {isSelected ? (
                        <span className="inline-flex h-7 min-w-12 items-center justify-center gap-1 rounded-full border border-[var(--primary-orange)] bg-[var(--primary-orange)] px-2 text-xs font-semibold text-white">
                          {previewPlaying ? (
                            <>
                              <Pause size={12} />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play size={12} />
                              <span>Play</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs ink-subtle">Preview</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn px-3 py-2 border hover:border-black/30 hover:bg-black/5"
                onClick={closeSoundPicker}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary px-3 py-2"
                onClick={saveSoundSelection}
                disabled={!selectedSoundUrl}
              >
                Save sound
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
