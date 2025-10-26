"use client";

import { RefObject, useId } from "react";

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
  const inputId = useId();
  const tileBaseClasses =
    "aspect-[4/3] w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-bg)] transition";
  const actionTileClasses = `${tileBaseClasses} flex items-center justify-center text-sm ink-muted hover:border-[var(--brand-500)] hover:text-[var(--brand-600)]`;

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
      <div className="mt-3">
        <div className="text-sm ink-heading">
          Upload Home Photos (front, street, living room, dining, kitchen,
          bedrooms, windows for cats, front & backyard for dogs) *
        </div>
        <input
          id={inputId}
          ref={fileInputRef}
          className="sr-only"
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onSelectFiles(e.target.files)}
        />
        {previewUrls.length === 0 ? (
          <label
            htmlFor={inputId}
            className={`${actionTileClasses} mt-2 cursor-pointer`}
          >
            <span>Upload photos</span>
          </label>
        ) : null}
        <div className="ink-subtle text-xs mt-2">
          Max 8MB per file. You can upload multiple images.
        </div>
      </div>
      {previewUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previewUrls.map((u, i) => (
            <div
              key={i}
              className={`${tileBaseClasses} relative overflow-hidden`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={`home ${i + 1}`}
                className="h-full w-full object-cover"
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
          <label
            htmlFor={inputId}
            className={`${actionTileClasses} cursor-pointer`}
          >
            <span>Add more</span>
          </label>
          <button
            type="button"
            className={`${actionTileClasses} cursor-pointer`}
            onClick={onClearAll}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
