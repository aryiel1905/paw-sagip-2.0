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
import { VideoTrimModal } from "@/components/VideoTrimModal";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { AlertType, ReportStatus } from "@/types/app";
import { showToast } from "@/lib/toast";
import { getMediaKindFromFile, getVideoDuration, isVideoFile } from "@/lib/media";

// Storage bucket to keep report photos consistent with the home page
const PET_MEDIA_BUCKET = "pet-media";
const SPECIES_SUGGESTIONS = [
  "Dog",
  "Cat",
  "Bird",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Fish",
  "Turtle",
  "Snake",
  "Lizard",
  "Other",
] as const;

type TrimInfo = { start: number; end: number; duration: number };
type LandmarkMediaItem = {
  file: File;
  url: string;
  kind: "image" | "video";
  trim?: TrimInfo;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 20;

function normalizeSpecies(value: string) {
  return value.trim().toLowerCase();
}

function ReportFormPageInner() {
  const [reportType, setReportType] =
    useState<Exclude<AlertType, "all">>("found");
  const [reportCondition, setReportCondition] = useState("Healthy");
  const [reportLocation, setReportLocation] = useState("");
  const [reportLat, setReportLat] = useState<number | null>(null);
  const [reportLng, setReportLng] = useState<number | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [species, setSpecies] = useState("");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Unknown");
  const [ageSize, setAgeSize] = useState("Puppy");
  const [petStatus, setPetStatus] = useState("Roaming");
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
  const [reportPhotoKind, setReportPhotoKind] = useState<
    "image" | "video" | null
  >(null);
  const [reportPhotoTrim, setReportPhotoTrim] = useState<TrimInfo | null>(null);
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);
  const [prevPhotoName, setPrevPhotoName] = useState<string>("");
  // Landmark photos (multiple)
  const [landmarkMedia, setLandmarkMedia] = useState<LandmarkMediaItem[]>([]);
  const landmarkInputRef = useRef<HTMLInputElement | null>(null);
  const landmarkInputMobileRef = useRef<HTMLInputElement | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [trimQueue, setTrimQueue] = useState<
    { file: File; duration: number; target: "main" | "landmark" }[]
  >([]);
  const [activeTrim, setActiveTrim] = useState<{
    file: File;
    duration: number;
    target: "main" | "landmark";
  } | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimPreviewUrl, setTrimPreviewUrl] = useState<string | null>(null);
  const trimPreviewUrlRef = useRef<string | null>(null);
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
  const speciesKey = normalizeSpecies(species);
  const isDog = speciesKey === "dog";
  const isCat = speciesKey === "cat";
  const ageOptions = isDog
    ? ["Puppy", "Adult", "Senior"]
    : isCat
    ? ["Kitten", "Adult", "Senior"]
    : ["Puppy", "Kitten", "Adult", "Senior"];

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

  const clearMainMedia = useCallback(() => {
    setReportPhoto(null);
    setReportPhotoName("");
    setReportPhotoKind(null);
    setReportPhotoTrim(null);
    setReportPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const setMainMedia = useCallback((file: File, kind: "image" | "video", trim?: TrimInfo) => {
    setReportPhoto(file);
    setReportPhotoName(file.name);
    setReportPhotoKind(kind);
    setReportPhotoTrim(trim ?? null);
    setReportPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const addLandmarkMedia = useCallback((file: File, trim?: TrimInfo) => {
    const url = URL.createObjectURL(file);
    setLandmarkMedia((prev) => [
      ...prev,
      { file, url, kind: getMediaKindFromFile(file), trim },
    ]);
  }, []);

  useEffect(() => {
    if (activeTrim || trimQueue.length === 0) return;
    const [next, ...rest] = trimQueue;
    setTrimQueue(rest);
    setActiveTrim(next);
    setTrimStart(0);
    setTrimEnd(Math.min(next.duration, MAX_VIDEO_SECONDS));
  }, [activeTrim, trimQueue]);

  useEffect(() => {
    if (!activeTrim) {
      if (trimPreviewUrlRef.current) {
        try {
          URL.revokeObjectURL(trimPreviewUrlRef.current);
        } catch {}
        trimPreviewUrlRef.current = null;
      }
      setTrimPreviewUrl((prev) => (prev ? null : prev));
      return;
    }
    const url = URL.createObjectURL(activeTrim.file);
    if (trimPreviewUrlRef.current) {
      try {
        URL.revokeObjectURL(trimPreviewUrlRef.current);
      } catch {}
    }
    trimPreviewUrlRef.current = url;
    setTrimPreviewUrl(url);
    return () => {
      if (trimPreviewUrlRef.current === url) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
        trimPreviewUrlRef.current = null;
      }
    };
  }, [activeTrim]);

  const clampTrim = useCallback(
    (start: number, end: number, duration: number) => {
      const safeDuration = Math.max(0, duration || 0);
      const s = Math.max(0, Math.min(start, safeDuration));
      let e = Math.max(0, Math.min(end, safeDuration));
      if (e - s > MAX_VIDEO_SECONDS) {
        e = Math.min(s + MAX_VIDEO_SECONDS, safeDuration);
      }
      if (e < s) e = s;
      return { s, e };
    },
    []
  );

  const onTrimStartChange = useCallback(
    (value: number) => {
      if (!activeTrim) return;
      const next = clampTrim(value, trimEnd, activeTrim.duration);
      setTrimStart(next.s);
      setTrimEnd(next.e);
    },
    [activeTrim, clampTrim, trimEnd]
  );

  const onTrimEndChange = useCallback(
    (value: number) => {
      if (!activeTrim) return;
      const next = clampTrim(trimStart, value, activeTrim.duration);
      setTrimStart(next.s);
      setTrimEnd(next.e);
    },
    [activeTrim, clampTrim, trimStart]
  );

  const confirmTrim = useCallback(() => {
    if (!activeTrim) return;
    const info: TrimInfo = {
      start: trimStart,
      end: trimEnd,
      duration: activeTrim.duration,
    };
    if (activeTrim.target === "main") {
      setMainMedia(activeTrim.file, "video", info);
    } else {
      addLandmarkMedia(activeTrim.file, info);
    }
    setActiveTrim(null);
  }, [activeTrim, addLandmarkMedia, setMainMedia, trimEnd, trimStart]);

  const cancelTrim = useCallback(() => {
    if (!activeTrim) return;
    if (activeTrim.target === "main") {
      try {
        if (reportPhotoInputRef.current) reportPhotoInputRef.current.value = "";
      } catch {}
      clearMainMedia();
    }
    setActiveTrim(null);
  }, [activeTrim, clearMainMedia]);

  const isAllowedVideo = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    const allowedExt =
      name.endsWith(".mp4") || name.endsWith(".mov") || name.endsWith(".webm");
    const allowedType =
      file.type === "video/mp4" ||
      file.type === "video/quicktime" ||
      file.type === "video/webm";
    return allowedExt || allowedType;
  }, []);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      clearMainMedia();
      return;
    }
    clearMainMedia();
    const isVideo = isVideoFile(file);
    if (isVideo) {
      if (!isAllowedVideo(file)) {
        showToast("error", "Only MP4, MOV, or WEBM videos are allowed.");
        clearMainMedia();
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        showToast("error", "Each video must be under 100 MB.");
        clearMainMedia();
        return;
      }
      try {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_SECONDS) {
          setTrimQueue((prev) => [
            ...prev,
            { file, duration, target: "main" },
          ]);
          return;
        }
        setMainMedia(file, "video", { start: 0, end: duration, duration });
        return;
      } catch {
        showToast("error", "Unable to read video duration.");
        clearMainMedia();
        return;
      }
    }

    if (file.size > MAX_IMAGE_BYTES) {
      showToast("error", "Each photo must be under 5 MB.");
      clearMainMedia();
      return;
    }
    setMainMedia(file, "image");
  };

  // Landmark media handlers (match quick report)
  const handleLandmarkPhotosChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const existing = landmarkMedia.length;
    const available = Math.max(0, 5 - existing);
    const toAdd = files.slice(0, available);

    for (const file of toAdd) {
      const isVideo = isVideoFile(file);
      if (isVideo) {
        if (!isAllowedVideo(file)) {
          showToast("error", "Only MP4, MOV, or WEBM videos are allowed.");
          continue;
        }
        if (file.size > MAX_VIDEO_BYTES) {
          showToast("error", "Each video must be under 100 MB.");
          continue;
        }
        try {
          const duration = await getVideoDuration(file);
          if (duration > MAX_VIDEO_SECONDS) {
            setTrimQueue((prev) => [
              ...prev,
              { file, duration, target: "landmark" },
            ]);
          } else {
            addLandmarkMedia(file, { start: 0, end: duration, duration });
          }
        } catch {
          showToast("error", "Unable to read video duration.");
        }
      } else {
        if (file.size > MAX_IMAGE_BYTES) {
          showToast("error", "Each photo must be under 5 MB.");
          continue;
        }
        addLandmarkMedia(file);
      }
    }

    try {
      (event.target as HTMLInputElement).value = "";
    } catch {}
    if (files.length > available) {
      showToast("error", "You can upload up to 5 landmark items.");
    }
  };

  const removeLandmarkAt = (index: number) => {
    if (index < 0 || index >= landmarkMedia.length) return;
    setLandmarkMedia((prev) => {
      const target = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (target?.url) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {}
      }
      return next;
    });
    if (landmarkMedia.length === 1) {
      if (landmarkInputRef.current) landmarkInputRef.current.value = "";
      if (landmarkInputMobileRef.current)
        landmarkInputMobileRef.current.value = "";
    }
  };

  const clearLandmarkPhotos = () => {
    try {
      landmarkMedia.forEach((item) => URL.revokeObjectURL(item.url));
    } catch {}
    setLandmarkMedia([]);
    if (landmarkInputRef.current) landmarkInputRef.current.value = "";
    if (landmarkInputMobileRef.current)
      landmarkInputMobileRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (reportPhotoPreviewUrl) URL.revokeObjectURL(reportPhotoPreviewUrl);
      try {
        landmarkMedia.forEach((item) => URL.revokeObjectURL(item.url));
      } catch {}
    };
  }, [reportPhotoPreviewUrl, landmarkMedia]);

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

  const uploadProcessedVideo = async (
    file: File,
    target: "reports" | "reports/landmarks",
    trim?: TrimInfo | null
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("target", target);
    if (trim) {
      form.append("trimStart", String(trim.start));
      form.append("trimEnd", String(trim.end));
    }
    const res = await fetch("/api/media/ingest", {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.path) {
      throw new Error(data?.error || "Video upload failed");
    }
    return data.path as string;
  };

  const handleSubmitReport = useCallback(async () => {
    const supabase = getSupabaseClient();
    setReportStatus("submitting");

    let uploadedPhotoPath: string | null = null;
    let uploadedLandmarkPaths: string[] = [];
    if (reportPhoto) {
      if (reportPhotoKind === "video") {
        try {
          uploadedPhotoPath = await uploadProcessedVideo(
            reportPhoto,
            "reports",
            reportPhotoTrim
          );
        } catch (err) {
          console.error("Failed to upload report video", err);
          setReportStatus("error");
          return;
        }
      } else {
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
    }

    // Upload landmark media (max 5)
    if (landmarkMedia.length > 0) {
      const paths: string[] = [];
      for (const item of landmarkMedia.slice(0, 5)) {
        if (item.kind === "video") {
          try {
            const path = await uploadProcessedVideo(
              item.file,
              "reports/landmarks",
              item.trim
            );
            paths.push(path);
          } catch (err) {
            console.error("Failed to upload landmark video", err);
            setReportStatus("error");
            return;
          }
        } else {
          const fileExt = item.file.name.split(".").pop()?.toLowerCase() ?? "";
          const uniqueFileName = `${crypto.randomUUID()}${
            fileExt ? `.${fileExt}` : ""
          }`;
          const filePath = `reports/landmarks/${uniqueFileName}`;
          const { data: up, error: err } = await supabase.storage
            .from(PET_MEDIA_BUCKET)
            .upload(filePath, item.file, { cacheControl: "3600", upsert: false });
          if (err) {
            console.error("Failed to upload landmark photo", err.message ?? err);
            setReportStatus("error");
            return;
          }
          paths.push(up?.path ?? filePath);
        }
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
      petStatus: petStatus || null,
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
      setReportPhotoKind(null);
      setReportPhotoTrim(null);
      if (reportPhotoInputRef.current) reportPhotoInputRef.current.value = "";
      if (reportPhotoPreviewUrl) {
        URL.revokeObjectURL(reportPhotoPreviewUrl);
        setReportPhotoPreviewUrl(null);
      }
      clearLandmarkPhotos();
      // Reset all form fields to defaults
      setPetName("");
      setSpecies("");
      setBreed("");
      setGender("Unknown");
      setAgeSize("Puppy");
      setFeatures("");
      setContact("");
      setAnonymous(false);
      setReporterName("");
      setWhen("");
      setReportType("found");
      setReportCondition("Healthy");
      setPetStatus("Roaming");
      setAggressiveFlag(false);
      setFriendly(false);
      setReportLat(null);
      setReportLng(null);
      setShowValidation(false);
      setPrevPhotoName("");
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
    reportPhotoKind,
    reportPhotoTrim,
    reportPhotoPreviewUrl,
    reportType,
    landmarkMedia,
    reportLat,
    reportLng,
    petName,
    species,
    breed,
    gender,
    ageSize,
    petStatus,
    features,
    reporterName,
    contact,
    anonymous,
    aggressiveFlag,
    friendly,
    when,
    clearLandmarkPhotos,
    uploadProcessedVideo,
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
    if (!species.trim()) missingFields.push("Species");
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
            className="inline-flex items-center py-2 pl-2 pr-3 gap-2 pill  text-white/90 border bg-[var(--primary-mintgreen)] hover:bg-white hover:text-[var(--primary-mintgreen)] hover:border-white transition-colors duration-200 ease-in-out"
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
                    accept="image/*,video/mp4,video/quicktime,video/webm"
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
                        : "Upload photo or video"}
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
                      {reportPhotoKind === "video" ? (
                        <video
                          src={reportPhotoPreviewUrl}
                          className="h-full w-full object-cover rounded-xl"
                          controls
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={reportPhotoPreviewUrl}
                          alt="Selected photo preview"
                          className="h-full w-full object-cover rounded-xl"
                        />
                      )}
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
                        clearMainMedia();
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
                      Upload landmark media (up to 5)
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
                      items={landmarkMedia.map((item) => ({
                        url: item.url,
                        kind: item.kind,
                      }))}
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
                    accept="image/*,video/mp4,video/quicktime,video/webm"
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
                        : "Upload photo or video of the pet"}
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
                      {reportPhotoKind === "video" ? (
                        <video
                          src={reportPhotoPreviewUrl!}
                          className="h-full w-full object-cover rounded-xl"
                          controls
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={reportPhotoPreviewUrl!}
                          alt="Selected photo preview"
                          className="h-full w-full object-cover rounded-xl"
                        />
                      )}
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
                        clearMainMedia();
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
                      Upload landmark media (up to 5)
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
                      items={landmarkMedia.map((item) => ({
                        url: item.url,
                        kind: item.kind,
                      }))}
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
                  <input
                    list="species-options-report-form"
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={species}
                    onChange={(e) => {
                      const next = e.target.value;
                      const nextKey = normalizeSpecies(next);
                      setSpecies(next);
                      setAgeSize((prev) => {
                        if (nextKey === "dog") {
                          if (prev === "Kitten" || prev === "Puppy/Kitten")
                            return "Puppy";
                          return prev || "Puppy";
                        }
                        if (nextKey === "cat") {
                          if (prev === "Puppy" || prev === "Puppy/Kitten")
                            return "Kitten";
                          return prev || "Kitten";
                        }
                        return prev;
                      });
                    }}
                    placeholder="Dog, Cat, Bird, etc."
                    required={!isCruelty}
                  />
                  <datalist id="species-options-report-form">
                    {SPECIES_SUGGESTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </label>
                <label className="block text-sm">
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
                  Pet Status
                  <select
                    className="mt-1 w-full rounded-xl px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    value={petStatus}
                    onChange={(e) => setPetStatus(e.target.value)}
                  >
                    <option value="Roaming">Roaming</option>
                    <option value="In Custody">In Custody</option>
                  </select>
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
                    {ageOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
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
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor:
                          showValidation && !reportLocation.trim()
                            ? "var(--primary-red)"
                            : "var(--border-color)",
                      }}
                      aria-invalid={showValidation && !reportLocation.trim()}
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
                      style={{
                        backgroundColor:
                          showValidation && !reportLocation.trim()
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
                  {showValidation && !reportLocation.trim() && (
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
                          showValidation && !isCruelty && !when.trim()
                            ? "var(--primary-red)"
                            : "var(--border-color)",
                      }}
                      aria-invalid={
                        showValidation && !isCruelty && !when.trim()
                      }
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
                  {showValidation && !isCruelty && !when.trim() && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--primary-red)" }}
                    >
                      When is required.
                    </p>
                  )}
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
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor:
                      showValidation && isCruelty && !reportDescription.trim()
                        ? "var(--primary-red)"
                        : "var(--border-color)",
                  }}
                  aria-invalid={
                    showValidation && isCruelty && !reportDescription.trim()
                  }
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
                {showValidation && isCruelty && !reportDescription.trim() && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--primary-red)" }}
                  >
                    Description is required.
                  </p>
                )}
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
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
      <VideoTrimModal
        open={!!activeTrim}
        fileName={activeTrim?.file?.name ?? null}
        fileUrl={trimPreviewUrl}
        duration={activeTrim?.duration ?? 0}
        start={trimStart}
        end={trimEnd}
        maxDuration={MAX_VIDEO_SECONDS}
        onChangeStart={onTrimStartChange}
        onChangeEnd={onTrimEndChange}
        onConfirm={confirmTrim}
        onCancel={cancelTrim}
      />
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
        aria-label="Add more media"
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
