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
  Maximize2,
  X,
} from "lucide-react";
import MapPickerModal from "@/components/MapPickerModal";
import { AlertType, ReportStatus, PetStatus } from "@/types/app";
import { useEffect } from "react";
import { showToast } from "@/lib/toast";
import { useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { SPECIES_SUGGESTIONS } from "@/constants/species";

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
      petStatus?: PetStatus;
      eventAt?: string | null;
      features?: string | null;
      isAggressive?: boolean;
      isFriendly?: boolean;
    }
  ) => void;
  reportPhotoInputRef: RefObject<HTMLInputElement>;
  mainMediaItems: { url: string; kind: "image" | "video" }[];
  removeMainMediaAt: (index: number) => void;
  // Landmark photos (multiple)
  landmarkMedia: { url: string; kind: "image" | "video" }[];
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
  mainMediaItems,
  removeMainMediaAt,
  landmarkMedia,
  handleLandmarkPhotosChange,
  removeLandmarkAt,
  clearLandmarkPhotos,
  landmarkInputRef,
  landmarkInputMobileRef,
}: ReportSectionProps) {
  // Local UI state for the quick form and modal behavior
  const [qSpecies, setQSpecies] = useState("");
  const [qSpeciesOther, setQSpeciesOther] = useState("");
  const [qWhen, setQWhen] = useState("");
  const [qContact, setQContact] = useState("");
  const [qAggressive, setQAggressive] = useState(false);
  const [qAnon, setQAnon] = useState(false);
  const [qFriendly, setQFriendly] = useState(false);
  const [qPetStatus, setQPetStatus] = useState("");
  const [showQuickValidation, setShowQuickValidation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mediaViewerUrl, setMediaViewerUrl] = useState<string | null>(null);
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
  useEffect(() => {
    if (!mediaViewerUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMediaViewerUrl(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mediaViewerUrl]);
  const openFlagModal = (k: "aggressive" | "friendly") => setFlagKey(k);
  const closeFlagModal = () => setFlagKey(null);

  // Derived flags
  const isCruelty = reportType === "cruelty";
  const speciesValue = qSpecies.trim();
  const speciesKey = speciesValue.toLowerCase();
  const isOtherSpecies = speciesKey === "other" || speciesKey === "others";
  const otherSpeciesValue = qSpeciesOther.trim();
  const requiresOtherSpecies = !isCruelty && isOtherSpecies;
  const isSpeciesMissing = !isCruelty && !speciesValue;
  const isOtherSpeciesMissing = requiresOtherSpecies && !otherSpeciesValue;
  const showSpeciesError = showQuickValidation
    && (isSpeciesMissing || isOtherSpeciesMissing);
  const effectiveSpecies = isOtherSpecies
    ? otherSpeciesValue
      ? `others;${otherSpeciesValue}`
      : speciesValue
    : speciesValue;
  const speciesBorderStyle = {
    border: "1px solid var(--border-color)",
    ...(showSpeciesError ? { borderColor: "var(--primary-red)" } : {}),
  } as React.CSSProperties;
  const speciesDividerStyle = {
    width: 1,
    background: showSpeciesError ? "var(--primary-red)" : "var(--border-color)",
  } as React.CSSProperties;

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
            <div className="col-span-2 p-5">
              <p className="text-lg font-semibold">
                Aggressive / Fearful - Safety First
              </p>
              <p className="mt-1 text-lg text-justify">
                Do not approach. Keep 3-5 meters away. Avoid eye contact and
                sudden moves. Observe from a distance and include a clear photo
                if possible.
              </p>{" "}
              <i className="text-gray-600 text-justify">
                (Huwag lalapitan. Manatiling 3–5 metro ang layo. Iwasang tumitig
                o gumalaw nang bigla. Obserbahan na lang mula sa malayo at kunan
                ng malinaw na litrato kung kaya.)
              </i>
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
            <div className="col-span-2 p-5">
              <p className="text-lg font-semibold">
                Seems Friendly - Approach Slowly
              </p>
              <p className="mt-1 text-lg text-justify">
                Speak softly and crouch to appear smaller. Check for a collar or
                tag. Offer water; avoid chasing.
              </p>
              <i className="text-gray-600 text-justify">
                (Magsalita nang dahan-dahan at yumuko para hindi matakot ang
                alaga. Tingnan kung may kwelyo o tag. Bigyan ng tubig, huwag
                habulin.)
              </i>
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
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUserEmail(u?.email ?? null);
      const fullName =
        (u?.user_metadata?.full_name as string | undefined) ?? null;
      setUserName(fullName);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
      const fullName =
        (session?.user?.user_metadata?.full_name as string | undefined) ?? null;
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
        species: effectiveSpecies,
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
    qSpeciesOther,
    effectiveSpecies,
    qWhen,
    reportDescription,
    reportLocation,
    reportType,
    reportCondition,
    reportPhotoName,
    qFriendly,
  ]);

  // Show toast messages for submit status and reset fields on success
  const didHandleSuccessRef = useRef(false);
  useEffect(() => {
    if (reportStatus === "success") {
      if (didHandleSuccessRef.current) return;
      didHandleSuccessRef.current = true;
      showToast("success", "Report submitted! Rescue team notified.");
      // Reset quick form fields to defaults
      try {
        setReportType("found");
      } catch {}
      try {
        setReportCondition("Healthy");
      } catch {}
      setQSpecies("");
      setQSpeciesOther("");
      setQWhen("");
      setQContact("");
      setQAggressive(false);
      setQFriendly(false);
      setQAnon(false);
      setQPetStatus("");
      setShowQuickValidation(false);
      try {
        setReportLocation("");
        setReportDescription("");
      } catch {}
      try {
        clearLandmarkPhotos();
      } catch {}
    } else {
      // Reset the success guard when status leaves 'success'
      didHandleSuccessRef.current = false;
      if (reportStatus === "error") {
        showToast("error", "Something went wrong. Please try again.");
      }
    }
  }, [
    reportStatus,
    setReportType,
    setReportCondition,
    setReportLocation,
    setReportDescription,
    clearLandmarkPhotos,
  ]);

  const quickSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      // Show a friendly notice if required fields are missing
      const formValid = isCruelty
        ? Boolean(reportLocation.trim() && reportDescription.trim())
        : Boolean(
            reportType
              && speciesValue
              && reportLocation.trim()
              && qWhen.trim()
              && (!requiresOtherSpecies || otherSpeciesValue)
          );
      if (!formValid) {
        setShowQuickValidation(true);
        return;
      }
      // Optionally enrich the description with light context (species/when)
      // without altering the API. We only do this if the description is empty.
      if (!reportDescription.trim() && !isCruelty) {
        const parts = [
          effectiveSpecies ? `Species: ${effectiveSpecies}` : "",
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
        : qContact?.trim() || userEmail || null;
      const reporterName = qAnon ? null : userName || null;
      const toPetStatus = (label: string): PetStatus =>
        label.trim().toLowerCase() === "in custody" ? "in_custody" : "roaming";
      handleSubmitReport(effectiveSpecies, {
        reporterContact,
        reporterName,
        isAnonymous: qAnon,
        petStatus: toPetStatus(qPetStatus || "Roaming"),
        eventAt: qWhen ? new Date(qWhen).toISOString() : null,
        features: reportDescription.trim() ? reportDescription.trim() : null,
        isAggressive: qAggressive,
        isFriendly: qFriendly,
      });
    },
    [
      handleSubmitReport,
      qAnon,
      qContact,
      qSpecies,
      qSpeciesOther,
      qWhen,
      reportDescription,
      setReportDescription,
      reportLocation,
      reportType,
      isCruelty,
      userEmail,
      userName,
      effectiveSpecies,
      requiresOtherSpecies,
      otherSpeciesValue,
      speciesValue,
    ]
  );

  // Disable submit until required fields are present
  const isQuickFormValid = isCruelty
    ? Boolean(reportLocation.trim() && reportDescription.trim())
    : Boolean(
        reportType
          && speciesValue
          && reportLocation.trim()
          && qWhen.trim()
          && (!requiresOtherSpecies || otherSpeciesValue)
      );

  const missingFields = [] as string[];
  if (!reportLocation.trim()) missingFields.push("Location");
  if (isCruelty) {
    if (!reportDescription.trim()) missingFields.push("Description");
  } else {
    if (!speciesValue) missingFields.push("Species");
    if (requiresOtherSpecies && !otherSpeciesValue) {
      missingFields.push("Specify Pet");
    }
    if (!qWhen.trim()) missingFields.push("When");
  }

  return (
    <section
      id="report"
      className="relative mt-4 md:mt-12 px-4 pt-4 md:pt-8 pb-8 sm:px-6 lg:px-8 snap-start w-full "
    >
      {/* Quick Report content (header and white background removed) */}

      <div className="mx-auto max-w-screen-2xl">
        <form className="mt-5 space-y-3" onSubmit={quickSubmit}>
          {/* Mobile layout */}
          <div className="md:hidden">
            <div className="rounded-[24px] bg-white shadow-soft p-4 space-y-4">
              {/* Photos */}
              <div>
                <label
                  className="mt-2 relative group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                  data-onboard="report-photos"
                  htmlFor="report-photo-mobile"
                  style={{ border: "2px dashed var(--border-color)" }}
                >
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    multiple
                    className="hidden"
                    id="report-photo-mobile"
                    onChange={handlePhotoChange}
                    ref={reportPhotoInputRef}
                  />
                  {mainMediaItems.length === 0 ? (
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
                          : "Upload pet media"}
                      </span>
                      <span className="mt-1 text-xs ink-subtle">
                        Videos currently work best up to 20 seconds and 100 MB.
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
                        <MainMediaCarousel
                          items={mainMediaItems}
                          onRemove={removeMainMediaAt}
                          onAdd={() => reportPhotoInputRef.current?.click()}
                          onFullscreen={(url) => setMediaViewerUrl(url)}
                        />
                      </div>
                    )}
                </label>
              </div>

              {/* Landmark Photos (multiple) */}
              <div>
                <label
                  className="mt-1 relative group flex flex-col aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                  data-onboard="report-landmarks"
                  htmlFor="report-landmarks-mobile"
                  style={{ border: "2px dashed var(--border-color)" }}
                >
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    multiple
                    className="hidden"
                    id="report-landmarks-mobile"
                    onChange={handleLandmarkPhotosChange}
                    ref={landmarkInputMobileRef}
                  />
                  {landmarkMedia.length === 0 ? (
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
                        Upload landmark / location media (up to 5)
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
                        items={landmarkMedia}
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
                    data-onboard="report-type"
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
                  {isOtherSpecies ? (
                    <div
                      className="mt-1 flex items-stretch rounded-xl overflow-hidden"
                      style={speciesBorderStyle}
                    >
                      <input
                        list="species-options-mobile"
                        className="flex-1 min-w-0 px-3 py-2 bg-transparent outline-none"
                        style={{ border: "none" }}
                        data-onboard="report-species"
                        value={qSpecies || "Other"}
                        readOnly
                        aria-readonly
                        required={!isCruelty}
                      />
                      <span aria-hidden="true" style={speciesDividerStyle} />
                      <input
                        className="flex-1 min-w-0 px-3 py-2 bg-transparent outline-none"
                        style={{ border: "none" }}
                        value={qSpeciesOther}
                        onChange={(e) => setQSpeciesOther(e.target.value)}
                        placeholder="Please specify the pet"
                        required={requiresOtherSpecies}
                      />
                    </div>
                  ) : (
                    <input
                      list="species-options-mobile"
                      className="mt-1 w-full rounded-xl px-3 py-2"
                      style={speciesBorderStyle}
                      data-onboard="report-species"
                      value={qSpecies}
                      onChange={(e) => {
                        const next = e.target.value;
                        setQSpecies(next);
                        const key = next.trim().toLowerCase();
                        if (key !== "other" && key !== "others") {
                          setQSpeciesOther("");
                        }
                      }}
                      placeholder="Dog, Cat, Bird, etc."
                      required={!isCruelty}
                    />
                  )}
                  <datalist id="species-options-mobile">
                    {SPECIES_SUGGESTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
                <div className="grid col-end-2"></div>
                <label className="block text-sm">
                  Location
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)] cursor-not-allowed"
                      placeholder="Use the pin to pick location"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor:
                          showQuickValidation && !reportLocation.trim()
                            ? "var(--primary-red)"
                            : "var(--border-color)",
                      }}
                      aria-invalid={
                        showQuickValidation && !reportLocation.trim()
                      }
                      value={reportLocation}
                      readOnly
                      aria-readonly
                      disabled
                      required
                    />
                    <button
                      type="button"
                      aria-label="Open map picker"
                      data-onboard="report-location"
                      onClick={() => setShowMapPicker(true)}
                      className="rounded-xl px-3 py-2 text-white"
                      style={{
                        backgroundColor:
                          showQuickValidation && !reportLocation.trim()
                            ? "var(--primary-red)"
                            : "var(--primary-mintgreen)",
                      }}
                    >
                      Pin
                    </button>
                  </div>
                  <p className="mt-1 text-xs ink-muted">
                    Use the pin to pick an exact location.
                  </p>
                  {showQuickValidation && !reportLocation.trim() && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--primary-red)" }}
                    >
                      Location is required.
                    </p>
                  )}
                </label>
                <label className="block text-sm">
                  When
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl px-3 py-2"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor:
                          showQuickValidation && !isCruelty && !qWhen.trim()
                            ? "var(--primary-red)"
                            : "var(--border-color)",
                      }}
                      aria-invalid={
                        showQuickValidation && !isCruelty && !qWhen.trim()
                      }
                      value={qWhen}
                      onChange={(e) => setQWhen(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label="Set current date & time"
                      data-onboard="report-when-auto"
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
                      data-onboard="report-features"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor:
                          showQuickValidation && !reportDescription.trim()
                            ? "var(--primary-red)"
                            : "var(--border-color)",
                      }}
                      aria-invalid={
                        showQuickValidation && !reportDescription.trim()
                      }
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                    />
                    {showQuickValidation && !reportDescription.trim() && (
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--primary-red)" }}
                      >
                        Description is required.
                      </p>
                    )}
                  </label>
                ) : (
                  <label className="block text-sm">
                    Distinctive Features (optional)
                    <input
                      className="mt-1 w-full rounded-xl px-3 py-2"
                      placeholder="e.g., blue collar"
                      data-onboard="report-features"
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
                    data-onboard="report-contact"
                    value={qContact}
                    onChange={(e) => setQContact(e.target.value)}
                  />
                </label>
                {/* Pet status (mirror desktop) */}
                <label className="block text-sm">
                  Pet Status
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    data-onboard="report-status"
                    value={qPetStatus}
                    onChange={(e) => setQPetStatus(e.target.value)}
                  >
                    <option value="Roaming">Roaming</option>
                    <option value="In Custody">In Custody</option>
                  </select>
                </label>
                {/* Behavior flags (mirror desktop) */}
                <div
                  className="flex items-center gap-4 flex-wrap"
                  data-onboard="report-temperament"
                >
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
                </div>
                {/* Submit anonymously checkbox (mobile) */}
                <label
                  className="inline-flex items-center gap-2 text-sm"
                  data-onboard="report-anon"
                >
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
                      data-onboard="report-photos"
                      htmlFor="report-photo"
                      style={{ border: "2px dashed var(--border-color)" }}
                    >
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/quicktime,video/webm"
                        multiple
                        className="hidden"
                        id="report-photo"
                        onChange={handlePhotoChange}
                        ref={reportPhotoInputRef}
                      />
                      {mainMediaItems.length === 0 ? (
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
                              : "Upload pet media"}
                          </span>
                          <span className="mt-1 text-xs ink-subtle">
                            Videos currently work best up to 20 seconds and 100 MB.
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
                          <MainMediaCarousel
                            items={mainMediaItems}
                            onRemove={removeMainMediaAt}
                            onAdd={() => reportPhotoInputRef.current?.click()}
                            onFullscreen={(url) => setMediaViewerUrl(url)}
                          />
                        </div>
                      )}
                    </label>
                    {/* Landmarks tile */}
                    <label
                      className="relative group flex flex-col aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
                      data-onboard="report-landmarks"
                      htmlFor="report-landmarks"
                      style={{ border: "2px dashed var(--border-color)" }}
                    >
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    multiple
                        className="hidden"
                        id="report-landmarks"
                        onChange={handleLandmarkPhotosChange}
                        ref={landmarkInputRef}
                      />
                      {landmarkMedia.length === 0 ? (
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
                            Upload landmark / location media (up to 5)
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
                            items={landmarkMedia}
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
                          data-onboard="report-type"
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
                        {isOtherSpecies ? (
                          <div
                            className="mt-1 flex items-stretch rounded-xl overflow-hidden"
                            style={speciesBorderStyle}
                          >
                            <input
                              list="species-options-desktop"
                              className="flex-1 min-w-0 px-3 py-2 bg-transparent outline-none"
                              style={{ border: "none" }}
                              data-onboard="report-species"
                              value={qSpecies || "Other"}
                              readOnly
                              aria-readonly
                              required={!isCruelty}
                            />
                            <span
                              aria-hidden="true"
                              style={speciesDividerStyle}
                            />
                            <input
                              className="flex-1 min-w-0 px-3 py-2 bg-transparent outline-none"
                              style={{ border: "none" }}
                              value={qSpeciesOther}
                              onChange={(e) => setQSpeciesOther(e.target.value)}
                              placeholder="Please specify the pet"
                              required={requiresOtherSpecies}
                            />
                          </div>
                        ) : (
                          <input
                            list="species-options-desktop"
                            className="mt-1 w-full rounded-xl px-3 py-2"
                            style={speciesBorderStyle}
                            data-onboard="report-species"
                            value={qSpecies}
                            onChange={(e) => {
                              const next = e.target.value;
                              setQSpecies(next);
                              const key = next.trim().toLowerCase();
                              if (key !== "other" && key !== "others") {
                                setQSpeciesOther("");
                              }
                            }}
                            placeholder="Dog, Cat, Bird, etc."
                            required={!isCruelty}
                          />
                        )}
                        <datalist id="species-options-desktop">
                          {SPECIES_SUGGESTIONS.map((opt) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                      </label>
                    </div>
                    {/* Species field moved into the 2-column header row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-1">
                        <label className="block text-sm">
                          Location
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              className="w-full rounded-xl px-3 py-2 bg-[var(--card-bg)] cursor-not-allowed"
                              placeholder="Use the pin to pick location"
                              style={{
                                border: "1px solid var(--border-color)",
                                ...(showQuickValidation &&
                                !reportLocation.trim()
                                  ? { borderColor: "var(--primary-red)" }
                                  : {}),
                              }}
                              aria-invalid={
                                showQuickValidation && !reportLocation.trim()
                              }
                              value={reportLocation}
                              readOnly
                              aria-readonly
                              disabled
                              required
                            />
                            <button
                              type="button"
                              className="pill px-3 py-2"
                              data-onboard="report-location"
                              style={{
                                border: "1px solid var(--border-color)",
                                background:
                                  showQuickValidation && !reportLocation.trim()
                                    ? "var(--primary-red)"
                                    : "var(--primary-mintgreen)",
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
                          {showQuickValidation && !reportLocation.trim() && (
                            <div
                              className="mt-1 text-xs"
                              style={{ color: "var(--primary-red)" }}
                            >
                              Location is required.
                            </div>
                          )}
                        </label>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm">
                          When
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="datetime-local"
                              className="w-full rounded-xl px-3 py-2"
                              style={{
                                borderWidth: 1,
                                borderStyle: "solid",
                                borderColor:
                                  showQuickValidation &&
                                  !isCruelty &&
                                  !qWhen.trim()
                                    ? "var(--primary-red)"
                                    : "var(--border-color)",
                              }}
                              aria-invalid={
                                showQuickValidation &&
                                !isCruelty &&
                                !qWhen.trim()
                              }
                              value={qWhen}
                              onChange={(e) => setQWhen(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="pill px-3 py-2"
                              data-onboard="report-when-auto"
                              style={{
                                border: "1px solid var(--border-color)",
                                background: "var(--primary-mintgreen)",
                                color: "var(--white)",
                              }}
                              onClick={() => {
                                const now = new Date();
                                const iso = new Date(
                                  now.getTime() -
                                    now.getTimezoneOffset() * 60000
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
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-sm">
                        Phone / Email (optional)
                        <input
                          className="mt-1 w-full rounded-xl px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          placeholder="0900 000 0000 / you@example.com"
                          data-onboard="report-contact"
                          value={qContact}
                          onChange={(e) => setQContact(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm">
                        Pet Status
                        <select
                          className="mt-1 w-full rounded-xl px-3 py-2"
                          style={{ border: "1px solid var(--border-color)" }}
                          data-onboard="report-status"
                          value={qPetStatus}
                          onChange={(e) => setQPetStatus(e.target.value)}
                        >
                          <option value="Roaming">Roaming</option>
                          <option value="In Custody">In Custody</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm">
                      {isCruelty
                        ? "Description"
                        : "Distinctive Features (optional)"}
                      <input
                        className="mt-1 w-full rounded-xl px-3 py-2"
                        data-onboard="report-features"
                        style={{
                          border: "1px solid var(--border-color)",
                          ...(showQuickValidation &&
                          isCruelty &&
                          !reportDescription.trim()
                            ? { borderColor: "var(--primary-red)" }
                            : {}),
                        }}
                        aria-invalid={
                          showQuickValidation &&
                          isCruelty &&
                          !reportDescription.trim()
                        }
                        placeholder={
                          isCruelty
                            ? "Describe the situation"
                            : "e.g., blue collar"
                        }
                        value={reportDescription}
                        onChange={(e) => onQuickFeatureChange(e.target.value)}
                      />
                      {showQuickValidation &&
                        isCruelty &&
                        !reportDescription.trim() && (
                          <div
                            className="mt-1 text-xs"
                            style={{ color: "var(--primary-red)" }}
                          >
                            Description is required.
                          </div>
                        )}
                    </label>

                    {/* Desktop: flags visible in Quick Submit */}
                    <div
                      className="hidden md:flex mt-2 flex-wrap items-center gap-4"
                      data-onboard="report-temperament"
                    >
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
                      <label
                        className="inline-flex items-center gap-2 text-sm"
                        data-onboard="report-anon"
                      >
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
                    data-onboard="report-submit"
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
                    className="btn px-4 py-2 flex-1 min-w-0 text-center bg-[#ECEEEF] hover:bg-[var(--primary-mintgreen)] hover:text-white transition-colors"
                    style={{ border: "1px solid var(--border-color)" }}
                    data-onboard="report-detailed"
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
                  {isOtherSpecies ? (
                    <div
                      className="mt-1 flex items-stretch rounded-xl overflow-hidden"
                      style={speciesBorderStyle}
                    >
                      <input
                        list="species-options-hidden"
                        className="flex-1 min-w-0 px-3 py-2 bg-transparent outline-none"
                        style={{ border: "none" }}
                        data-onboard="report-species"
                        value={qSpecies || "Other"}
                        readOnly
                        aria-readonly
                        required={!isCruelty}
                      />
                      <span aria-hidden="true" style={speciesDividerStyle} />
                      <input
                        className="flex-1 min-w-0 px-3 py-2 bg-transparent outline-none"
                        style={{ border: "none" }}
                        value={qSpeciesOther}
                        onChange={(e) => setQSpeciesOther(e.target.value)}
                        placeholder="Please specify the pet"
                        required={requiresOtherSpecies}
                      />
                    </div>
                  ) : (
                    <input
                      list="species-options-hidden"
                      className="mt-1 w-full rounded-xl px-3 py-2"
                      style={speciesBorderStyle}
                      data-onboard="report-species"
                      value={qSpecies}
                      onChange={(e) => {
                        const next = e.target.value;
                        setQSpecies(next);
                        const key = next.trim().toLowerCase();
                        if (key !== "other" && key !== "others") {
                          setQSpeciesOther("");
                        }
                      }}
                      placeholder="Dog, Cat, Bird, etc."
                      required={!isCruelty}
                    />
                  )}
                  <datalist id="species-options-hidden">
                    {SPECIES_SUGGESTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
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

          <div className="flex flex-col items-stretch gap-3 pt-3 md:hidden">
            <button
              type="submit"
              className={
                isCruelty
                  ? "btn px-4 py-2 w-full text-white text-base"
                  : "btn btn-accent px-4 py-2 w-full text-base"
              }
              data-onboard="report-submit"
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
                : "Submit"}
            </button>
            <Link
              href="/report-form"
              className="btn px-4 py-2 w-full text-center text-base  border-1 border-[var(--primary-mintgreen)] text-[var(--primary-mintgreen)] bg-amber-50 hover:bg-[var(--primary-mintgreen)] hover:text-white transition-colors"
              style={{ border: "1px solid var(--border-color)" }}
              data-onboard="report-detailed"
              onClick={persistDraftToSession}
            >
              More Detailed Form
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
      {mediaViewerUrl && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[90] grid place-items-center p-4"
              role="dialog"
              aria-modal="true"
              onClick={() => setMediaViewerUrl(null)}
            >
              <div className="absolute inset-0 bg-black/88" />
              <button
                type="button"
                aria-label="Close fullscreen video"
                className="absolute right-4 top-4 z-[92] grid h-11 w-11 place-items-center rounded-full text-white"
                style={{ background: "rgba(255,255,255,0.14)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaViewerUrl(null);
                }}
              >
                <X size={20} />
              </button>
              <div className="relative z-[91] flex h-full w-full items-center justify-center">
                <video
                  src={mediaViewerUrl}
                  className="h-auto max-h-[92vh] w-auto max-w-[96vw] bg-black object-contain shadow-2xl"
                  controls
                  playsInline
                  autoPlay
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}

function LandmarkCarousel({
  items,
  onRemove,
  onClearAll,
  onAdd,
}: {
  items: { url: string; kind: "image" | "video" }[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
  onAdd?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const current = useMemo(
    () => (count ? items[Math.min(index, count - 1)] : null),
    [items, index, count]
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
      {current ? (
        current.kind === "video" ? (
          <video
            src={current.url}
            className="h-full w-full object-cover rounded-xl"
            controls
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={`landmark ${index + 1} of ${count}`}
            className="h-full w-full object-cover rounded-xl"
          />
        )
      ) : null}
      {/* arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 pill px-3 py-2 text-sm shadow-soft"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 pill px-3 py-2 text-sm shadow-soft"
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
          className="absolute bottom-2 right-2 pill px-3 py-2 text-xs"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-color)",
          }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAdd();
        }}
        aria-label="Add more media"
      >
          +
        </button>
      )}
      {/* remove pill (current) */}
      <button
        type="button"
        className="absolute top-2 right-2 pill px-3 py-2 text-xs"
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
        className="absolute top-2 left-2 pill px-3 py-2 text-xs"
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

function MainMediaCarousel({
  items,
  onRemove,
  onAdd,
  onFullscreen,
}: {
  items: { url: string; kind: "image" | "video" }[];
  onRemove: (index: number) => void;
  onAdd?: () => void;
  onFullscreen: (url: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const current = useMemo(
    () => (count ? items[Math.min(index, count - 1)] : null),
    [items, index, count]
  );
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (index > count - 1) setIndex(Math.max(0, count - 1));
  }, [count, index]);

  useEffect(() => {
    if (count > prevCountRef.current) {
      setIndex(Math.max(0, count - 1));
    }
    prevCountRef.current = count;
  }, [count]);

  if (!current) return null;

  return (
    <div className="relative h-full w-full">
      {current.kind === "video" ? (
        <>
          <video
            src={current.url}
            className="h-full w-full object-cover rounded-xl"
            controls
            playsInline
          />
          <button
            type="button"
            aria-label="Open video fullscreen"
            className="absolute left-2 top-2 grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.92)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFullscreen(current.url);
            }}
          >
            <Maximize2 size={16} />
          </button>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.url}
          alt={`selected media ${Math.min(index + 1, count)} of ${count}`}
          className="h-full w-full object-cover rounded-xl"
        />
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous media"
            className="absolute left-2 top-1/2 -translate-y-1/2 pill px-3 py-2 text-sm shadow-soft"
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
            aria-label="Next media"
            className="absolute right-2 top-1/2 -translate-y-1/2 pill px-3 py-2 text-sm shadow-soft"
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

      <div
        className="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
      >
        {Math.min(index + 1, count)}/{count}
      </div>

      {count < 5 && onAdd && (
        <button
          type="button"
          aria-label="Add more media"
          className="absolute bottom-2 right-2 pill px-3 py-2 text-xs"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-color)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd();
          }}
        >
          +
        </button>
      )}

      <button
        type="button"
        aria-label="Remove current media"
        className="absolute top-2 right-2 pill px-3 py-2 text-xs"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border-color)",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(Math.min(index, count - 1));
          setIndex((i) => Math.max(0, Math.min(i, count - 2)));
        }}
      >
        Remove
      </button>
    </div>
  );
}
