"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

const STORAGE_KEY = "ps:onboarding:v2";
const DEFER_KEY = "ps:onboarding:defer";
const START_KEY = "ps:onboarding:start";

type Step = {
  id: string;
  title: string;
  body: string;
  target?: string;
};

const STEPS: Step[] = [
  {
    id: "quick-report",
    title: "Quick Report",
    body: "Tap Quick Report to jump to the form. We will guide you field by field.",
    target: "quick-report",
  },
  {
    id: "report-photos",
    title: "Upload photos",
    body: "Add clear photos. Use Remove to delete an image.",
    target: "report-photos",
  },
  {
    id: "report-landmarks",
    title: "Landmark photos",
    body: "Add nearby landmarks (up to 5) to help rescuers find the spot.",
    target: "report-landmarks",
  },
  {
    id: "report-type",
    title: "Report type",
    body: "Choose Found, Lost, or Cruelty based on what you saw.",
    target: "report-type",
  },
  {
    id: "report-species",
    title: "Species / Pet type",
    body: "Select or type the pet type (dog, cat, bird, etc.).",
    target: "report-species",
  },
  {
    id: "report-location",
    title: "Location pin",
    body: "Tap Pin to set the exact location on the map.",
    target: "report-location",
  },
  {
    id: "report-when-auto",
    title: "Auto date and time",
    body: "Tap Auto to fill the current date and time.",
    target: "report-when-auto",
  },
  {
    id: "report-contact",
    title: "Contact",
    body: "Add phone or email so rescuers can reach you.",
    target: "report-contact",
  },
  {
    id: "report-status",
    title: "Pet status",
    body: "Choose roaming or in custody.",
    target: "report-status",
  },
  {
    id: "report-features",
    title: "Distinctive features",
    body: "Add marks, color, accessories, or other helpful notes.",
    target: "report-features",
  },
  {
    id: "report-temperament",
    title: "Temperament",
    body: "Mark aggressive or friendly to guide responders.",
    target: "report-temperament",
  },
  {
    id: "report-anon",
    title: "Anonymous submission",
    body: "Enable this to hide your identity. Contact details will not be shared.",
    target: "report-anon",
  },
  {
    id: "report-detailed",
    title: "More detailed report",
    body: "Open the longer form for complete details.",
    target: "report-detailed",
  },
  {
    id: "report-submit",
    title: "Submit",
    body: "Submit the report. You will see a confirmation and it will appear in Alerts.",
    target: "report-submit",
  },
  {
    id: "adoption",
    title: "Adoption",
    body: "Browse rescued pets here when you are ready to adopt.",
    target: "adoption-section",
  },
];

type HighlightBox = { top: number; left: number; width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function findVisibleTarget(name?: string) {
  if (!name || typeof document === "undefined") return null;
  const nodes = Array.from(
    document.querySelectorAll(`[data-onboard="${name}"]`)
  ) as HTMLElement[];
  return (
    nodes.find((el) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return true;
    }) ?? null
  );
}

