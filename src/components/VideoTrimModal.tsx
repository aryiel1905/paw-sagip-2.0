"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatSeconds } from "@/lib/media";

type VideoTrimModalProps = {
  open: boolean;
  fileName?: string | null;
  fileUrl?: string | null;
  duration: number;
  start: number;
  end: number;
  maxDuration: number;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function VideoTrimModal({
  open,
  fileName,
  fileUrl,
  duration,
  start,
  end,
  maxDuration,
  onChangeStart,
  onChangeEnd,
  onConfirm,
  onCancel,
}: VideoTrimModalProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [draftStart, setDraftStart] = useState<number | null>(null);
  const [dragMode, setDragMode] = useState<"move" | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingStartRef = useRef<number | null>(null);
  const dragRef = useRef<{
    startX: number;
    start: number;
  } | null>(null);

  const safeDuration = Math.max(0, duration || 0);
  const selectionDuration = Math.max(0, Math.min(maxDuration, safeDuration));
  const canSlideSelection = selectionDuration > 0 && selectionDuration < safeDuration;
  const effectiveStart = draftStart ?? start;
  const effectiveEnd = Math.min(safeDuration, effectiveStart + selectionDuration);
  const clipLength = Math.max(0, effectiveEnd - effectiveStart);
  const startPct = safeDuration
    ? Math.min(100, Math.max(0, (effectiveStart / safeDuration) * 100))
    : 0;
  const endPct = safeDuration
    ? Math.min(100, Math.max(0, (effectiveEnd / safeDuration) * 100))
    : 0;
  const selectionPct = Math.max(0, endPct - startPct);

  useEffect(() => {
    if (!open || !fileUrl || !safeDuration) {
      setThumbnails([]);
      setThumbLoading(false);
      return;
    }
    let cancelled = false;
    const targetCount = Math.min(12, Math.max(6, Math.round(safeDuration / 2)));
    const buildThumbnails = async () => {
      setThumbLoading(true);
      const video = document.createElement("video");
      video.src = fileUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      await new Promise<void>((resolve) => {
        const onLoaded = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        video.addEventListener("loadedmetadata", onLoaded);
      });
      const canvas = document.createElement("canvas");
      const height = 56;
      const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
      const width = Math.max(72, Math.round(height * aspect));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        if (!cancelled) setThumbnails([]);
        setThumbLoading(false);
        return;
      }
      const frames: string[] = [];
      const times = Array.from({ length: targetCount }, (_, idx) => {
        if (targetCount === 1) return 0;
        return (safeDuration * idx) / (targetCount - 1);
      });
      for (const time of times) {
        if (cancelled) return;
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = Math.min(safeDuration, Math.max(0, time));
        });
        if (cancelled) return;
        ctx.drawImage(video, 0, 0, width, height);
        frames.push(canvas.toDataURL("image/jpeg", 0.7));
      }
      if (!cancelled) {
        setThumbnails(frames);
        setThumbLoading(false);
      }
    };
    buildThumbnails().catch(() => {
      if (!cancelled) {
        setThumbnails([]);
        setThumbLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fileUrl, open, safeDuration]);

  useEffect(() => {
    if (!open || selectionDuration <= 0 || safeDuration <= 0) return;
    const maxStart = Math.max(0, safeDuration - selectionDuration);
    const nextStart = Math.min(Math.max(0, start), maxStart);
    const nextEnd = nextStart + selectionDuration;
    if (Math.abs(nextStart - start) > 0.001) {
      onChangeStart(nextStart);
      return;
    }
    if (Math.abs(nextEnd - end) > 0.001) onChangeEnd(nextEnd);
  }, [
    end,
    onChangeEnd,
    onChangeStart,
    open,
    safeDuration,
    selectionDuration,
    start,
  ]);

  useEffect(() => {
    if (open) return;
    setDraftStart(null);
    pendingStartRef.current = null;
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (event: PointerEvent) => {
      if (!stripRef.current || !dragRef.current) return;
      const rect = stripRef.current.getBoundingClientRect();
      if (rect.width <= 0 || safeDuration <= 0) return;
      const deltaPx = event.clientX - dragRef.current.startX;
      const deltaTime = (deltaPx / rect.width) * safeDuration;
      const maxStart = Math.max(0, safeDuration - selectionDuration);
      const nextStart = Math.min(
        Math.max(0, dragRef.current.start + deltaTime),
        maxStart
      );
      pendingStartRef.current = nextStart;
      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingStartRef.current == null) return;
          setDraftStart(pendingStartRef.current);
        });
      }
      const previewTime = nextStart;
      if (videoRef.current) {
        try {
          videoRef.current.currentTime = Math.min(
            safeDuration,
            Math.max(0, previewTime)
          );
        } catch {}
      }
    };
    const onUp = () => {
      const finalStart = pendingStartRef.current ?? effectiveStart;
      const finalEnd = Math.min(safeDuration, finalStart + selectionDuration);
      pendingStartRef.current = null;
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDragMode(null);
      setDraftStart(null);
      dragRef.current = null;
      if (Math.abs(finalStart - start) > 0.001) {
        onChangeStart(finalStart);
        return;
      }
      if (Math.abs(finalEnd - end) > 0.001) onChangeEnd(finalEnd);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    dragMode,
    end,
    effectiveStart,
    onChangeEnd,
    onChangeStart,
    safeDuration,
    selectionDuration,
    start,
  ]);

  const beginDrag = (clientX: number, startValue: number) => {
    if (!canSlideSelection) return;
    dragRef.current = { startX: clientX, start: startValue };
    setDragMode("move");
  };

  const onSelectionPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    event.preventDefault();
    beginDrag(event.clientX, effectiveStart);
  };

  const onStripPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!stripRef.current || !safeDuration || selectionDuration <= 0) return;
    const rect = stripRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickPct = (event.clientX - rect.left) / rect.width;
    const clickTime = Math.min(safeDuration, Math.max(0, clickPct * safeDuration));
    let nextStart = clickTime - selectionDuration / 2;
    nextStart = Math.min(
      Math.max(0, nextStart),
      Math.max(0, safeDuration - selectionDuration)
    );
    pendingStartRef.current = nextStart;
    setDraftStart(nextStart);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = Math.min(
          safeDuration,
          Math.max(0, nextStart)
        );
      } catch {}
    }
    beginDrag(event.clientX, nextStart);
  };

  const sliderBackground = useMemo(
    () =>
      `linear-gradient(90deg, rgba(0,0,0,0.45) ${startPct}%, rgba(0,0,0,0) ${startPct}%, rgba(0,0,0,0) ${endPct}%, rgba(0,0,0,0.45) ${endPct}%)`,
    [startPct, endPct]
  );
  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-lg rounded-2xl surface shadow-soft p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold ink-heading">
            Select story clip ({formatSeconds(maxDuration)} max)
          </h3>
          <button
            type="button"
            className="pill px-3 py-1"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={onCancel}
          >
            Close
          </button>
        </div>
        <p className="mt-2 text-sm ink-muted">
          {fileName
            ? `Selected: ${fileName}`
            : "Drag the highlighted window to choose which part of the video to keep."}
        </p>
        <div className="mt-4">
          {fileUrl ? (
            <video
              src={fileUrl}
              className="w-full rounded-xl"
              controls
              preload="metadata"
              playsInline
              ref={videoRef}
            />
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          <div className="text-sm flex items-center justify-between">
            <span className="ink-muted">Start: {formatSeconds(effectiveStart)}</span>
            <span className="ink-muted">End: {formatSeconds(effectiveEnd)}</span>
          </div>
          <div
            ref={stripRef}
            className="relative rounded-xl border border-black/10 overflow-hidden bg-black/5 select-none"
            style={{ backgroundImage: sliderBackground }}
            onPointerDown={onStripPointerDown}
          >
            {thumbLoading ? (
              <div className="h-16 grid place-items-center text-xs ink-muted">
                Generating thumbnails...
              </div>
            ) : (
              <div className="flex items-stretch gap-1 h-16">
                {thumbnails.map((src, idx) => (
                  <img
                    key={`${src}-${idx}`}
                    src={src}
                    alt=""
                    className="h-full w-auto object-cover flex-1"
                  />
                ))}
              </div>
            )}
            <div className="absolute inset-0">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-black/65"
                style={{ width: `${startPct}%` }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 bg-black/65"
                style={{ width: `${Math.max(0, 100 - endPct)}%` }}
              />
              <div
                className={`absolute inset-y-0 border-2 border-emerald-400 bg-emerald-300/20 shadow-[0_0_0_1px_rgba(255,255,255,0.9)] ${
                  canSlideSelection
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-default"
                }`}
                style={{
                  left: `${startPct}%`,
                  width: `${selectionPct}%`,
                  willChange: "left",
                  touchAction: "none",
                }}
                onPointerDown={canSlideSelection ? onSelectionPointerDown : undefined}
              >
                <span
                  className="pointer-events-none absolute inset-y-2 left-1 rounded-full w-1 bg-white/90"
                />
                <span
                  className="pointer-events-none absolute inset-y-2 right-1 rounded-full w-1 bg-white/90"
                />
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white"
                >
                  {formatSeconds(effectiveStart)} - {formatSeconds(effectiveEnd)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs ink-subtle">
            Clip length: {formatSeconds(clipLength)} (max{" "}
            {formatSeconds(maxDuration)})
          </p>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-primary px-4 py-2" onClick={onConfirm}>
            Use this clip
          </button>
        </div>
      </div>
    </div>
  );
  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
