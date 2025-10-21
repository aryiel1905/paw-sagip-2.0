"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PawPrint, Menu, X } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";

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
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = useCallback(
    (target: string) => {
      setIsMenuOpen(false);
      onNavigate?.(target);
      const section = target.startsWith("#") ? target.slice(1) : target;
      if (pathname !== "/") {
        // Navigate to home with a query param the landing page can consume to scroll.
        router.push(`/?goto=${encodeURIComponent(section)}`);
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app:navigate", { detail: { target } })
        );
      }
    },
    [onNavigate, pathname, router]
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
        className="bg-[#ffffff]"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <button
            className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ outlineColor: "var(--primary-mintgreen)" }}
            onClick={() => handleNavigate("#home")}
            type="button"
          >
            <div
              className="rounded-xl p-2 shadow-soft"
              style={{ backgroundColor: "var(--primary-mintgreen)" }}
            >
              <PawPrint className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight text-left">
              <p className="text-xl font-extrabold tracking-tight">PawSagip</p>
              <p className="text-xs ink-subtle">Community Pet Rescue</p>
            </div>
          </button>

          {/* Nav links */}
          <nav
            className="hidden md:flex flex-1 items-center justify-center gap-2"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                className="h-10 pill px-3 py-2 text-[40vm] font-medium transition-colors hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ outlineColor: "var(--primary-green)" }}
                onClick={() => handleNavigate(link.href)}
                type="button"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right group: Search next to Sign in */}
          <div className="hidden shrink-0 md:flex items-center gap-2">
            <SearchBox
              className="w-72 sm:w-96 lg:w-[21rem]"
              inputClassName="h-10 py-3"
            />

            <button
              className=" pill px-3 py-2 text-sm"
              style={{
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--primary-orange)",
                color: "var(--white)",
              }}
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
            className="mx-auto flex max-w-screen-2xl flex-col gap-1 px-4 py-4"
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
