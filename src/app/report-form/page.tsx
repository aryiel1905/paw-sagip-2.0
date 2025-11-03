"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  ChangeEvent,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  ArrowLeft,
  AlertTriangle,
  Smile,
  EyeOff,
  MapPinHouse,
  PawPrint,
  ChevronLeft,
} from "lucide-react";
import { createPortal } from "react-dom";
import MapPickerModal from "@/components/MapPickerModal";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AlertType, ReportStatus } from "@/types/app";
import { showToast } from "@/lib/toast";

// Storage bucket to keep report photos consistent with the home page
const PET_MEDIA_BUCKET = "pet-media";

function ReportFormPageInner() {
  const [reportType, setReportType] =
    useState<Exclude<AlertType, "all">>("found");
  const [reportCondition, setReportCondition] = useState("Healthy");
  const [reportLocation, setReportLocation] = useState("");
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [species, setSpecies] = useState("Dog");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Unknown");
  const [ageSize, setAgeSize] = useState("Puppy");
  const [features, setFeatures] = useState("");
  const [contact, setContact] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [when, setWhen] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const handleGoBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (fromParam === "account") {
      router.push("/account/dashboard");
    } else {
      router.push("/#report");
    }
  }, [router, fromParam]);

  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportPhotoName, setReportPhotoName] = useState("");
  const [reportPhotoPreviewUrl, setReportPhotoPreviewUrl] = useState<
    string | null
  >(null);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  const [prevPhotoName, setPrevPhotoName] = useState<string>("");
  // Landmark photos (multiple)
  const [landmarkPhotos, setLandmarkPhotos] = useState<File[]>([]);
  const [landmarkPreviewUrls, setLandmarkPreviewUrls] = useState<string[]>([]);
  const landmarkInputRef = useRef<HTMLInputElement | null>(null);
  const landmarkInputMobileRef = useRef<HTMLInputElement | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [friendly, setFriendly] = useState(false);
  const [aggressiveFlag, setAggressiveFlag] = useState(false);
  // Auth-derived identity for autofill
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  // Tip popover state for the three checkboxes (aggressive/friendly/anonymous)
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
  const tipAnchorRef = useRef<HTMLElement | null>(null);
  // Full-screen safety modal state (parity with iREPORT)
  const [flagKey, setFlagKey] = useState<"aggressive" | "friendly" | null>(
    null
  );
  const openFlagModal = (k: "aggressive" | "friendly") => setFlagKey(k);
  const closeFlagModal = () => setFlagKey(null);

  const isCruelty = reportType === "cruelty";

  const getTipContent = (key: "aggressive" | "friendly" | "anonymous") => {
    switch (key) {
      case "aggressive":
        return (
          <div className="grid grid-cols-3 items-center gap-3 w-full">
            <div className="col-span-1 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            </div>
          </div>
        );
      case "friendly":
        return (
          <div className="grid grid-cols-3 items-center gap-3 w-full">
            <div className="col-span-1 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            </div>
          </div>
        );
      case "anonymous":
        return (
          <div className="flex items-start gap-2">
            <EyeOff className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Submit Anonymously</p>
              <p className="mt-1 text-sm">
                Your name is hidden. If safe, include a phone/email so
                responders can coordinate follow-ups.
              </p>
            </div>
          </div>
        );
    }
  };

  const positionPopover = (anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const tipWidth = Math.min(window.innerWidth * 0.92, 360);
    const estimatedHeight = 140;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > estimatedHeight + margin;
    const top = placeBelow
      ? rect.bottom + margin
      : rect.top - estimatedHeight - margin;
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - tipWidth - 8)
    );
    const anchorCenter = rect.left + rect.width / 2;
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
    tipAnchorRef.current = anchor;
    setTipKey(key);
    setTipOpen(true);
    positionPopover(anchor);
  };

  const hideTip = () => {
    setTipOpen(false);
    setTipKey(null);
    tipAnchorRef.current = null;
  };

  useEffect(() => {
    const handler = () => {
      if (tipOpen && tipAnchorRef.current)
        positionPopover(tipAnchorRef.current);
    };
    window.addEventListener("scroll", handler);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [tipOpen]);

  // Lock scroll and enable ESC close when safety modal is open
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
      if (typeof window !== "undefined") window.scrollTo(0, y);
      window.removeEventListener("keydown", onKey);
    };
  }, [flagKey]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReportPhoto(file);
    setReportPhotoName(file ? file.name : "");
    setReportPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  // Landmark photos handlers (match quick report)
  const handleLandmarkPhotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const existing = landmarkPhotos.length;
    const available = Math.max(0, 5 - existing);
    const toAdd = files.slice(0, available);
    const overSize = toAdd.some((f) => f.size > 5 * 1024 * 1024);
    if (overSize) {
      showToast("error", "Each photo must be under 5 MB.");
      return;
    }
    setLandmarkPhotos((prev) => [...prev, ...toAdd]);
    setLandmarkPreviewUrls((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    try {
      (event.target as HTMLInputElement).value = "";
    } catch {}
    if (files.length > available) {
      showToast("error", "You can upload up to 5 landmark photos.");
    }
  };

  const removeLandmarkAt = (index: number) => {
    if (index < 0 || index >= landmarkPhotos.length) return;
    const nextFiles = landmarkPhotos.filter((_, i) => i !== index);
    const nextUrls = landmarkPreviewUrls.filter((u, i) => {
      if (i === index) {
        try {
          URL.revokeObjectURL(u);
        } catch {}
        return false;
      }
      return true;
    });
    setLandmarkPhotos(nextFiles);
    setLandmarkPreviewUrls(nextUrls);
    if (nextFiles.length === 0) {
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
    }
  };

  const clearLandmarkPhotos = () => {
    try {
      landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    } catch {}
    setLandmarkPhotos([]);
    setLandmarkPreviewUrls([]);
    if (landmarkInputRef.current) landmarkInputRef.current.value = "";
    if (landmarkInputMobileRef.current)
      landmarkInputMobileRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (reportPhotoPreviewUrl) URL.revokeObjectURL(reportPhotoPreviewUrl);
      try {
        landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      } catch {}
    };
  }, [reportPhotoPreviewUrl, landmarkPreviewUrls]);

  // Keep the helper checkboxes in sync with the selected condition
  useEffect(() => {
    setAggressiveFlag(reportCondition === "Aggressive");
    setFriendly(reportCondition === "Healthy");
  }, [reportCondition]);

  // Prefill from quick report draft stored in sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("reportDraft");
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        type: Exclude<AlertType, "all">;
        species: string;
        location: string;
        when: string; // datetime-local
        feature: string;
        contact: string;
        aggressive: boolean;
        anonymous: boolean;
        condition: string;
        photoName: string;
      }>;
      if (draft.type) setReportType(draft.type);
      if (draft.species) setSpecies(draft.species);
      if (draft.location) setReportLocation(draft.location);
      if (draft.feature) setFeatures(draft.feature);
      if (draft.contact) setContact(draft.contact);
      if (typeof draft.anonymous === "boolean") setAnonymous(draft.anonymous);
      if (typeof draft.aggressive === "boolean" && draft.aggressive) {
        setReportCondition("Aggressive");
      } else if (draft.condition) {
        setReportCondition(draft.condition);
      }
      if (draft.when) {
        setWhen(draft.when);
      }
      if (draft.photoName) setPrevPhotoName(draft.photoName);
    } catch {
      // ignore
    }
  }, []);

  // When toggling anonymous, clear name and contact for privacy
  useEffect(() => {
    if (anonymous) {
      setReporterName("");
      setContact("");
    }
  }, [anonymous]);

  // Load current auth user (email + display name) for autofill
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

  // Autofill name and contact when not anonymous and fields are empty
  useEffect(() => {
    if (!anonymous) {
      if (!reporterName && userName) setReporterName(userName);
      if (!contact && userEmail) setContact(userEmail);
    }
  }, [anonymous, reporterName, contact, userName, userEmail]);

  const handleSubmitReport = useCallback(async () => {
    const supabase = getSupabaseClient();
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;
    let uploadedLandmarkPaths: string[] = [];
    if (reportPhoto) {
      const fileExt = reportPhoto.name.split(".").pop()?.toLowerCase() ?? "";
      const uniqueFileName = `${crypto.randomUUID()}${
        fileExt ? `.${fileExt}` : ""
      }`;
      const filePath = `reports/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .upload(filePath, reportPhoto, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error(
          "Failed to upload report photo",
          uploadError.message ?? uploadError
        );
        setReportStatus("error");
        return;
      }
      uploadedPhotoPath = uploadData?.path ?? filePath;
    }

    // Upload landmark photos (max 5)
    if (landmarkPhotos.length > 0) {
      const paths: string[] = [];
      for (const file of landmarkPhotos.slice(0, 5)) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
        const uniqueFileName = `${crypto.randomUUID()}${
          fileExt ? `.${fileExt}` : ""
        }`;
        const filePath = `reports/landmarks/${uniqueFileName}`;
        const { data: up, error: err } = await supabase.storage
          .from(PET_MEDIA_BUCKET)
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        if (err) {
          console.error("Failed to upload landmark photo", err.message ?? err);
          setReportStatus("error");
          return;
        }
        paths.push(up?.path ?? filePath);
      }
      uploadedLandmarkPaths = paths;
    }

    const eventAtIso = when ? new Date(when).toISOString() : null;

    const payload = {
      type: reportType,
      description: reportDescription,
      condition: reportCondition,
      location: reportLocation,
      lat: reportLat,
      lng: reportLng,
      photoPath: uploadedPhotoPath,
      landmarkMediaPaths: uploadedLandmarkPaths,

      // extended fields from the full form
      petName: petName?.trim() ? petName.trim() : null,
      species: species || null,
      breed: breed?.trim() ? breed.trim() : null,
      gender: gender || null,
      ageSize: ageSize || null,
      features: features?.trim() ? features.trim() : null,
      eventAt: eventAtIso,
      reporterName: reporterName?.trim() ? reporterName.trim() : null,
      reporterContact: contact?.trim() ? contact.trim() : null,
      isAggressive: aggressiveFlag,
      isFriendly: friendly,
      isAnonymous: anonymous,
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setReportStatus("error");
        showToast("error", "Something went wrong. Please try again.");
        return;
      }
      let resp: any = null;
      try {
        resp = await response.json();
      } catch {}
      setReportStatus("success");
      if (resp?.customId) {
        showToast("success", `Report submitted! ID: ${resp.customId}`);
      } else {
        showToast("success", "Report submitted! Rescue team notified.");
      }
      setReportDescription("");
      setReportLocation("");
      setReportPhoto(null);
      setReportPhotoName("");
      if (reportPhotoInputRef.current) reportPhotoInputRef.current.value = "";
      if (reportPhotoPreviewUrl) {
        URL.revokeObjectURL(reportPhotoPreviewUrl);
        setReportPhotoPreviewUrl(null);
      }
      // Clear landmark previews
      if (landmarkPreviewUrls.length) {
        try {
          landmarkPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        } catch {}
      }
      setLandmarkPhotos([]);
      setLandmarkPreviewUrls([]);
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
      setTimeout(() => setReportStatus("idle"), 5000);
    } catch {
      setReportStatus("error");
    }
  }, [
    reportCondition,
    reportDescription,
    reportLocation,
    reportPhoto,
    reportPhotoPreviewUrl,
    reportType,
    landmarkPhotos,
    landmarkPreviewUrls,
    reportLat,
    reportLng,
    petName,
    species,
    breed,
    gender,
    ageSize,
    features,
    reporterName,
    contact,
    anonymous,
    aggressiveFlag,
    friendly,
    when,
  ]);

  const isFormValid = isCruelty
    ? Boolean(reportLocation.trim() && reportDescription.trim())
    : Boolean(reportType && species && reportLocation.trim() && when.trim());

  const missingFields: string[] = [];
  if (!reportLocation.trim()) missingFields.push("Location");
  if (isCruelty) {
    if (!reportDescription.trim()) missingFields.push("Description");
  } else {
    if (!when.trim()) missingFields.push("When");
    if (!species) missingFields.push("Species");
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setShowValidation(true);
      return;
    }
    handleSubmitReport();
  };

  return (
    <main className=" bg-black/80 overflow-auto">
      <div className="mx-auto mt-5  mb-12 max-w-screen-lg px-4 sm:px-6 lg:px-8">
        <div className="mb-1  py-5">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center py-2 pl-2 pr-3 gap-2 pill  text-white/90 border bg-[var(--primary-mintgreen)] hover:bg-[#7e7e7e] hover:text-black hover:border-white transition-colors duration-200 ease-in-out"
            style={{ color: "" }}
          >
            <ChevronLeft className="h-4 w-4 " />
            Back to Home
          </button>
        </div>
        <div className="surface rounded-2xl shadow-soft">
          <div
            className="border-b p-5"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold ">
                  Report Form - Lost / Found Pet
                </h1>
                <p className="text-sm ink-muted">
                  Provide full details to notify volunteers and barangay
                  partners.
                </p>
              </div>
            </div>
          </div>
          <form className="p-6" onSubmit={onSubmit}>
            {/* Mobile upload tiles (match iREPORT style) */}
            <div className="grid grid-cols-1 gap-3 md:hidden mb-4">
              {/* Main photo (mobile) */}
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
                        if (reportPhotoInputRef.current)
                          reportPhotoInputRef.current.value = "";
                        setReportPhoto(null);
                        if (reportPhotoPreviewUrl) {
                          try {
                            URL.revokeObjectURL(reportPhotoPreviewUrl);
                          } catch {}
                        }
                        setReportPhotoPreviewUrl(null);
                        setReportPhotoName("");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </label>

              {/* Landmark Photos (mobile) */}
              <label
                className="mt-2 relative group flex flex-col aspect-[4/3] w-full max-w-[360px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
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
                    <LandmarkCarousel
                      urls={landmarkPreviewUrls}
                      onRemove={(idx) => removeLandmarkAt(idx)}
                      onClearAll={() => clearLandmarkPhotos()}
                      onAdd={() => landmarkInputMobileRef.current?.click()}
                    />
                  </div>
                )}
              </label>
            </div>

            {/* Desktop upload tiles (updated to match iREPORT style) */}
            <div className="hidden md:flex justify-center gap-6 mb-4">
              <label
                className="mt-2 relative group flex aspect-[4/3] w-full max-w-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
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
                    {!reportPhotoName && prevPhotoName && (
                      <span className="mt-1 block text-xs ink-subtle">
                        Previously selected in quick report: {prevPhotoName}
                      </span>
                    )}
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
                        if (reportPhotoInputRef.current)
                          reportPhotoInputRef.current.value = "";
                        setReportPhoto(null);
                        if (reportPhotoPreviewUrl) {
                          try {
                            URL.revokeObjectURL(reportPhotoPreviewUrl);
                          } catch {}
                        }
                        setReportPhotoPreviewUrl(null);
                        setReportPhotoName("");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </label>

              <label
                className="mt-2 relative group flex flex-col aspect-[4/3] w-full max-w-[360px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl p-3 text-center"
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
            </div>

            {/* Identity */}
            <div>
              <h3 className="font-semibold ink-heading">Pet Identity</h3>
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
                <label className="block text-sm">
                  Pet Name (optional)
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="e.g., Buddy"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Pet Type
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={species}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSpecies(next);
                      setAgeSize((prev) => {
                        if (next === "Dog") {
                          if (prev === "Kitten" || prev === "Puppy/Kitten")
                            return "Puppy";
                          return prev || "Puppy";
                        }
                        if (next === "Cat") {
                          if (prev === "Puppy" || prev === "Puppy/Kitten")
                            return "Kitten";
                          return prev || "Kitten";
                        }
                        return prev;
                      });
                    }}
                    required={!isCruelty}
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                  </select>
                </label>
                <label className="block text-sm lg:col-span-2">
                  Breed / Mix
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="e.g., Aspin / Mix"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Gender
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option>Unknown</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Age / Size
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={ageSize}
                    onChange={(e) => setAgeSize(e.target.value)}
                  >
                    {species === "Dog" ? (
                      <>
                        <option>Puppy</option>
                        <option>Adult</option>
                        <option>Senior</option>
                      </>
                    ) : (
                      <>
                        <option>Kitten</option>
                        <option>Adult</option>
                        <option>Senior</option>
                      </>
                    )}
                  </select>
                </label>
              </div>
            </div>

            {/* Status & Safety */}
            <div>
              <h3 className="font-semibold ink-heading">Status & Safety</h3>
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
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
                  Condition
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reportCondition}
                    onChange={(e) => setReportCondition(e.target.value)}
                  >
                    <option>Healthy</option>
                    <option>Injured</option>
                    <option>Aggressive</option>
                    <option>Malnourished</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="block text-sm lg:col-span-2">
                  Distinctive Features
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="Collar color, scars, markings, tag/microchip"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                  />
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-4 lg:col-span-2">
                  <label
                    className="inline-flex items-center gap-2 text-sm"
                    style={
                      aggressiveFlag
                        ? { color: "var(--primary-orange)" }
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={aggressiveFlag}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAggressiveFlag(checked);
                        if (checked) {
                          setFriendly(false);
                          setReportCondition("Aggressive");
                        } else if (reportCondition === "Aggressive") {
                          // Default back to Healthy when turning off aggressive
                          setReportCondition("Healthy");
                        }
                        if (checked) {
                          openFlagModal("aggressive");
                        }
                      }}
                      style={
                        aggressiveFlag
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
                      friendly
                        ? { color: "var(--primary-mintgreen)" }
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={friendly}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFriendly(checked);
                        if (checked) {
                          setAggressiveFlag(false);
                          setReportCondition("Healthy");
                        } else if (reportCondition === "Healthy") {
                          // Keep at Healthy by default when turning off
                          setReportCondition("Healthy");
                        }
                        if (checked) {
                          openFlagModal("friendly");
                        }
                      }}
                      style={
                        friendly
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
                      checked={anonymous}
                      onChange={(e) => {
                        setAnonymous(e.target.checked);
                        if (e.target.checked) showTipFor(e.target, "anonymous");
                        else hideTip();
                      }}
                    />
                    <span>Submit anonymously</span>
                  </label>
                </div>
                {isCruelty && (
                  <div
                    className="lg:col-span-2 rounded-xl p-4"
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

            {/* Location & Time */}
            <div
              className="mt-6 rounded-2xl p-4"
              style={{ background: "var(--card-bg)" }}
            >
              <h3 className="font-semibold ink-heading">Location & Time</h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      required={!isCruelty}
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
                        setWhen(iso);
                      }}
                      className="rounded-xl px-3 py-2 text-white"
                      style={{ backgroundColor: "var(--primary-mintgreen)" }}
                    >
                      <Clock className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs ink-muted">
                    You can type a date/time or tap the clock to set now.
                  </p>
                </label>
                {/* Hidden precise coordinates so we retain accuracy while showing address */}
                <input
                  type="hidden"
                  name="lat"
                  value={reportLat ?? ""}
                  readOnly
                />
                <input
                  type="hidden"
                  name="lng"
                  value={reportLng ?? ""}
                  readOnly
                />
              </div>
            </div>

            {/* Notes & Contact */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2 items-stretch">
              <label className="block text-sm h-full">
                {isCruelty ? "Description" : "Reporter Notes"}
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-xl px-3 py-2 min-h-36"
                  placeholder={
                    isCruelty
                      ? "What happened? When/where?"
                      : "Behavior, situation, directions..."
                  }
                  style={{ border: "1px solid var(--border-color)" }}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </label>
              <div className="space-y-3">
                <label className="block text-sm">
                  Your Name (optional)
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    disabled={anonymous}
                  />
                </label>
                <label className="block text-sm">
                  Phone / Email (optional)
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    placeholder="0900 000 0000 / you@example.com"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </label>
                {/* Anonymous toggle moved next to status checkboxes */}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3 ">
              <button
                type="submit"
                className={
                  isCruelty
                    ? "w-full btn px-6 py-3 text-white"
                    : "w-full btn btn-primary px-6 py-3"
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
                  : "Submit Report"}
              </button>
              {showValidation && !isFormValid && (
                <p
                  className="text-sm"
                  style={{ color: "var(--primary-orange)" }}
                  aria-live="polite"
                >
                  Please fill required fields:{" "}
                  {missingFields.join(" and ") || ""}.
                </p>
              )}
              {reportStatus === "success" && (
                <p
                  className="text-sm"
                  style={{ color: "var(--primary-green)" }}
                >
                  Report submitted! Rescue team notified.
                </p>
              )}
              {reportStatus === "error" && (
                <p
                  className="text-sm"
                  style={{ color: "var(--primary-orange)" }}
                >
                  Something went wrong. Please try again.
                </p>
              )}
            </div>
          </form>
        </div>
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
            setReportLocation(
              address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            );
            setReportLat(lat);
            setReportLng(lng);
            setShowMapPicker(false);
          }}
        />
        {/* Aggressive/Friendly info modal (DetailsModal-style parity) */}
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
                    <div className="mt-4 text-left">
                      <button
                        type="button"
                        className="pill px-3 py-1"
                        style={{ border: "1px solid var(--border-color)" }}
                        onClick={closeFlagModal}
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    </main>
  );
}

export default function ReportFormPage() {
  return (
    <Suspense fallback={<div />}> 
      <ReportFormPageInner />
    </Suspense>
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
            ◀
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
            ▶
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
