"use client";

import {
  ChangeEvent,
  RefObject,
  useCallback,
  useState,
  FormEvent,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Clock,
  PawPrint,
  MapPinHouse,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MapPickerModal from "@/components/MapPickerModal";
import { AlertType, ReportStatus } from "@/types/app";
import { useEffect } from "react";
import { showToast } from "@/lib/toast";
import { useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type ReportSectionProps = {
  reportType: Exclude<AlertType, "all">;
  setReportType: (value: Exclude<AlertType, "all">) => void;
  reportDescription: string;
  setReportDescription: (value: string) => void;
  reportCondition: string;
  setReportCondition: (value: string) => void;
  reportLocation: string;
  setReportLocation: (value: string) => void;
  reportLat: number | null;
  reportLng: number | null;
  setReportCoords: (lat: number | null, lng: number | null) => void;
  reportPhotoName: string;
  reportStatus: ReportStatus;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSubmitReport: (
    species: string,
    opts?: {
      reporterContact?: string | null;
      reporterName?: string | null;
      isAnonymous?: boolean;
    }
  ) => void;
  reportPhotoInputRef: RefObject<HTMLInputElement>;
  reportPhotoPreviewUrl: string | null;
  // Landmark photos (multiple)
  landmarkPreviewUrls: string[];
  handleLandmarkPhotosChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removeLandmarkAt: (index: number) => void;
  clearLandmarkPhotos: () => void;
  landmarkInputRef: RefObject<HTMLInputElement>;
  landmarkInputMobileRef: RefObject<HTMLInputElement>;
};

export function ReportSection({
  reportType,
  setReportType,
  reportDescription,
  setReportDescription,
  reportCondition,
  setReportCondition,
  reportLocation,
  setReportLocation,
  reportLat,
  reportLng,
  setReportCoords,
  reportPhotoName,
  reportStatus,
  handlePhotoChange,
  handleSubmitReport,
  reportPhotoInputRef,
  reportPhotoPreviewUrl,
  landmarkPreviewUrls,
  handleLandmarkPhotosChange,
  removeLandmarkAt,
  clearLandmarkPhotos,
  landmarkInputRef,
  landmarkInputMobileRef,
}: ReportSectionProps) {
  // Local UI state for the quick form and modal behavior
  const [qSpecies, setQSpecies] = useState("Dog");
  const [qWhen, setQWhen] = useState("");
  const [qContact, setQContact] = useState("");
  const [qAggressive, setQAggressive] = useState(false);
  const [qAnon, setQAnon] = useState(false);
  const [qFriendly, setQFriendly] = useState(false);
  const [showQuickValidation, setShowQuickValidation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  // Auth-derived identity for autofill
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Inline popover for checkbox tips (Quick Report)
  const [tipOpen, setTipOpen] = useState(false);
  const [tipKey, setTipKey] = useState<
    "aggressive" | "friendly" | "anonymous" | null
  >(null);
  const [tipPos, setTipPos] = useState<{
    top: number;
    left: number;
    below: boolean;
    arrowLeft: number;
  }>({ top: 0, left: 0, below: true, arrowLeft: 16 });
  const tipAnchorElRef = useRef<HTMLElement | null>(null);

  // Full-screen modal for Aggressive/Friendly safety tips
  const [flagKey, setFlagKey] = useState<"aggressive" | "friendly" | null>(
    null
  );
  const openFlagModal = (k: "aggressive" | "friendly") => setFlagKey(k);
  const closeFlagModal = () => setFlagKey(null);

  // Derived flags
  const isCruelty = reportType === "cruelty";

  const getTipContent = (key: "aggressive" | "friendly" | "anonymous") => {
    switch (key) {
      case "aggressive":
        return (
          <div className="grid grid-cols-3 items-center gap-3 w-full">
            <div className="col-span-1 flex items-center justify-center">
              <img
                src="/DoNotApproach.svg"
                alt=""
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="col-span-2">
              <p className="text-lg font-semibold">
                Aggressive / Fearful - Safety First
              </p>
              <p className="mt-1 text-lg">
                Do not approach. Keep 3-5 meters away. Avoid eye contact and
                sudden moves. Observe from a distance and include a clear
                photo/video if possible.
              </p>
              <div className="mt-5  text-left">
                <button
                  type="button"
                  className="pill px-3 py-1 text-white transition hover:opacity-90  "
                  style={{
                    background: "var(--primary-orange)",
                    border: "1px solid var(--primary-orange)",
                  }}
                  onClick={closeFlagModal}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        );
      case "friendly":
        return (
          <div className="grid grid-cols-3 items-center gap-3">
            <div className=" col-span-1 ">
              <img
                src="/SafeApprove.svg"
                alt=""
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="col-span-2">
              <p className="text-lg font-semibold">
                Seems Friendly - Approach Slowly
              </p>
              <p className="mt-1 text-lg">
                Speak softly and crouch to appear smaller. Check for a collar or
                tag. Offer water; avoid chasing.
              </p>
              <div className="mt-5  text-left">
                <button
                  type="button"
                  className="pill px-3 py-1 text-white transition hover:opacity-90  "
                  style={{
                    background: "var(--primary-mintgreen)",
                    border: "1px solid var(--primary-mintgreen)",
                  }}
                  onClick={closeFlagModal}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        );
      case "anonymous":
        return (
          <div className="flex items-start gap-2">
            <div className="text-xl"></div>
            <div>
              <p className="font-semibold">Submit Anonymously</p>
              <p className="mt-1 text-sm">
                Your name won’t be shown. If safe, add a phone or email so
                responders can coordinate follow‑ups.
              </p>
            </div>
          </div>
        );
    }
  };

  const positionPopover = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const tipWidth = Math.min(window.innerWidth * 0.92, 360);
    const estimatedHeight = 140; // rough estimate for placement
    const margin = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > estimatedHeight + margin;
    const top = placeBelow
      ? rect.bottom + margin
      : rect.top - estimatedHeight - margin;

    const anchorCenter = rect.left + rect.width / 2;
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - tipWidth - 8)
    );
    const arrowLeft = Math.max(
      8,
      Math.min(anchorCenter - left - 6, tipWidth - 24)
    );

    setTipPos({ top, left, below: placeBelow, arrowLeft });
  };

  const showTipFor = (
    anchor: HTMLElement,
    key: "aggressive" | "friendly" | "anonymous"
  ) => {
    tipAnchorElRef.current = anchor;
    setTipKey(key);
    setTipOpen(true);
    positionPopover(anchor);
  };

  const hideTip = () => {
    setTipOpen(false);
    setTipKey(null);
    tipAnchorElRef.current = null;
  };

  useEffect(() => {
    const onWin = () => {
      const el = tipAnchorElRef.current as HTMLElement | null;
      if (tipOpen && el) positionPopover(el);
    };
    window.addEventListener("scroll", onWin);
    window.addEventListener("resize", onWin);
    return () => {
      window.removeEventListener("scroll", onWin);
      window.removeEventListener("resize", onWin);
    };
  }, [tipOpen]);

  // Load current auth user (email + display name) for autofill when not anonymous
  useEffect(() => {
    const supabase = getSupabaseClient();
    let unsub: (() => void) | null = null;
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUserEmail(u?.email ?? null);
      const fullName = (u?.user_metadata?.full_name as string | undefined) ?? null;
      setUserName(fullName);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
      const fullName = (session?.user?.user_metadata?.full_name as string | undefined) ?? null;
      setUserName(fullName);
    });
    unsub = () => {
      try {
        data.subscription.unsubscribe();
      } catch {}
    };
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Autofill contact with user email when not anonymous and field is empty
  useEffect(() => {
    if (!qAnon && !qContact && userEmail) {
      setQContact(userEmail);
    }
  }, [qAnon, qContact, userEmail]);

  // Clear contact on switching to anonymous for privacy
  useEffect(() => {
    if (qAnon) {
      setQContact("");
    }
  }, [qAnon]);

  // Lock scroll and add ESC close when the flag modal is open
  useEffect(() => {
    if (!flagKey) return;
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const body = document.body;
    body.classList.add("modal-open");
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeFlagModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.classList.remove("modal-open");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      if (typeof window !== "undefined") {
        window.scrollTo(0, y);
      }
      window.removeEventListener("keydown", onKey);
    };
  }, [flagKey]);

  // Derive a lightweight helper for quick report: we map the "Feature" input
  // directly to the shared reportDescription so the existing submit flow works.
  const onQuickFeatureChange = useCallback(
    (value: string) => {
      setReportDescription(value);
    },
    [setReportDescription]
  );

  // Keep report condition in sync when the quick aggressive flag toggles
  const onQuickAggressiveToggle = useCallback(
    (checked: boolean) => {
      setQAggressive(checked);
      if (checked) {
        setQFriendly(false);
        setReportCondition("Aggressive");
      }
    },
    [setReportCondition]
  );

  const onQuickFriendlyToggle = useCallback(
    (checked: boolean) => {
      setQFriendly(checked);
      if (checked) {
        setQAggressive(false);
        setReportCondition("Healthy");
      }
    },
    [setReportCondition]
  );

  const persistDraftToSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const draft = {
        type: reportType,
        species: qSpecies,
        location: reportLocation,
        when: qWhen,
        feature: reportDescription,
        contact: qContact,
        aggressive: qAggressive,
        friendly: qFriendly,
        anonymous: qAnon,
        condition: reportCondition,
        photoName: reportPhotoName || undefined,
      };
      window.sessionStorage.setItem("reportDraft", JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [
    qAggressive,
    qAnon,
    qContact,
    qSpecies,
    qWhen,
    reportDescription,
    reportLocation,
    reportType,
    reportCondition,
    reportPhotoName,
    qFriendly,
  ]);

  const clearMainPhoto = useCallback(() => {
    try {
      const input = reportPhotoInputRef.current;
      if (!input) return;
      input.value = "";
      const ev = new Event("change", { bubbles: true });
      input.dispatchEvent(ev);
    } catch {
      // ignore
    }
  }, [reportPhotoInputRef]);

  // Show toast messages for submit status
  useEffect(() => {
    if (reportStatus === "success") {
      showToast("success", "Report submitted! Rescue team notified.");
    } else if (reportStatus === "error") {
      showToast("error", "Something went wrong. Please try again.");
    }
  }, [reportStatus]);

  const quickSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // Show a friendly notice if required fields are missing
      const formValid = isCruelty
        ? Boolean(reportLocation.trim() && reportDescription.trim())
        : Boolean(
            reportType && qSpecies && reportLocation.trim() && qWhen.trim()
          );
      if (!formValid) {
        setShowQuickValidation(true);
        return;
      }
      // Optionally enrich the description with light context (species/when)
      // without altering the API. We only do this if the description is empty.
      if (!reportDescription.trim() && !isCruelty) {
        const parts = [
          qSpecies ? `Species: ${qSpecies}` : "",
          qWhen ? `When: ${qWhen}` : "",
          qAnon ? "(Submitted anonymously)" : "",
        ].filter(Boolean);
        if (parts.length > 0) {
          setReportDescription(parts.join(" | "));
        }
      }
      // Build reporter info to mirror full form mapping
      const reporterContact = qAnon
        ? null
        : (qContact?.trim() || userEmail || null);
      const reporterName = qAnon ? null : userName || null;
      handleSubmitReport(qSpecies, {
        reporterContact,
        reporterName,
        isAnonymous: qAnon,
      });
    },
    [
      handleSubmitReport,
      qAnon,
      qContact,
      qSpecies,
      qWhen,
      reportDescription,
      setReportDescription,
      reportLocation,
      reportType,
      isCruelty,
      userEmail,
      userName,
    ]
  );

  // Disable submit until required fields are present
  const isQuickFormValid = isCruelty
    ? Boolean(reportLocation.trim() && reportDescription.trim())
    : Boolean(reportType && qSpecies && reportLocation.trim() && qWhen.trim());

  const missingFields = [] as string[];
  if (!reportLocation.trim()) missingFields.push("Location");
  if (isCruelty) {
    if (!reportDescription.trim()) missingFields.push("Description");
  } else {
    if (!qWhen.trim()) missingFields.push("When");
  }

  return (
    <section
      id="report"
      className="relative mt-12 px-4 pt-8 pb-8 sm:px-6 lg:px-8 snap-start w-full "
    >
      {/* Quick Report content (header and white background removed) */}

      <div className="mx-auto max-w-screen-2xl">
        <form className="mt-5 space-y-3" onSubmit={quickSubmit}>
          {/* Mobile layout */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {/* Photos */}
            <div>
              <label
                className="mt-2 relative group flex aspect-[4/3] w-full max-w-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                htmlFor="report-photo-mobile"
                style={{ border: "2px dashed var(--border-color)" }}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="report-photo-mobile"
                  onChange={handlePhotoChange}
                  ref={reportPhotoInputRef}
                />
                {!reportPhotoPreviewUrl ? (
                  <>
                    <PawPrint
                      size={30}
                      strokeWidth={2}
                      style={{
                        color: "var(--primary-mintgreen)",
                        opacity: 0.8,
                      }}
                    />
                    <span className="text-sm ink-muted opacity-80 group-hover:opacity-100 transition">
                      {reportPhotoName
                        ? `Selected: ${reportPhotoName}`
                        : "Upload one or more photos"}
                    </span>
                    <div className="mt-2">
                      <div
                        className="mx-auto rounded-full w-10 h-10 flex items-center justify-center text-xl opacity-70 group-hover:opacity-100 transition"
                        style={{
                          background: "var(--white)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        +
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={reportPhotoPreviewUrl}
                      alt="Selected photo preview"
                      className="h-full w-full object-cover rounded-xl"
                    />

                    <button
                      type="button"
                      aria-label="Remove photo"
                      className="absolute top-2 right-2 pill px-2 py-1 text-xs"
                      style={{
                        background: "var(--white)",
                        border: "1px solid var(--border-color)",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearMainPhoto();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </label>
            </div>

            {/* Landmark Photos (multiple) */}
            <div>
              <label
                className="mt-1 relative group flex flex-col aspect-[4/3] w-full max-w-[360px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                htmlFor="report-landmarks-mobile"
                style={{ border: "2px dashed var(--border-color)" }}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="report-landmarks-mobile"
                  onChange={handleLandmarkPhotosChange}
                  ref={landmarkInputMobileRef}
                />
                {landmarkPreviewUrls.length === 0 ? (
                  <>
                    <MapPinHouse
                      size={30}
                      strokeWidth={2}
                      style={{
                        color: "var(--primary-mintgreen)",
                        opacity: 0.8,
                      }}
                    />
                    <span className="text-sm ink-muted opacity-80 group-hover:opacity-100 transition">
                      Upload landmark photos (up to 5)
                    </span>
                    <div className="mt-2">
                      <div
                        className="mx-auto rounded-full w-10 h-10 flex items-center justify-center text-xl opacity-70 group-hover:opacity-100 transition"
                        style={{
                          background: "var(--white)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        +
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="relative h-full w-full">
                    {/* Simple carousel: show current slide; use index in dataset */}
                    <LandmarkCarousel
                      urls={landmarkPreviewUrls}
                      onRemove={(idx) => removeLandmarkAt(idx)}
                      onClearAll={() => clearLandmarkPhotos()}
                      onAdd={() => landmarkInputMobileRef.current?.click()}
                    />
                  </div>
                )}
                {/* When photos exist, the inner carousel shows its own add button. */}
              </label>
            </div>

            {/* Group: Report Type / Species / Location / When */}
            <div className="space-y-3">
              <label className="block text-sm">
                Report Type
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as Exclude<AlertType, "all">)
                  }
                  required
                >
                  <option value="found">Found</option>
                  <option value="lost">Lost</option>
                  <option value="cruelty">Cruelty</option>
                </select>
              </label>
              <label className="block text-sm">
                Species
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={qSpecies}
                  onChange={(e) => setQSpecies(e.target.value)}
                  required
                >
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm">
                Location
                <div className="mt-1 flex items-center gap-2">
                  <input
                    className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)] cursor-not-allowed"
                    placeholder="Use the pin to pick location"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportLocation}
                    readOnly
                    aria-readonly
                    disabled
                    required
                  />
                  <button
                    type="button"
                    aria-label="Open map picker"
                    onClick={() => setShowMapPicker(true)}
                    className="rounded-xl px-3 py-2 text-white"
                    style={{ backgroundColor: "var(--primary-mintgreen)" }}
                  >
                    Pin
                  </button>
                </div>
                <p className="mt-1 text-xs ink-muted">
                  Use the pin to pick an exact location.
                </p>
              </label>
              <label className="block text-sm">
                When
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={qWhen}
                    onChange={(e) => setQWhen(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    aria-label="Set current date & time"
                    onClick={() => {
                      const now = new Date();
                      const iso = new Date(
                        now.getTime() - now.getTimezoneOffset() * 60000
                      )
                        .toISOString()
                        .slice(0, 16);
                      setQWhen(iso);
                    }}
                    className="rounded-xl px-3 py-2 text-white"
                    style={{ backgroundColor: "var(--primary-mintgreen)" }}
                  >
                    <Clock className="h-5 w-5" />
                  </button>
                </div>
              </label>
            </div>

            {/* Group: Checkboxes / Features/Description / Contact */}
            <div className="space-y-3">
              {/* Flags moved to column 1 above */}
              {isCruelty ? (
                <label className="block text-sm">
                  Description
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="What happened? When/where?"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                  />
                </label>
              ) : (
                <label className="block text-sm">
                  Distinctive Features (optional)
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="e.g., blue collar"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportDescription}
                    onChange={(e) => onQuickFeatureChange(e.target.value)}
                  />
                </label>
              )}
              <label className="block text-sm">
                Phone / Email (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="0900 000 0000 / you@example.com"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={qContact}
                  onChange={(e) => setQContact(e.target.value)}
                />
              </label>
              {/* Submit anonymously checkbox (mobile) */}
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={qAnon}
                  onChange={(e) => {
                    setQAnon(e.target.checked);
                    if (e.target.checked) showTipFor(e.target, "anonymous");
                    else hideTip();
                  }}
                />
                <span>Submit anonymously</span>
              </label>
              {isCruelty && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <p className="font-semibold ink-heading">Safety & Welfare</p>
                  <ul
                    className="ink-muted mt-2 space-y-1 pl-5"
                    style={{ listStyle: "disc" }}
                  >
                    <li>Do not intervene if unsafe.</li>
                    <li>Share exact location details.</li>
                    <li>Upload clear evidence if possible.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: centered photo placeholders above columns */}

          {/* Desktop layout (new 3-column design) */}
          <div className="hidden md:grid grid-cols-13 gap-6 mb-4 ">
            {/* Left column: Illustration */}
            <div className="col-span-4 rounded-[24px] ">
              <img
                src="/Report%20Illustration.svg"
                alt="Rescuer with cat illustration"
                className="w-full h-full relative object-contain object-left"
              />
            </div>
            {/* Right columns: green gradient panel */}
            <div
              className="col-span-9 rounded-[24px]  md:p-6 shadow-soft "
              style={{
                background:
                  "radial-gradient(circle at 50% 55%, color-mix(in srgb, #2A9D8F 60%, white 85%) 0%, color-mix(in srgb, #2A9D8F 80%, white 45%) 35%, #2A9D8F 65%, color-mix(in srgb, #2A9D8F 95%, black 10%) 100%), linear-gradient(180deg, #2A9D8F 0%, #36B4A8 100%)",
              }}
            >
              <div className="flex items-center gap-3 text-white mb-4">
                <ClipboardList />
                <h3 className="text-2xl font-extrabold tracking-wide">
                  iREPORT
                </h3>
              </div>
              <div
                className="bg-white rounded-[16px] p-4 md:p-5"
                style={{ border: "1px solid var(--border-color)" }}
              >
                <div className="grid grid-cols-4 gap-3">
                  {/* Stacked upload tiles reuse mobile/desktop handlers below. */}
                  <div className="space-y-4">
                    {/* Main photo tile */}
                    <label
                      className="relative group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                      htmlFor="report-photo"
                      style={{ border: "2px dashed var(--border-color)" }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="report-photo"
                        onChange={handlePhotoChange}
                        ref={reportPhotoInputRef}
                      />
                      {!reportPhotoPreviewUrl ? (
                        <>
                          <PawPrint
                            size={36}
                            strokeWidth={2}
                            style={{
                              color: "var(--primary-mintgreen)",
                              opacity: 0.8,
                            }}
                          />
                          <span className="text-sm ink-muted opacity-80 group-hover:opacity-100 transition">
                            {reportPhotoName
                              ? `Selected: ${reportPhotoName}`
                              : "Upload photo of the pet"}
                          </span>
                          <div className="mt-2">
                            <div
                              className="mx-auto rounded-full w-10 h-10 flex items-center justify-center text-xl opacity-70 group-hover:opacity-100 transition"
                              style={{
                                background: "var(--white)",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              +
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative h-full w-full">
                          <img
                            src={reportPhotoPreviewUrl!}
                            alt="Selected photo preview"
                            className="h-full w-full object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            className="absolute top-2 right-2 pill px-2 py-1 text-xs"
                            style={{
                              background: "var(--white)",
                              border: "1px solid var(--border-color)",
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              clearMainPhoto();
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </label>
                    {/* Landmarks tile */}
                    <label
                      className="relative group flex flex-col aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                      htmlFor="report-landmarks"
                      style={{ border: "2px dashed var(--border-color)" }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id="report-landmarks"
                        onChange={handleLandmarkPhotosChange}
                        ref={landmarkInputRef}
                      />
                      {landmarkPreviewUrls.length === 0 ? (
                        <>
                          <MapPinHouse
                            size={36}
                            strokeWidth={2}
                            style={{
                              color: "var(--primary-mintgreen)",
                              opacity: 0.8,
                            }}
                          />
                          <span className="text-sm ink-muted opacity-80 group-hover:opacity-100 transition">
                            Upload landmark photos (up to 5)
                          </span>
                          <div className="mt-2">
                            <div
                              className="mx-auto rounded-full w-10 h-10 flex items-center justify-center text-xl opacity-70 group-hover:opacity-100 transition"
                              style={{
                                background: "var(--white)",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              +
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="relative h-full w-full">
                          <LandmarkCarousel
                            urls={landmarkPreviewUrls}
                            onRemove={(idx) => removeLandmarkAt(idx)}
                            onClearAll={() => clearLandmarkPhotos()}
                            onAdd={() => landmarkInputRef.current?.click()}
                          />
                        </div>
                      )}
                    </label>
                    {/* Extra tile removed */}
                  </div>
                  {/* Right: form fields */}
                  <div className="col-span-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm">
                        Report Type
                        <select
                          className="mt-1 w-full rounded-xl px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          value={reportType}
                          onChange={(e) =>
                            setReportType(
                              e.target.value as Exclude<AlertType, "all">
                            )
                          }
                          required
                        >
                          <option value="found">Found</option>
                          <option value="lost">Lost</option>
                          <option value="cruelty">Cruelty</option>
                        </select>
                      </label>
                      <label className="block text-sm">
                        Species
                        <select
                          className="mt-1 w-full rounded-xl px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          value={qSpecies}
                          onChange={(e) => setQSpecies(e.target.value)}
                          required={!isCruelty}
                        >
                          <option>Dog</option>
                          <option>Cat</option>
                          <option>Other</option>
                        </select>
                      </label>
                    </div>
                    {/* Species field moved into the 2-column header row */}
                    <label className="block text-sm">
                      Location
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)] cursor-not-allowed"
                          placeholder="Use the pin to pick location"
                          style={{ border: "1px solid var(--border-color)" }}
                          value={reportLocation}
                          readOnly
                          aria-readonly
                          disabled
                          required
                        />
                        <button
                          type="button"
                          className="pill px-3 py-2"
                          style={{
                            border: "1px solid var(--border-color)",
                            background: "var(--primary-mintgreen)",
                            color: "var(--white)",
                          }}
                          onClick={() => setShowMapPicker(true)}
                        >
                          Pin
                        </button>
                      </div>
                      <div className="mt-1 text-xs ink-subtle">
                        Use the pin to pick an exact location.
                      </div>
                    </label>
                    <label className="block text-sm">
                      {isCruelty
                        ? "Description"
                        : "Distinctive Features (optional)"}
                      <input
                        className="mt-1 w-full rounded-xl px-3 py-2"
                        style={{ border: "1px solid var(--border-color)" }}
                        placeholder={
                          isCruelty
                            ? "Describe the situation"
                            : "e.g., blue collar"
                        }
                        value={reportDescription}
                        onChange={(e) => onQuickFeatureChange(e.target.value)}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm">
                        When
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="datetime-local"
                            className="w-full rounded-xl px-3 py-2"
                            style={{
                              border: "1px solid var(--border-color)",
                            }}
                            value={qWhen}
                            onChange={(e) => setQWhen(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="pill px-3 py-2"
                            style={{
                              border: "1px solid var(--border-color)",
                              background: "var(--primary-mintgreen)",
                              color: "var(--white)",
                            }}
                            onClick={() => {
                              const now = new Date();
                              const iso = new Date(
                                now.getTime() - now.getTimezoneOffset() * 60000
                              )
                                .toISOString()
                                .slice(0, 16);
                              setQWhen(iso);
                            }}
                          >
                            Auto
                          </button>
                        </div>
                        <div className="mt-1 text-xs ink-subtle">
                          You can type a date/time or tap the auto to set now.
                        </div>
                      </label>

                      <label className="block text-sm">
                        Phone / Email (optional)
                        <input
                          className="mt-1 w-full rounded-xl px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          placeholder="0900 000 0000 / you@example.com"
                          value={qContact}
                          onChange={(e) => setQContact(e.target.value)}
                        />
                      </label>
                    </div>
                    {/* Desktop: flags visible in Quick Submit */}
                    <div className="hidden md:flex mt-2 flex-wrap items-center gap-4">
                      <label
                        className="inline-flex items-center gap-2 text-sm"
                        style={
                          qAggressive
                            ? { color: "var(--primary-orange)" }
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={qAggressive}
                          onChange={(e) => {
                            onQuickAggressiveToggle(e.target.checked);
                            if (e.target.checked) openFlagModal("aggressive");
                          }}
                          style={
                            qAggressive
                              ? ({
                                  accentColor: "var(--primary-orange)",
                                } as React.CSSProperties)
                              : undefined
                          }
                        />
                        <span>Aggressive</span>
                      </label>
                      <label
                        className="inline-flex items-center gap-2 text-sm"
                        style={
                          qFriendly
                            ? { color: "var(--primary-mintgreen)" }
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={qFriendly}
                          onChange={(e) => {
                            onQuickFriendlyToggle(e.target.checked);
                            if (e.target.checked) openFlagModal("friendly");
                          }}
                          style={
                            qFriendly
                              ? ({
                                  accentColor: "var(--primary-mintgreen)",
                                } as React.CSSProperties)
                              : undefined
                          }
                        />
                        <span>Friendly</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={qAnon}
                          onChange={(e) => {
                            setQAnon(e.target.checked);
                            if (e.target.checked)
                              showTipFor(e.target, "anonymous");
                            else hideTip();
                          }}
                        />
                        <span>Submit anonymously</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-nowrap items-stretch gap-2 pt-2">
                  <button
                    type="submit"
                    className={
                      isCruelty
                        ? "btn px-4 py-2 flex-1 min-w-0 text-white"
                        : "btn btn-accent px-4 py-2 flex-1 min-w-0"
                    }
                    style={
                      isCruelty
                        ? ({
                            backgroundColor: "var(--primary-mintgreen)",
                          } as React.CSSProperties)
                        : undefined
                    }
                    disabled={reportStatus === "submitting"}
                  >
                    {reportStatus === "submitting"
                      ? "Submitting."
                      : isCruelty
                      ? "Submit Report"
                      : "Submit"}
                  </button>
                  <a
                    href="/report-form"
                    className="btn px-4 py-2 flex-1 min-w-0 text-center bg-white"
                    style={{ border: "1px solid var(--border-color)" }}
                    onClick={persistDraftToSession}
                  >
                    More Detailed Form
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:hidden">
            {/* Column 1: Report Type + Location + Features */}
            <div className="order-2 space-y-3 md:order-none">
              <label className="block text-sm">
                Report Type
                <select
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as Exclude<AlertType, "all">)
                  }
                  required
                >
                  <option value="found">Found</option>
                  <option value="lost">Lost</option>
                  <option value="cruelty">Cruelty</option>
                </select>
              </label>

              <label className="block text-sm">
                Location
                <div className="mt-1 flex items-center gap-2">
                  <input
                    className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)] cursor-not-allowed"
                    placeholder="Use the pin to pick location"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportLocation}
                    readOnly
                    aria-readonly
                    disabled
                    required
                  />
                  <button
                    type="button"
                    aria-label="Open map picker"
                    onClick={() => setShowMapPicker(true)}
                    className="rounded-xl px-3 py-2 text-white"
                    style={{ backgroundColor: "var(--primary-mintgreen)" }}
                  >
                    Pin
                  </button>
                </div>
                <p className="mt-1 text-xs ink-muted">
                  Use the pin to pick an exact location.
                </p>
              </label>

              {isCruelty ? (
                <label className="block text-sm">
                  Description
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="What happened? When/where?"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                  />
                </label>
              ) : (
                <label className="block text-sm">
                  Distinctive Features (optional)
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="e.g., blue collar"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportDescription}
                    onChange={(e) => onQuickFeatureChange(e.target.value)}
                  />
                </label>
              )}
              {/* flags removed on desktop */}
            </div>

            {/* Column 2: When + Contact + Flags */}
            <div className="order-3 space-y-3 md:order-none">
              <>
                <label className="block text-sm">
                  Species
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={qSpecies}
                    onChange={(e) => setQSpecies(e.target.value)}
                    required
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="block text-sm">
                  When
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl px-3 py-2"
                      style={{ border: "1px solid var(--border-color)" }}
                      value={qWhen}
                      onChange={(e) => setQWhen(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label="Set current date & time"
                      onClick={() => {
                        const now = new Date();
                        const iso = new Date(
                          now.getTime() - now.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16);
                        setQWhen(iso);
                      }}
                      className="rounded-xl px-3 py-2 text-white"
                      style={{ backgroundColor: "var(--primary-mintgreen)" }}
                    >
                      Auto
                    </button>
                  </div>
                  <p className="mt-1 text-xs ink-muted">
                    You can type a date/time or tap the auto to set now.
                  </p>
                </label>
              </>
              <label className="block text-sm">
                Phone / Email (optional)
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2"
                  placeholder="0900 000 0000 / you@example.com"
                  style={{ border: "1px solid var(--border-color)" }}
                  value={qContact}
                  onChange={(e) => setQContact(e.target.value)}
                />
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-4">
                <>
                  <label
                    className="inline-flex items-center gap-2 text-sm"
                    style={
                      qAggressive
                        ? { color: "var(--primary-orange)" }
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={qAggressive}
                      onChange={(e) => {
                        onQuickAggressiveToggle(e.target.checked);
                        if (e.target.checked) openFlagModal("aggressive");
                      }}
                      style={
                        qAggressive
                          ? ({
                              accentColor: "var(--primary-orange)",
                            } as React.CSSProperties)
                          : undefined
                      }
                    />
                    <span>This pet may be aggressive</span>
                  </label>
                  <label
                    className="inline-flex items-center gap-2 text-sm"
                    style={
                      qFriendly
                        ? { color: "var(--primary-mintgreen)" }
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={qFriendly}
                      onChange={(e) => {
                        onQuickFriendlyToggle(e.target.checked);
                        if (e.target.checked) openFlagModal("friendly");
                      }}
                      style={
                        qFriendly
                          ? ({
                              accentColor: "var(--primary-mintgreen)",
                            } as React.CSSProperties)
                          : undefined
                      }
                    />
                    <span>Pet seems friendly</span>
                  </label>
                </>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={qAnon}
                    onChange={(e) => {
                      setQAnon(e.target.checked);
                      if (e.target.checked) showTipFor(e.target, "anonymous");
                      else hideTip();
                    }}
                  />
                  <span>Submit anonymously</span>
                </label>
                {isCruelty && (
                  <div
                    className="basis-full rounded-xl p-4 mt-2"
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <p className="font-semibold ink-heading">
                      Safety & Welfare
                    </p>
                    <ul
                      className="ink-muted mt-2 space-y-1 pl-5"
                      style={{ listStyle: "disc" }}
                    >
                      <li>Do not intervene if unsafe.</li>
                      <li>Share exact location details.</li>
                      <li>Upload clear evidence if possible.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkboxes moved into column 2 */}

          <div className="flex flex-nowrap items-stretch gap-2 pt-2 md:hidden">
            <button
              type="submit"
              className={
                isCruelty
                  ? "btn px-4 py-2 flex-1 min-w-0 text-white"
                  : "btn btn-accent px-4 py-2 flex-1 min-w-0"
              }
              style={
                isCruelty
                  ? ({
                      backgroundColor: "var(--primary-mintgreen)",
                    } as React.CSSProperties)
                  : undefined
              }
              disabled={reportStatus === "submitting"}
            >
              {reportStatus === "submitting"
                ? "Submitting..."
                : isCruelty
                ? "Submit Report"
                : "Submit sighting"}
            </button>
            <Link
              href="/report-form"
              className="btn px-4 py-2 flex-1 min-w-0 text-center"
              style={{ border: "1px solid var(--border-color)" }}
              onClick={persistDraftToSession}
            >
              Add more details...
            </Link>
            {showQuickValidation && !isQuickFormValid && (
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--primary-orange)" }}
                aria-live="polite"
              >
                Please fill required fields: {missingFields.join(" and ") || ""}
                .
              </p>
            )}
            {/* success/error toasts handled globally */}
          </div>
        </form>
      </div>

      {/* Regular Report moved to /report-form */}
      {tipOpen && tipKey && (
        <div
          className="fixed z-50"
          style={{
            top: tipPos.top,
            left: tipPos.left,
            width: "min(92vw, 360px)",
          }}
          role="dialog"
          aria-live="polite"
        >
          <div
            className="surface rounded-2xl p-3 shadow-soft"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm">{getTipContent(tipKey)}</div>
              <button
                type="button"
                className="pill px-2 py-1 text-xs"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={hideTip}
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="absolute"
            style={
              {
                width: 12,
                height: 12,
                left: tipPos.arrowLeft,
                [tipPos.below ? "top" : "bottom"]: -6,
                background: "var(--white)",
                transform: `rotate(${tipPos.below ? 45 : 225}deg)`,
                borderLeft: "1px solid var(--border-color)",
                borderTop: "1px solid var(--border-color)",
              } as React.CSSProperties
            }
          />
        </div>
      )}
      <MapPickerModal
        open={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={(lat, lng, address) => {
          setReportLocation(address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setReportCoords(lat, lng);
          setShowMapPicker(false);
        }}
      />
      {/* Aggressive/Friendly info modal (DetailsModal-style) */}
      {flagKey && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] grid place-items-center p-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={closeFlagModal}
              />
              <div className="relative w-full max-w-[700px] rounded-2xl shadow-soft surface p-5">
                <div className="relative ">
                  {flagKey === "aggressive"
                    ? getTipContent("aggressive")
                    : getTipContent("friendly")}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}

function LandmarkCarousel({
  urls,
  onRemove,
  onClearAll,
  onAdd,
}: {
  urls: string[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
  onAdd?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const count = urls.length;
  const current = useMemo(
    () => (count ? urls[Math.min(index, count - 1)] : null),
    [urls, index, count]
  );
  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);
  // When new photos are added, jump to the latest one
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (count > prevCountRef.current) {
      setIndex(Math.max(0, count - 1));
    }
    prevCountRef.current = count;
  }, [count]);
  if (count === 0) return null;
  return (
    <div className="relative h-full w-full">
      {/* image */}
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt={`landmark ${index + 1} of ${count}`}
          className="h-full w-full object-cover rounded-xl"
        />
      )}
      {/* arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 pill px-3 py-1 text-sm shadow-soft"
            style={{
              background: "var(--white)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((i) => (i - 1 + count) % count);
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 pill px-3 py-1 text-sm shadow-soft"
            style={{
              background: "var(--white)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((i) => (i + 1) % count);
            }}
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
      {/* index indicator */}
      <div
        className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
      >
        {Math.min(index + 1, count)}/{count}
      </div>
      {/* add more pill (bottom-right) */}
      {count < 5 && onAdd && (
        <button
          type="button"
          className="absolute bottom-2 right-2 pill px-2 py-1 text-xs"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-color)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd();
          }}
          aria-label="Add more photos"
        >
          +
        </button>
      )}
      {/* remove pill (current) */}
      <button
        type="button"
        className="absolute top-2 right-2 pill px-2 py-1 text-xs"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border-color)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(Math.min(index, count - 1));
          setIndex((i) => Math.max(0, i - 1));
        }}
      >
        Remove
      </button>
      {/* clear all pill */}
      <button
        type="button"
        className="absolute top-2 left-2 pill px-2 py-1 text-xs"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border-color)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClearAll();
          setIndex(0);
        }}
      >
        Clear
      </button>
    </div>
  );
}
