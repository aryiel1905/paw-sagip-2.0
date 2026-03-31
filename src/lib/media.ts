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

export function resolvePreviewUrl(
  mediaUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined
): string | null {
  if (mediaUrl && !isVideoUrl(mediaUrl)) return mediaUrl;
  if (thumbnailUrl) return thumbnailUrl;
  return mediaUrl ?? null;
}

export async function createVideoThumbnailBlob(
  file: File,
  options?: {
    seekSeconds?: number;
    maxWidth?: number;
    quality?: number;
  }
): Promise<Blob> {
  const seekSeconds = Math.max(0, options?.seekSeconds ?? 0.25);
  const maxWidth = Math.max(320, options?.maxWidth ?? 960);
  const quality = Math.min(0.95, Math.max(0.5, options?.quality ?? 0.8));
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Unable to load video for thumbnail generation"));
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const targetTime = Math.max(
      0,
      Math.min(seekSeconds, duration > 0 ? Math.max(duration - 0.05, 0) : 0)
    );

    if (targetTime > 0) {
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Unable to seek video for thumbnail generation"));
        };
        const cleanup = () => {
          video.removeEventListener("seeked", onSeeked);
          video.removeEventListener("error", onError);
        };
        video.addEventListener("seeked", onSeeked);
        video.addEventListener("error", onError);
        video.currentTime = targetTime;
      });
    }

    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const width = Math.min(sourceWidth, maxWidth);
    const height = Math.max(1, Math.round((width / sourceWidth) * sourceHeight));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create thumbnail canvas");
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Unable to export video thumbnail"));
        },
        "image/jpeg",
        quality
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

function getCaptureStream(video: HTMLVideoElement): MediaStream | null {
  const candidate = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  if (typeof candidate.captureStream === "function") {
    return candidate.captureStream();
  }
  if (typeof candidate.mozCaptureStream === "function") {
    return candidate.mozCaptureStream();
  }
  return null;
}

function resolveRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: "loadedmetadata" | "seeked" | "ended",
) {
  await new Promise<void>((resolve, reject) => {
    const onDone = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Unable to prepare video for ${eventName}`));
    };
    const cleanup = () => {
      video.removeEventListener(eventName, onDone);
      video.removeEventListener("error", onError);
    };
    video.addEventListener(eventName, onDone, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

export async function createTrimmedVideoFile(
  file: File,
  options?: {
    startSeconds?: number;
    endSeconds?: number;
  },
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  try {
    await waitForVideoEvent(video, "loadedmetadata");
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const startSeconds = Math.max(
      0,
      Math.min(options?.startSeconds ?? 0, Math.max(duration - 0.05, 0)),
    );
    const rawEnd = options?.endSeconds ?? duration;
    const endSeconds = Math.max(startSeconds, Math.min(rawEnd, duration || rawEnd));
    const selectedDuration = Math.max(0, endSeconds - startSeconds);

    if (!selectedDuration || !Number.isFinite(selectedDuration)) {
      throw new Error("Unable to export the selected clip");
    }

    const stream = getCaptureStream(video);
    if (!stream) {
      throw new Error("This browser cannot export trimmed video clips");
    }

    const mimeType = resolveRecordingMimeType();
    if (!mimeType) {
      throw new Error("This browser cannot record trimmed video clips");
    }

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    const chunks: BlobPart[] = [];

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    });

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.addEventListener(
        "error",
        () => reject(new Error("Unable to record the selected clip")),
        { once: true },
      );
    });

    video.currentTime = startSeconds;
    await waitForVideoEvent(video, "seeked");

    recorder.start(250);
    await video.play();

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      const checkTime = () => {
        if (video.currentTime >= endSeconds) {
          finish();
          return;
        }
        requestAnimationFrame(checkTime);
      };

      video.addEventListener(
        "ended",
        () => {
          finish();
        },
        { once: true },
      );

      requestAnimationFrame(checkTime);
    });

    try {
      video.pause();
    } catch {}
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    await stopped;

    const blob = new Blob(chunks, {
      type: recorder.mimeType || mimeType || "video/webm",
    });
    const trimmedName = `${file.name.replace(/\.[^.]+$/, "")}-clip.webm`;
    return new File([blob], trimmedName, {
      type: blob.type || "video/webm",
      lastModified: Date.now(),
    });
  } finally {
    try {
      video.pause();
    } catch {}
    URL.revokeObjectURL(objectUrl);
  }
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins > 0) return `${mins}:${String(secs).padStart(2, "0")}`;
  return `${secs}s`;
}
