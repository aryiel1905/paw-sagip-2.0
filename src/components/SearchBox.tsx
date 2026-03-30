"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_VIDEO_FALLBACK_ICON, isVideoUrl } from "@/lib/media";
import { useSearch } from "@/contexts/SearchContext";

type SearchBoxProps = {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
};

export function SearchBox({
  placeholder = "Search alerts and adoption...",
  className = "",
  inputClassName = "",
  dropdownClassName = "",
}: SearchBoxProps) {
  const { query, setQuery, runSearch, alerts, adoptions, loading, openItem } =
    useSearch();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        if (query.trim().length === 0) setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [query]);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input
        className={`w-full rounded-xl px-4 py-2 md:py-2.5 ${inputClassName}`}
        style={{ border: "1px solid var(--border-color)" }}
        placeholder={placeholder}
        value={query}
        type="search"
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => runSearch(value), 250);
          setOpen(value.trim().length > 0);
        }}
        onFocus={() => {
          if (query.trim().length > 0) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") {
            runSearch(query);
            setOpen(query.trim().length > 0);
          }
        }}
      />

      {open && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-2 rounded-xl surface ${dropdownClassName}`}
          style={{ border: "1px solid var(--border-color)" }}
        >
          <div className="w-full max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-3 text-sm ink-muted">Searching...</div>
            ) : alerts.length === 0 && adoptions.length === 0 ? (
              <div className="p-3 text-sm ink-muted">No matches</div>
            ) : (
              <>
                {alerts.length > 0 && (
                  <div className="h-[18vh]">
                    <div className="px-3 py-2 text-xs ink-subtle uppercase tracking-wide pb-2">
                      Alerts
                    </div>
                    <ul>
                      {alerts.map((a) => {
                        const previewUrl = a.previewImageUrl ?? a.imageUrl;
                        return <li
                          key={`s-a-${a.id}`}
                          className="cursor-pointer px-3 py-2 hover:bg-gray-50/60 flex items-center gap-3"
                          onClick={() => openItem({ kind: "alert", alert: a })}
                        >
                          {previewUrl ? (
                            isVideoUrl(previewUrl) ? (
                              <div
                                className="grid h-8 w-8 place-content-center rounded-md text-base"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                                }}
                              >
                                {CARD_VIDEO_FALLBACK_ICON}
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={previewUrl}
                                alt="alert"
                                className="h-8 w-8 rounded-md object-cover"
                              />
                            )
                          ) : (
                            <div
                              className="grid h-8 w-8 place-content-center rounded-md text-base"
                              style={{
                                background:
                                  "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                              }}
                            >
                              {a.emoji}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm ink-heading">
                              {a.title}
                            </div>
                            <div className="truncate text-xs ink-subtle">
                              {a.area}
                            </div>
                          </div>
                          <button className="btn btn-accent px-2 py-1 text-[12px]">
                            View
                          </button>
                        </li>;
                      })}
                    </ul>
                  </div>
                )}
                {adoptions.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs ink-subtle uppercase tracking-wide">
                      Adoption
                    </div>
                    <ul>
                      {adoptions.map((p) => (
                        <li
                          key={`s-p-${p.id}`}
                          className="cursor-pointer px-3 py-2 hover:bg-gray-50/60 flex items-center gap-3"
                          onClick={() =>
                            openItem({ kind: "adoption", adoption: p })
                          }
                        >
                          <div
                            className="grid h-8 w-8 place-content-center rounded-md text-base"
                            style={{
                              background:
                                "color-mix(in srgb, var(--primary-green) 12%, #fff)",
                            }}
                          >
                            {p.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm ink-heading">
                              {p.name}
                            </div>
                            <div className="truncate text-xs ink-subtle">
                              {p.kind.toUpperCase()} • {p.location}
                            </div>
                          </div>
                          <div className="text-xs ink-subtle whitespace-nowrap ml-2">
                            View
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