export function GlobalOnboarding() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [highlightRect, setHighlightRect] = useState<HighlightBox | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({
    top: "20vh",
    left: "50%",
    transform: "translateX(-50%)",
  });
  const [deferAutoOpen, setDeferAutoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const stepInfo = STEPS[step] ?? STEPS[0];
  const canBack = step > 0;
  const isLast = step === STEPS.length - 1;

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setHasSeen(true);
    setOpen(false);
    setBannerDismissed(true);
  }, []);

  const startTour = useCallback(() => {
    setBannerDismissed(true);
    if (pathname !== "/") {
      try {
        sessionStorage.setItem(START_KEY, "1");
      } catch {}
      router.push("/#home");
      return;
    }
    setStep(0);
    setOpen(true);
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}
    setHasSeen(seen);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let deferred = false;
    try {
      deferred = sessionStorage.getItem(DEFER_KEY) === "1";
    } catch {}
    if (!deferred && hasSeen === false && pathname !== "/") {
      try {
        sessionStorage.setItem(DEFER_KEY, "1");
      } catch {}
      deferred = true;
    }
    setDeferAutoOpen(deferred);
  }, [hasSeen, pathname]);

  useEffect(() => {
    if (hasSeen === null) return;
    if (hasSeen) {
      setOpen(false);
      return;
    }
    if (pathname === "/" && !deferAutoOpen) {
      setOpen(true);
    }
  }, [hasSeen, pathname, deferAutoOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasSeen !== false) return;
    if (pathname !== "/") return;
    try {
      if (sessionStorage.getItem(START_KEY) === "1") {
        sessionStorage.removeItem(START_KEY);
        setStep(0);
        setOpen(true);
      }
    } catch {}
  }, [hasSeen, pathname]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getSession().then(({ data }) => {
        setIsLoggedIn(!!data.session?.user);
      });
      const { data } = supabase.auth.onAuthStateChange((_e, session) => {
        setIsLoggedIn(!!session?.user);
      });
      unsub = () => {
        try {
          data.subscription.unsubscribe();
        } catch {}
      };
    } catch {}
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const updatePositions = useCallback(() => {
    const target = targetRef.current;
    if (!target) {
      setHighlightRect(null);
      setTooltipStyle({
        top: "20vh",
        left: "50%",
        transform: "translateX(-50%)",
      });
      return;
    }
    const rect = target.getBoundingClientRect();
    const pad = 8;
    const highlight: HighlightBox = {
      top: clamp(rect.top - pad, 8, window.innerHeight - 8),
      left: clamp(rect.left - pad, 8, window.innerWidth - 8),
      width: Math.max(24, rect.width + pad * 2),
      height: Math.max(24, rect.height + pad * 2),
    };
    setHighlightRect(highlight);

    const tip = tooltipRef.current;
    if (!tip) return;
    const tipWidth = tip.offsetWidth || 280;
    const tipHeight = tip.offsetHeight || 160;
    const margin = 12;
    let top = highlight.top;
    let left = highlight.left;

    if (isMobile) {
      const below = highlight.top + highlight.height + margin;
      const above = highlight.top - margin - tipHeight;
      top =
        below + tipHeight <= window.innerHeight
          ? below
          : Math.max(8, above);
      left = clamp(
        highlight.left + highlight.width / 2 - tipWidth / 2,
        8,
        window.innerWidth - tipWidth - 8
      );
    } else {
      const right = highlight.left + highlight.width + margin;
      const leftSide = highlight.left - margin - tipWidth;
      if (right + tipWidth <= window.innerWidth) {
        left = right;
        top = clamp(
          highlight.top + highlight.height / 2 - tipHeight / 2,
          8,
          window.innerHeight - tipHeight - 8
        );
      } else if (leftSide >= 8) {
        left = leftSide;
        top = clamp(
          highlight.top + highlight.height / 2 - tipHeight / 2,
          8,
          window.innerHeight - tipHeight - 8
        );
      } else {
        const below = highlight.top + highlight.height + margin;
        const above = highlight.top - margin - tipHeight;
        top =
          below + tipHeight <= window.innerHeight
            ? below
            : Math.max(8, above);
        left = clamp(
          highlight.left,
          8,
          window.innerWidth - tipWidth - 8
        );
      }
    }
    setTooltipStyle({ top, left });
  }, [isMobile]);

  useEffect(() => {
    if (!open) {
      setHighlightRect(null);
      return;
    }
    const target = findVisibleTarget(stepInfo.target);
    targetRef.current = target;
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
    const id = window.setTimeout(updatePositions, 360);
    return () => window.clearTimeout(id);
  }, [open, stepInfo.target, updatePositions]);

  useEffect(() => {
    if (!open) return;
    const onUpdate = () => updatePositions();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [open, updatePositions]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    body.classList.add("modal-open");
    return () => {
      body.classList.remove("modal-open");
    };
  }, [open]);

  const bannerVisible =
    hasSeen === false &&
    !open &&
    !bannerDismissed &&
    (pathname !== "/" || deferAutoOpen);

  const stepFooter = useMemo(
    () => `30-sec tour - Step ${step + 1} of ${STEPS.length}`,
    [step]
  );

  if (hasSeen === null) return null;

  return (
    <>
      {bannerVisible && (
        <div className="fixed inset-x-4 bottom-4 z-[60] md:left-auto md:right-6 md:max-w-sm">
          <div className="surface rounded-2xl px-4 py-3 shadow-soft flex items-center gap-3">
            <div className="text-sm">
              <div className="font-semibold">New to PawSagip?</div>
              <div className="ink-muted">Take a 30-sec tour.</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="pill px-3 py-1 text-sm border border-[var(--border-color)]"
                onClick={() => setBannerDismissed(true)}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn-accent px-3 py-1 text-sm"
                onClick={startTour}
              >
                Take tour
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/45 pointer-events-none" />
          {highlightRect && (
            <div
              className="fixed pointer-events-none z-[75]"
              style={{
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
                borderRadius: 16,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                border: "2px solid #fff",
              }}
            />
          )}

          <div
            ref={tooltipRef}
            className="fixed z-[80] w-[92vw] max-w-sm"
            style={tooltipStyle}
          >
            <div className="surface rounded-2xl shadow-soft p-4 pointer-events-auto">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold ink-heading">
                    {stepInfo.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--mid-gray)]">
                    {stepInfo.body}
                  </p>
                  {stepInfo.id === "adoption" && !isLoggedIn && (
                    <p className="mt-2 text-xs text-[var(--primary-orange)]">
                      You must be signed in to apply for adoption.
                    </p>
                  )}
                  <div className="mt-3 text-xs ink-subtle">{stepFooter}</div>
                </div>
                <button
                  type="button"
                  className="pill px-2 py-1 text-xs border border-[var(--border-color)]"
                  onClick={markSeen}
                >
                  Skip
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {canBack && (
                  <button
                    type="button"
                    className="pill px-4 py-2 text-sm border border-[var(--border-color)]"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    Back
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {stepInfo.id === "adoption" && !isLoggedIn && (
                    <button
                      type="button"
                      className="pill px-3 py-2 text-sm border border-[var(--primary-orange)] text-[var(--primary-orange)]"
                      onClick={() => {
                        try {
                          window.dispatchEvent(
                            new CustomEvent("app:signin", {
                              detail: { mode: "login" },
                            })
                          );
                        } catch {}
                      }}
                    >
                      Sign in
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-accent px-4 py-2 text-sm"
                    onClick={() => {
                      if (isLast) markSeen();
                      else setStep((s) => Math.min(STEPS.length - 1, s + 1));
                    }}
                  >
                    {isLast ? "Finish" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
