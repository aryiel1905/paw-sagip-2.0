/*
  Lightweight notification helpers for new Alerts.
  - Plays a short beep using Web Audio (no asset required)
  - Triggers a small vibration on supported devices
  - Includes a simple cooldown to avoid spam
*/

// LocalStorage key for user preference
export const ALERTS_NOTIFY_KEY = "ps:alertsNotify"; // "1" | "0"
export const SYSTEM_NOTIFY_KEY = "ps:alertsSystemNotify"; // "1" | "0"

let audioCtx: AudioContext | null = null;
let lastNotifyAt = 0;
const COOLDOWN_MS = 2500;

// Optional custom sound support (served from Next.js public dir)
const DEFAULT_SOUND_URL = "/sounds/notifyy.mp3"; // place file at public/sounds/notify.mp3
let soundUrl: string | null = DEFAULT_SOUND_URL;
let triedLoadCustom = false;
let customBuffer: AudioBuffer | null = null;

function getNow() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

export function getNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(ALERTS_NOTIFY_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export function setNotifyEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALERTS_NOTIFY_KEY, enabled ? "1" : "0");
    // Broadcast to same-tab listeners without waiting for the storage event
    try {
      window.dispatchEvent(
        new CustomEvent("ps:alertsNotifyChanged", { detail: { enabled } })
      );
    } catch {}
  } catch {}
}

export function getSystemNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(SYSTEM_NOTIFY_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export function setSystemNotifyEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SYSTEM_NOTIFY_KEY, enabled ? "1" : "0");
    try {
      window.dispatchEvent(
        new CustomEvent("ps:alertsSystemNotifyChanged", { detail: { enabled } })
      );
    } catch {}
  } catch {}
}

export async function requestSystemNotifyPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined") return "unsupported";
  try {
    if (!("Notification" in window)) return "unsupported";
    // If already granted/denied, just return it
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return "unsupported";
  }
}

// Must be called in response to a user gesture to satisfy autoplay policies.
export async function ensureAudioReady(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (!audioCtx) {
      const Ctx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return false;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    return audioCtx ? audioCtx.state === "running" : false;
  } catch {
    return false;
  }
}

export async function playBeep(durationMs = 140, freq = 880) {
  if (typeof window === "undefined") return;
  try {
    if (!audioCtx) return; // require ensureAudioReady() first
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    // Small envelope to avoid click
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.01);
  } catch {
    // ignore
  }
}

export function vibrate(pattern: number | number[] = [40, 30, 40]) {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(pattern as any);
    }
  } catch {
    // ignore
  }
}

async function tryLoadCustomBuffer(): Promise<boolean> {
  try {
    if (!audioCtx || !soundUrl) return false;
    if (customBuffer) return true;
    if (triedLoadCustom) return false;
    triedLoadCustom = true;
    const resp = await fetch(soundUrl, { cache: "force-cache" });
    if (!resp.ok) return false;
    const arr = await resp.arrayBuffer();
    const buf = await audioCtx.decodeAudioData(arr);
    customBuffer = buf;
    return true;
  } catch {
    return false;
  }
}

async function playCustomIfAvailable(): Promise<boolean> {
  if (!audioCtx) return false;
  const ok = await tryLoadCustomBuffer();
  if (!ok || !customBuffer) return false;
  try {
    const ctx = audioCtx;
    const src = ctx.createBufferSource();
    src.buffer = customBuffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.6; // overall volume for mp3
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return true;
  } catch {
    return false;
  }
}

export async function notifyNewAlert() {
  const now = getNow();
  if (now - lastNotifyAt < COOLDOWN_MS) return; // throttle
  lastNotifyAt = now;
  // Fire and forget; beep may be silent if audio not unlocked yet
  try {
    // Prefer custom sound if present; fall back to pattern
    const used = await playCustomIfAvailable();
    if (!used) {
      await playNotifyPattern();
    }
  } catch {}
  vibrate();
}

export async function notifyNewAlertWithDetails(alert?: {
  type?: string | null;
  title?: string | null;
  location?: string | null;
}) {
  const now = getNow();
  if (now - lastNotifyAt < COOLDOWN_MS) return; // throttle
  lastNotifyAt = now;

  // Sound (only if user enabled it)
  try {
    if (getNotifyEnabled()) {
      const used = await playCustomIfAvailable();
      if (!used) await playNotifyPattern();
    }
  } catch {}

  // System notification (if enabled and permitted)
  try {
    if (
      getSystemNotifyEnabled() &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const title = alert?.title || "New alert posted";
      const pieces: string[] = [];
      if (alert?.type) pieces.push(`${String(alert.type).toUpperCase()} alert`);
      if (alert?.location) pieces.push(String(alert.location));
      const body = pieces.join(" • ") || "Open PawSagip to view";
      try {
        new Notification(title, { body });
      } catch {}
    }
  } catch {}

  vibrate();
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function playTone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "triangle",
  peak = 0.22
) {
  if (!audioCtx) return;
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.01, Math.min(1, peak)),
    now + 0.01
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  await new Promise<void>((resolve) => {
    try {
      osc.onended = () => resolve();
    } catch {}
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.01);
  });
}

export async function playNotifyPattern() {
  // Noticeable triple-beep pattern (square wave)
  if (!audioCtx) return;
  await playTone(1400, 150, "square", 0.24);
  await sleep(60);
  await playTone(1000, 120, "square", 0.24);
  await sleep(60);
  await playTone(1700, 180, "square", 0.24);
}

// Public API to play whichever sound is configured (custom if available; else pattern)
export async function playNotifySound() {
  try {
    if (await playCustomIfAvailable()) return;
  } catch {}
  await playNotifyPattern();
}

// Allow overriding the default custom sound URL at runtime
export function setCustomNotifySound(url: string | null) {
  soundUrl = url;
  triedLoadCustom = false;
  customBuffer = null;
}
