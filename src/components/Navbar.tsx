"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PawPrint, Menu, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#alerts", label: "Alerts" },
  { href: "#report", label: "Report" },
  { href: "#adoption", label: "Adoption" },
];

export function Navbar({
  onNavigate,
}: {
  onNavigate?: (target: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = useCallback(
    (target: string) => {
      setIsMenuOpen(false);
      onNavigate?.(target);
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
        setIsReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        setIsLoggedIn(!!session?.user);
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

  const handleLogout = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {}
    try {
      showToast("success", "Logged out");
    } catch {}
    router.push("/");
  }, [router]);

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
            {(isReady
              ? [
                  ...NAV_LINKS,
                  ...(isLoggedIn
                    ? [{ href: "/account", label: "My Account" }]
                    : []),
                ]
              : NAV_LINKS
            ).map((link) => (
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

          {/* Right group: Sign in only (search hidden) */}
          <div className="hidden shrink-0 md:flex items-center gap-2">
            {isReady && isLoggedIn ? (
              <button
                className="pill px-3 py-2 text-sm"
                style={{
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--primary-red)",
                  color: "var(--white)",
                }}
                onClick={handleLogout}
                type="button"
              >
                Log out
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
            {(isReady
              ? [
                  ...NAV_LINKS,
                  ...(isLoggedIn
                    ? [{ href: "/account", label: "My Account" }]
                    : []),
                ]
              : NAV_LINKS
            ).map((link) => (
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
              {isReady && isLoggedIn ? (
                <button
                  className="flex-1 rounded-xl px-4 py-3 text-sm"
                  style={{
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--primary-red)",
                    color: "#fff",
                  }}
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  type="button"
                >
                  Log out
                </button>
              ) : (
                <button
                  className="flex-1 rounded-xl px-4 py-3 text-sm"
                  style={{ border: "1px solid var(--border-color)" }}
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
