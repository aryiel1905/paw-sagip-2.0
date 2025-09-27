"use client";

import { useCallback, useEffect, useState } from "react";
import { PawPrint, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#alerts", label: "Alerts" },
  { href: "#report", label: "Report" },
  { href: "#registry", label: "Registry" },
  { href: "#adoption", label: "Adoption" },
];

export function Navbar({
  onNavigate,
}: {
  onNavigate?: (target: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = useCallback(
    (target: string) => {
      setIsMenuOpen(false);
      onNavigate?.(target);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app:navigate", { detail: { target } })
        );
      }
    },
    [onNavigate]
  );

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50">
      <div
        className="glass dark:glass-dark border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ outlineColor: "var(--primary-mintgreen)" }}
            onClick={() => handleNavigate("#home")}
            type="button"
          >
            <div
              className="rounded-xl p-2 shadow-soft"
              style={{ backgroundColor: "var(--primary-mintgreen)" }}
            >
              <PawPrint className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight text-left">
              <p className="text-xl font-extrabold tracking-tight">PawSagip</p>
              <p className="text-xs ink-subtle">Community Pet Rescue</p>
            </div>
          </button>

          <nav
            className="hidden items-center gap-2 md:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                className="pill px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ outlineColor: "var(--primary-green)" }}
                onClick={() => handleNavigate(link.href)}
                type="button"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              className="pill px-3 py-2 text-sm text-white"
              style={{ background: "var(--dark-gray)" }}
              type="button"
            >
              EN
            </button>
            <button
              className="pill px-3 py-2 text-sm"
              style={{ border: "1px solid var(--border-color)" }}
              type="button"
            >
              Sign in
            </button>
          </div>

          <button
            aria-label="Toggle navigation"
            className="rounded-xl p-2 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ outlineColor: "var(--primary-green)" }}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            type="button"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      <div className={`md:hidden ${isMenuOpen ? "block" : "hidden"}`}>
        <div
          className="glass dark:glass-dark border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4"
            aria-label="Mobile"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ outlineColor: "var(--primary-green)" }}
                onClick={() => handleNavigate(link.href)}
                type="button"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <button
                className="flex-1 rounded-xl px-4 py-3 text-sm text-white"
                style={{ background: "var(--dark-gray)" }}
                type="button"
              >
                EN
              </button>
              <button
                className="flex-1 rounded-xl px-4 py-3 text-sm"
                style={{ border: "1px solid var(--border-color)" }}
                type="button"
              >
                Sign in
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
