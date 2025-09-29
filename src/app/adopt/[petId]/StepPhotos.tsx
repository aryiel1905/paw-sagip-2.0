"use client";

import { RefObject } from "react";

type Props = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSelectFiles: (files: FileList | null) => void;
  previewUrls: string[];
  onRemoveAt: (index: number) => void;
  onClearAll: () => void;
};

export default function StepPhotos({
  fileInputRef,
  onSelectFiles,
  previewUrls,
  onRemoveAt,
  onClearAll,
}: Props) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ border: "1px solid var(--border-color)" }}
    >
      <div className="font-semibold ink-heading">Photo Requirements</div>
      <p className="ink-subtle text-xs">
        Replaces on-site ocular inspections. Your photos are used only for this
        application.
      </p>
      <label className="block text-sm mt-3">
        Upload Home Photos (front, street, living room, dining, kitchen,
        bedrooms, windows for cats, front & backyard for dogs) *
        <input
          ref={fileInputRef}
          className="mt-1 w-full rounded-xl px-3 py-2"
          style={{ border: "1px solid var(--border-color)" }}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onSelectFiles(e.target.files)}
        />
        <div className="ink-subtle text-xs mt-1">
          Max 8MB per file. You can upload multiple images.
        </div>
      </label>
      {previewUrls.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {previewUrls.map((u, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={`home ${i + 1}`}
                className="w-full h-32 object-cover rounded-xl"
              />
              <button
                type="button"
                className="absolute top-1 right-1 pill px-2 py-0.5 text-xs"
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--border-color)",
                }}
                onClick={() => onRemoveAt(i)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="pill px-2 py-1 text-xs"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={() => fileInputRef.current?.click()}
          >
            Add more
          </button>
          <button
            type="button"
            className="pill px-2 py-1 text-xs"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={onClearAll}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
