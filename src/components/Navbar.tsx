"use client";

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
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

const NAV_LINKS = [
  { href: "#home", label: "Home", icon: Home },
  { href: "#alerts", label: "Alerts", icon: BellRing },
  { href: "#report", label: "Report", icon: FileEdit },
  { href: "#adoption", label: "Adoption", icon: HeartHandshake },
];

const NAV_PENDING_HASH_KEY = "nav:pendingHash";

export function Navbar({
  onNavigate,
}: {
  onNavigate?: (target: string) => void;
}) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [activeHash, setActiveHash] = useState<string | null>(null);
  const lastNavRef = useRef(0);
  const deferObserverUntil = useRef(0); // pause IO + hash sync until timestamp
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const scrollToSection = (hash: string) => {
    const id = hash.replace(/^#/, "");
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleNavigate = useCallback(
    (target: string) => {
      setIsMenuOpen(false);
      onNavigate?.(target);

      if (target.startsWith("/")) {
        setActiveHash(null);
        router.push(target);
        return;
      }

      if (target.startsWith("#")) {
        const section = target.slice(1);
        lastNavRef.current = performance.now();
        setActiveHash(target);

        if (pathname !== "/") {
          // Pause scroll spy, then route to home without auto scroll.
          deferObserverUntil.current = performance.now() + 1200;
          if (typeof window !== "undefined") {
            sessionStorage.setItem(NAV_PENDING_HASH_KEY, `#${section}`);
          }
          router.push(`/#${section}`, { scroll: false });
          return;
        }

        // Same-page smooth scroll
        if (typeof window !== "undefined") {
          if (window.location.hash !== target)
            history.pushState(null, "", target);
          scrollToSection(target);
        }
        return;
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
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null;
        setIsLoggedIn(!!u);
        setUserEmail(u?.email ?? null);
        const fullName =
          (u?.user_metadata?.full_name as string | undefined) ?? null;
        setUserName(fullName);
        setIsReady(true);
        // If a post-login redirect target is present, navigate
        try {
          if (u) {
            const dest = sessionStorage.getItem("auth:postLoginRedirect");
            if (dest) {
              sessionStorage.removeItem("auth:postLoginRedirect");
              deferObserverUntil.current = performance.now() + 1500;
              router.push(dest);
            }
          }
        } catch {}
      });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        setIsLoggedIn(!!session?.user);
        setUserEmail(session?.user?.email ?? null);
        const fullName =
          (session?.user?.user_metadata?.full_name as string | undefined) ??
          null;
        setUserName(fullName);
        // Handle post-login redirect immediately when session becomes available
        try {
          if (session?.user) {
            const dest = sessionStorage.getItem("auth:postLoginRedirect");
            if (dest) {
              sessionStorage.removeItem("auth:postLoginRedirect");
              deferObserverUntil.current = performance.now() + 1500;
              router.push(dest);
            }
          }
        } catch {}
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

  // Disable automatic scroll restoration on home (prevents jumping back to top)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") return;
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      try {
        history.scrollRestoration = prev;
      } catch {}
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") {
      setActiveHash(null);
      return;
    }
    const updateFromHash = () => {
      // If a modal is open, ignore hash updates
      try {
        if (
          typeof document !== "undefined" &&
          document.body.classList.contains("modal-open")
        ) {
          return;
        }
      } catch {}
      // Ignore hash updates while we're deferring
      if (performance.now() < deferObserverUntil.current) return;
      const hash = window.location.hash || "#home";
      setActiveHash(hash);
    };
    const initialHash = window.location.hash;
    const pending = sessionStorage.getItem(NAV_PENDING_HASH_KEY);
    if (pending) {
      sessionStorage.removeItem(NAV_PENDING_HASH_KEY);
      setActiveHash(pending);
      deferObserverUntil.current = performance.now() + 1200;
      if (window.location.hash !== pending)
        history.replaceState(null, "", pending);
      scrollToSection(pending);
    } else if (initialHash) {
      setActiveHash(initialHash);
      // Optional: ensure smooth scroll on first load with hash
      scrollToSection(initialHash);
    } else {
      updateFromHash();
    }
    const onHashChange = () => updateFromHash();
    const onAppNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: string }>).detail;
      if (detail?.target) setActiveHash(detail.target);
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("app:navigate", onAppNavigate as EventListener);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener(
        "app:navigate",
        onAppNavigate as EventListener
      );
    };
  }, [pathname]);

  // Follow scroll: highlight section (don’t run while deferred)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") return;
    const sectionIds = NAV_LINKS.filter((l) => l.href.startsWith("#")).map(
      (l) => l.href.slice(1)
    );
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!elements.length) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        if (performance.now() < deferObserverUntil.current) return;
        // If a modal is open, freeze section highlight + hash updates
        try {
          if (
            typeof document !== "undefined" &&
            document.body.classList.contains("modal-open")
          ) {
            return;
          }
        } catch {}
        entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
        if (performance.now() - lastNavRef.current < 600) return;
        const best = Array.from(ratios.entries())
          .filter(([, r]) => r > 0)
          .sort((a, b) => b[1] - a[1])[0];
        if (!best) return;
        const id = (best[0] as HTMLElement).id;
        const hash = `#${id}`;
        if (activeHash !== hash) {
          setActiveHash(hash);
          if (window.location.hash !== hash) {
            history.replaceState(null, "", hash);
          }
        }
      },
      {
        root: null,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-25% 0px -55% 0px",
      }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname, activeHash]);

  // Note: Logout actions are handled within the Account pages.

  return (
    <header ref={headerRef} className="sticky top-0 z-50 surface">
      <div
        className="bg-[#ffffff]"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="relative mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <a
            className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ outlineColor: "var(--primary-mintgreen)" }}
            href={pathname === "/" ? "#home" : "/#home"}
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                handleNavigate("#home");
              }
            }}
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
          </a>

          {/* Nav links */}
          <nav
            className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 pointer-events-none"
            aria-label="Primary"
          >
            {(isReady ? NAV_LINKS : NAV_LINKS).map((link) => {
              const Icon = link.icon;
              const isSection = link.href.startsWith("#");
              const isActive = isSection
                ? activeHash === link.href
                : pathname === link.href;
              const href = pathname === "/" ? link.href : `/${link.href}`;
              return (
                <a
                  key={link.href}
                  className={`h-10 pill px-4 py-2 text-[40vm] font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 pointer-events-auto ${
                    isActive
                      ? "bg-[var(--primary-mintgreen)] text-white"
                      : "hover:bg-[var(--card-bg)]"
                  }`}
                  style={{ outlineColor: "var(--primary-green)" }}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault(); // always intercept for SPA behavior
                    handleNavigate(link.href);
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden md:flex flex-1" aria-hidden="true" />

          {/* Right group */}
          <div className="hidden shrink-0 md:flex items-center gap-2 relative z-10">
            {isReady && isLoggedIn ? (
              (() => {
                const isAccountActive = pathname?.startsWith("/account");
                return (
                  <button
                    className={`pill px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      isAccountActive
                        ? "bg-[var(--primary-orange)] text-white"
                        : "bg-white text-[var(--primary-orange)] hover:bg-[var(--primary-orange)] hover:text-white"
                    } border border-[var(--primary-orange)]`}
                    onClick={() => handleNavigate("/account")}
                    type="button"
                    aria-current={isAccountActive ? "page" : undefined}
                  >
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                    <span>{userName?.trim() || userEmail || "Account"}</span>
                  </button>
                );
              })()
            ) : (
              <button
                className="pill px-3 py-2 text-sm border border-[var(--border-color)] bg-[var(--primary-orange)] text-white"
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
            {/* Contacts button */}
            <button
              className="pill px-3 py-2 text-sm border border-transparent bg-[#444647] text-white hover:bg-[#65676a] transition-colors"
              onClick={() => handleNavigate("/contacts")}
              type="button"
              aria-current={
                pathname?.startsWith("/contacts") ? "page" : undefined
              }
            >
              Contacts
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
            {(isReady ? NAV_LINKS : NAV_LINKS).map((link) => {
              const Icon = link.icon;
              const isSection = link.href.startsWith("#");
              const isActive = isSection
                ? activeHash === link.href
                : pathname === link.href;
              const href = pathname === "/" ? link.href : `/${link.href}`;
              return (
                <a
                  key={link.href}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-[var(--primary-mintgreen)] text-white"
                      : "hover:bg-[var(--card-bg)]"
                  }`}
                  style={{ outlineColor: "var(--primary-green)" }}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault(); // SPA behavior on all routes
                    handleNavigate(link.href);
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </a>
              );
            })}
            <div className="mt-2 flex items-center gap-2">
              {isReady && isLoggedIn ? (
                (() => {
                  const isAccountActive = pathname?.startsWith("/account");
                  return (
                    <button
                      className={`flex-1 rounded-xl px-4 py-3 text-sm flex items-center gap-2 transition-colors ${
                        isAccountActive
                          ? "bg-[var(--primary-orange)] text-white"
                          : "bg-white text-[var(--primary-orange)] hover:bg-[var(--primary-orange)] hover:text-white"
                      } border border-[var(--primary-orange)]`}
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleNavigate("/account");
                      }}
                      type="button"
                      aria-current={isAccountActive ? "page" : undefined}
                    >
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                      <span>{userName?.trim() || userEmail || "Account"}</span>
                    </button>
                  );
                })()
              ) : (
                <button
                  className="flex-1 rounded-xl px-4 py-3 text-sm border border-[var(--border-color)] bg-[var(--primary-orange)] text-white"
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
              {/* Contacts (mobile) */}
              <button
                className="flex-1 rounded-xl px-4 py-3 text-sm border border-transparent bg-[#333639] text-white hover:bg-[#4A4D50]"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleNavigate("/contacts");
                }}
                type="button"
                aria-current={
                  pathname?.startsWith("/contacts") ? "page" : undefined
                }
              >
                Contacts
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
