export type MediaKind = "image" | "video";
export const CARD_VIDEO_FALLBACK_ICON = "\u{1F43E}";

const VIDEO_EXT_RE = /\.(mp4|mov|webm)$/i;

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith("video/")) return true;
  return VIDEO_EXT_RE.test(file.name);
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0]?.split("#")[0] ?? "";
  return VIDEO_EXT_RE.test(clean);
}

export function getMediaKindFromFile(file: File): MediaKind {
  return isVideoFile(file) ? "video" : "image";
}

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      };
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration)
          ? video.duration
          : 0;
        cleanup();
        resolve(duration);
      };
      video.onerror = () => {
        cleanup();
        reject(new Error("Unable to read video metadata"));
      };
      video.src = url;
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Video metadata error"));
    }
  });
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins > 0) return `${mins}:${String(secs).padStart(2, "0")}`;
  return `${secs}s`;
}
