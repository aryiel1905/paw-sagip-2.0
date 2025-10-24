"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PawPrint,
  Menu,
  X,
  UserRound,
  Home,
  BellRing,
  FileEdit,
  HeartHandshake,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

const NAV_LINKS = [
  { href: "#home", label: "Home", icon: Home },
  { href: "#alerts", label: "Alerts", icon: BellRing },
  { href: "#report", label: "Report", icon: FileEdit },
  { href: "#adoption", label: "Adoption", icon: HeartHandshake },
];

export function Navbar({
  onNavigate,
}: {
  onNavigate?: (target: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [activeHash, setActiveHash] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = useCallback(
    (target: string) => {
      setIsMenuOpen(false);
      onNavigate?.(target);
      if (target.startsWith("#")) {
        setActiveHash(target);
      } else {
        setActiveHash(null);
      }
      if (target.startsWith("/")) {
        router.push(target);
        return;
      }
      const section = target.startsWith("#") ? target.slice(1) : target;
      if (pathname !== "/") {
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

  // Auth state (client-only; render default unauthenticated on SSR to avoid mismatches)
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getUser().then(({ data }) => {
        setIsLoggedIn(!!data.user);
        setUserEmail(data.user?.email ?? null);
        const fullName = (data.user?.user_metadata?.full_name as string | undefined) ?? null;
        setUserName(fullName);
        setIsReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        setIsLoggedIn(!!session?.user);
        setUserEmail(session?.user?.email ?? null);
        const fullName = (session?.user?.user_metadata?.full_name as string | undefined) ?? null;
        setUserName(fullName);
      });
      unsub = () => {
        try {
          data.subscription.unsubscribe();
        } catch {}
      };
    } catch {
      setIsReady(true);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") {
      setActiveHash(null);
      return;
    }
    const updateFromHash = () => {
      const hash = window.location.hash || "#home";
      setActiveHash(hash);
    };
    updateFromHash();
    const onHashChange = () => updateFromHash();
    const onAppNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: string }>).detail;
      if (detail?.target) setActiveHash(detail.target);
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("app:navigate", onAppNavigate as EventListener);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("app:navigate", onAppNavigate as EventListener);
    };
  }, [pathname]);

  // Note: Logout actions are handled within the Account pages.

  return (
    <header className="sticky top-0 z-50">
      <div
        className="bg-[#ffffff]"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="relative mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
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
            className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2"
            aria-label="Primary"
          >
            {(isReady ? NAV_LINKS : NAV_LINKS).map((link) => {
              const Icon = link.icon;
              const isSection = link.href.startsWith("#");
              const isActive = isSection
                ? activeHash === link.href
                : pathname === link.href;
              return (
                <button
                  key={link.href}
                  className={`h-10 pill px-4 py-2 text-[40vm] font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isActive ? "bg-[var(--primary-mintgreen)] text-white" : "hover:bg-[var(--card-bg)]"}`}
                  style={{ outlineColor: "var(--primary-green)" }}
                  onClick={() => handleNavigate(link.href)}
                  type="button"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden md:flex flex-1" aria-hidden="true" />

          {/* Right group: Sign in only (search hidden) */}
          <div className="hidden shrink-0 md:flex items-center gap-2">
            {isReady && isLoggedIn ? (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "var(--card-bg)",
                }}
              >
                <UserRound
                  className="h-5 w-5 text-[var(--primary-orange)]"
                  aria-hidden="true"
                />
              </div>
            ) : null}
            {isReady && isLoggedIn ? (
              <button
                className="pill px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--primary-orange)",
                  color: "var(--white)",
                }}
                onClick={() => handleNavigate("/account")}
                type="button"
              >
                {userName?.trim() || userEmail || "Account"}
              </button>
            ) : (
              <button
                className="pill px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--primary-orange)",
                  color: "var(--white)",
                }}
                onClick={() => {
                  try {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("app:signin", {
                          detail: { mode: "login" },
                        })
                      );
                    }
                  } catch {}
                }}
                type="button"
              >
                Sign in
              </button>
            )}
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
            {(isReady ? NAV_LINKS : NAV_LINKS).map((link) => {
              const Icon = link.icon;
              const isSection = link.href.startsWith("#");
              const isActive = isSection
                ? activeHash === link.href
                : pathname === link.href;
              return (
                <button
                  key={link.href}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isActive ? "bg-[var(--primary-mintgreen)] text-white" : "hover:bg-[var(--card-bg)]"}`}
                  style={{ outlineColor: "var(--primary-green)" }}
                  onClick={() => handleNavigate(link.href)}
                  type="button"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </button>
              );
            })}
            <div className="mt-2 flex items-center gap-2">
              {isReady && isLoggedIn ? (
                <button
                  className="flex-1 rounded-xl px-4 py-3 text-sm"
                  style={{
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--primary-orange)",
                    color: "#fff",
                  }}
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleNavigate("/account");
                  }}
                  type="button"
                >
                  {userName?.trim() || userEmail || "Account"}
                </button>
              ) : (
                <button
                  className="flex-1 rounded-xl px-4 py-3 text-sm"
                  style={{
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--primary-orange)",
                    color: "#fff",
                  }}
                  onClick={() => {
                    setIsMenuOpen(false);
                    try {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("app:signin", {
                            detail: { mode: "login" },
                          })
                        );
                      }
                    } catch {}
                  }}
                  type="button"
                >
                  Sign in
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
