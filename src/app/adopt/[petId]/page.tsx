"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import StepQuestionnaire from "./StepQuestionnaire";
import StepPhotos from "./StepPhotos";
import StepApplicant from "./StepApplicant";
import { XCircleIcon } from "lucide-react";

const PET_MEDIA_BUCKET = "pet-media";

type PetSummary = {
  id: string;
  name: string;
  species: string;
  location?: string | null;
  imageUrl?: string | null;
  createdAt?: string | null;
};

function speciesEmoji(species?: string | null) {
  const s = (species || "").toLowerCase();
  if (s.includes("cat")) return "🐱";
  if (s.includes("dog")) return "🐶";
  return "🐾";
}

// payload is constructed inline during submission

export default function AdoptionApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const petId = useMemo(() => (params?.petId as string) || "", [params]);

  const [pet, setPet] = useState<PetSummary | null>(null);
  const [loadingPet, setLoadingPet] = useState(true);
  const [viewer, setViewer] = useState<{ url: string } | null>(null);
  const [flags, setFlags] = useState<{
    vaccinated: boolean | null;
    spayedNeutered: boolean | null;
    dewormed: boolean | null;
  }>({ vaccinated: null, spayedNeutered: null, dewormed: null });

  // Wizard state (0=preface, 1=form, 2=questionnaire, 3=photos)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [ackInfo, setAckInfo] = useState(false);
  const [showApplicantErrors, setShowApplicantErrors] = useState(false);
  const [showQuestionnaireErrors, setShowQuestionnaireErrors] = useState(false);

  // Form state (collected in Step 1)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [occupation, setOccupation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Applicant state (Step 1)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [company, setCompany] = useState("");
  const [socialProfile, setSocialProfile] = useState("");
  const [civilStatus, setCivilStatus] = useState<
    "single" | "married" | "others" | ""
  >("");
  const [pronouns, setPronouns] = useState<
    "she/her" | "he/him" | "they/them" | ""
  >("");
  const [adoptedBefore, setAdoptedBefore] = useState<boolean | null>(null);
  const [promptedBy, setPromptedBy] = useState<string[]>([]);
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [idDocumentPreviewUrl, setIdDocumentPreviewUrl] = useState<
    string | null
  >(null);

  // Questionnaire state (Step 2)
  const [adoptWhat, setAdoptWhat] = useState<"cat" | "dog" | "">("");
  const [homeTypeQ, setHomeTypeQ] = useState<
    "house" | "apartment" | "condo" | "other" | ""
  >("");
  const [rents, setRents] = useState<boolean | null>(null);
  const [movePlan, setMovePlan] = useState("");
  const [liveWith, setLiveWith] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<boolean | null>(null);
  const [familySupports, setFamilySupports] = useState<boolean | null>(null);
  const [dailyCareBy, setDailyCareBy] = useState("");
  const [financialResponsible, setFinancialResponsible] = useState("");
  const [vacationCaregiver, setVacationCaregiver] = useState("");
  const [hoursAlone, setHoursAlone] = useState("");
  const [introSteps, setIntroSteps] = useState("");
  const [hasPetsNow, setHasPetsNow] = useState<boolean | null>(null);
  const [hadPetsPast, setHadPetsPast] = useState<boolean | null>(null);

  // Photos state (Step 3)
  const [homePhotos, setHomePhotos] = useState<File[]>([]);
  const [homePreviewUrls, setHomePreviewUrls] = useState<string[]>([]);
  const homeInputRef = useRef<HTMLInputElement | null>(null);

  const onSelectHomeFiles = (files: FileList | null) => {
    const arr = Array.from(files ?? []);
    if (arr.length === 0) return;
    const toAdd = arr.slice(0, Math.max(0, 15 - homePhotos.length));
    const over = toAdd.some((f) => f.size > 8 * 1024 * 1024);
    if (over) {
      showToast("error", "Each photo must be under 8 MB.");
      return;
    }
    setHomePhotos((prev) => [...prev, ...toAdd]);
    setHomePreviewUrls((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
  };
  const removeHomeAt = (index: number) => {
    setHomePhotos((prev) => prev.filter((_, i) => i !== index));
    setHomePreviewUrls((prev) => {
      const url = prev[index];
      try {
        if (url) URL.revokeObjectURL(url);
      } catch {}
      return prev.filter((_, i) => i !== index);
    });
  };
  const clearHomePhotos = () => {
    try {
      homePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    } catch {}
    setHomePhotos([]);
    setHomePreviewUrls([]);
  };

  const uploadHomePhotos = async (): Promise<string[]> => {
    if (homePhotos.length === 0) return [];
    const supabase = getSupabaseClient();
    const folder = `adoption-applications/${crypto.randomUUID()}`;
    const paths: string[] = [];
    for (let i = 0; i < homePhotos.length; i++) {
      const file = homePhotos[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/home-${String(i + 1).padStart(2, "0")}.${ext}`;
      const { data, error } = await supabase.storage
        .from(PET_MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      paths.push(data?.path ?? path);
    }
    return paths;
  };

  const uploadIdDocument = async (): Promise<string | null> => {
    if (!idDocumentFile) return null;
    const supabase = getSupabaseClient();
    const ext = idDocumentFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `adoption-applications/${crypto.randomUUID()}-id.${ext}`;
    const { data, error } = await supabase.storage
      .from(PET_MEDIA_BUCKET)
      .upload(path, idDocumentFile, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return data?.path ?? path;
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!petId) return;
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("adoption_pets")
          .select("id, pet_name, species, location, photo_path, created_at")
          .eq("id", petId)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (mounted && data) {
          const imageUrl = data.photo_path
            ? supabase.storage
                .from(PET_MEDIA_BUCKET)
                .getPublicUrl(data.photo_path).data.publicUrl
            : null;
          setPet({
            id: data.id,
            name: data.pet_name ?? "",
            species: data.species ?? "",
            location: data.location ?? null,
            imageUrl,
            createdAt: (data as any).created_at ?? null,
          });

          // Fetch health flags by matching corresponding report via photo_path
          const photoPath = (data as any).photo_path as
            | string
            | null
            | undefined;
          if (photoPath) {
            try {
              const { data: rep } = await supabase
                .from("reports")
                .select(
                  "is_vaccinated,is_spayed_neutered,is_dewormed,photo_path"
                )
                .eq("photo_path", photoPath)
                .maybeSingle();
              if (rep && mounted) {
                setFlags({
                  vaccinated:
                    typeof (rep as any).is_vaccinated === "boolean"
                      ? ((rep as any).is_vaccinated as boolean)
                      : null,
                  spayedNeutered:
                    typeof (rep as any).is_spayed_neutered === "boolean"
                      ? ((rep as any).is_spayed_neutered as boolean)
                      : null,
                  dewormed:
                    typeof (rep as any).is_dewormed === "boolean"
                      ? ((rep as any).is_dewormed as boolean)
                      : null,
                });
              }
            } catch {}
          }
        }
      } catch (e) {
        console.error(e);
        showToast("error", "Failed to load pet details");
      } finally {
        if (mounted) setLoadingPet(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [petId]);

  // Preselect adoptWhat based on the selected pet's species (lock in Step 2)
  useEffect(() => {
    if (!pet || adoptWhat) return;
    const s = (pet.species || "").toLowerCase();
    if (s.includes("cat")) setAdoptWhat("cat");
    else if (s.includes("dog")) setAdoptWhat("dog");
  }, [pet, adoptWhat]);

  // Validation is performed per-step via inline handlers

  // inline per-step submit handlers are defined below

  function petEmojiFor(species?: string) {
    const value = (species || "").toLowerCase();
    if (value.includes("dog")) return "🐶";
    if (value.includes("cat")) return "🐱";
    return "🐾";
  }

  function petFallbackTheme(species?: string) {
    const value = (species || "").toLowerCase();
    if (value.includes("dog")) {
      return {
        background:
          "radial-gradient(circle at 50% 50%, #F8ECD9 0%, #EED9C2 45%, #DDBC9F 100%)",
        color: "#8C4F22",
      } as const;
    }
    if (value.includes("cat")) {
      return {
        background:
          "radial-gradient(circle at 50% 50%, #FFF3C4 0%, #FFE08A 45%, #FFB74A 100%)",
        color: "#8C6B00",
      } as const;
    }
    return {
      background:
        "radial-gradient(circle at 50% 50%, #F3F4F6 0%, #E5E7EB 100%)",
      color: "#4A55C2",
    } as const;
  }

  function formatDateTime(value?: string | null) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return value;
    }
  }

  const petProfile = useMemo(() => {
    return {
      name: pet?.name || "Pet",
      species: pet?.species || "",
      location: pet?.location || "",
      breed: "",
      sex: "",
      age: "",
      photo: pet?.imageUrl || null,
    };
  }, [pet]);

  // Map pet createdAt into the display structure the UI expects
  const effectiveData = useMemo(
    () => ({
      created_at: pet?.createdAt ?? null,
      status: null as string | null,
    }),
    [pet?.createdAt]
  );

  // Fullscreen viewer life-cycle
  useEffect(() => {
    if (!viewer) return;
    const body = document.body as HTMLBodyElement;
    const prevOverflow = body.style.overflow;
    body.classList.add("modal-open");
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      body.classList.remove("modal-open");
      body.style.overflow = prevOverflow;
    };
  }, [viewer]);

  function boolDisplay(v: boolean | null): string {
    if (v === true) return "Yes";
    if (v === false) return "No";
    return "Unknown";
  }

  return (
    <>
      <section className="mx-auto my-8 max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="surface rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight ink-heading">
                Adoption Application
              </h1>
              <p className="ink-muted text-sm">
                We&apos;ll contact you after review.
              </p>
            </div>
            <Link
              href="/#adoption"
              className="pill px-3 py-1 text-sm"
              style={{ border: "1px solid var(--border-color)" }}
            >
              ← Back
            </Link>
          </div>

          {/* Preface gate (Step 0) */}
          {step === 0 && (
            <div className="mt-4 flex flex-col gap-4">
              <div
                className="grid rounded-2xl p-4"
                style={{ background: "var(--card-bg)" }}
              >
                {loadingPet ? (
                  <p className="ink-subtle text-sm">Loading pet details…</p>
                ) : pet ? (
                  <div
                    className="rounded-2xl border px-5 py-4"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--card-bg)",
                    }}
                  >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_minmax(0,1fr)] md:items-start">
                      <div className="relative overflow-hidden rounded-[18px] bg-[var(--soft-bg)] min-h-[150px] md:min-h-[200px]">
                        {petProfile.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={petProfile.photo}
                            alt={petProfile.name}
                            className="absolute inset-0 h-full w-full object-cover cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (petProfile.photo)
                                setViewer({ url: petProfile.photo });
                            }}
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-6xl font-semibold"
                            style={petFallbackTheme(petProfile.species)}
                          >
                            <span aria-hidden="true">
                              {petEmojiFor(petProfile.species)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="text-xl font-semibold ink-heading md:text-2xl">
                            {petProfile.name}
                          </div>
                          <div className="text-lg ink-subtle md:text-xl">
                            {petProfile.location || "--"}
                          </div>
                        </div>

                        <div
                          className="h-px w-full"
                          style={{ background: "var(--border-color)" }}
                        />
                        <div className="grid gap-3 text-lg sm:grid-cols-2 md:text-xl">
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Pet type
                            </p>
                            <p className="ink-heading">
                              {petProfile.species || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Breed
                            </p>
                            <p className="ink-heading">
                              {petProfile.breed || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Sex
                            </p>
                            <p className="ink-heading">
                              {petProfile.sex || "--"}
                            </p>
                          </div>
                          <div>
                            <p className="ink-subtle text-xs uppercase tracking-wide md:text-sm">
                              Age / Size
                            </p>
                            <p className="ink-heading">
                              {petProfile.age || "--"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="ink-subtle text-sm">Pet not found.</p>
                )}
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ border: "1px solid var(--border-color)" }}
              >
                <div className="font-semibold ink-heading">
                  Important information
                </div>
                <ul className="mt-2 text-sm">
                  <li>• Vaccinated: {boolDisplay(flags.vaccinated)}</li>
                  <li>
                    • Spayed/Neutered: {boolDisplay(flags.spayedNeutered)}
                  </li>
                  <li>• Dewormed: {boolDisplay(flags.dewormed)}</li>
                </ul>
                <p
                  className="mt-3 rounded-xl p-3 text-sm"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  By continuing, you confirm you&apos;ve read the pet&apos;s
                  profile
                </p>
                <label className="mt-3 inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ackInfo}
                    onChange={(e) => setAckInfo(e.target.checked)}
                  />
                  I acknowledge the important information above.
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 "
                    style={{ border: "1px solid var(--border-color)" }}
                    onClick={() => {
                      if (!ackInfo) {
                        showToast(
                          "error",
                          "Please acknowledge the important information."
                        );
                        return;
                      }
                      setShowApplicantErrors(false);
                      setStep(1);
                    }}
                  >
                    Start Application
                  </button>
                  <Link
                    href="/#adoption"
                    className="btn pill px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    Go back
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Applicant Form (Step 1) */}
          {step === 1 && (
            <>
              <div className="mt-6 grid gap-4">
                <StepApplicant
                  firstName={firstName}
                  setFirstName={setFirstName}
                  lastName={lastName}
                  setLastName={setLastName}
                  address={address}
                  setAddress={setAddress}
                  phone={phone}
                  setPhone={setPhone}
                  email={email}
                  setEmail={setEmail}
                  birthDate={birthDate}
                  setBirthDate={setBirthDate}
                  occupation={occupation}
                  setOccupation={setOccupation}
                  company={company}
                  setCompany={setCompany}
                  socialProfile={socialProfile}
                  setSocialProfile={setSocialProfile}
                  civilStatus={civilStatus}
                  setCivilStatus={setCivilStatus}
                  pronouns={pronouns}
                  setPronouns={setPronouns}
                  adoptedBefore={adoptedBefore}
                  setAdoptedBefore={setAdoptedBefore}
                  idDocumentType={idDocumentType}
                  setIdDocumentType={setIdDocumentType}
                  idDocumentFile={idDocumentFile}
                  setIdDocumentFile={setIdDocumentFile}
                  idDocumentPreviewUrl={idDocumentPreviewUrl}
                  setIdDocumentPreviewUrl={setIdDocumentPreviewUrl}
                  showErrors={showApplicantErrors}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="btn pill px-3 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    onClick={() => setStep(0)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2"
                    style={{ border: "1px solid var(--border-color)" }}
                    onClick={() => {
                      const missingRequired =
                        !firstName.trim() ||
                        !lastName.trim() ||
                        !address.trim() ||
                        !phone.trim() ||
                        !email.trim() ||
                        !birthDate ||
                        !civilStatus ||
                        !pronouns ||
                        adoptedBefore === null ||
                        !idDocumentType.trim() ||
                        !idDocumentFile;

                      if (missingRequired) {
                        setShowApplicantErrors(true);
                        return;
                      }

                      setShowApplicantErrors(false);
                      setStep(2);
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Placeholder containers for Step 2 and 3 to be added next */}
          {step === 2 && (
            <div className="mt-4 flex flex-col gap-4">
              <StepQuestionnaire
                adoptWhat={adoptWhat}
                setAdoptWhat={setAdoptWhat}
                lockAdoptWhat={true}
                homeType={homeTypeQ}
                setHomeType={(v) => setHomeTypeQ(v)}
                rents={rents}
                setRents={(v) => setRents(v)}
                movePlan={movePlan}
                setMovePlan={setMovePlan}
                liveWith={liveWith}
                setLiveWith={setLiveWith}
                allergies={allergies}
                setAllergies={(v) => setAllergies(v)}
                familySupports={familySupports}
                setFamilySupports={(v) => setFamilySupports(v)}
                dailyCareBy={dailyCareBy}
                setDailyCareBy={setDailyCareBy}
                financialResponsible={financialResponsible}
                setFinancialResponsible={setFinancialResponsible}
                vacationCaregiver={vacationCaregiver}
                setVacationCaregiver={setVacationCaregiver}
                hoursAlone={hoursAlone}
                setHoursAlone={setHoursAlone}
                introSteps={introSteps}
                setIntroSteps={setIntroSteps}
                hasPetsNow={hasPetsNow}
                setHasPetsNow={(v) => setHasPetsNow(v)}
                hadPetsPast={hadPetsPast}
                setHadPetsPast={setHadPetsPast}
                showErrors={showQuestionnaireErrors}
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="btn pill px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  onClick={() => {
                    setShowQuestionnaireErrors(false);
                    setStep(1);
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary pill px-4 py-2"
                  onClick={() => {
                    const missingRequired =
                      !adoptWhat ||
                      !homeTypeQ ||
                      rents === null ||
                      liveWith.length === 0 ||
                      allergies === null ||
                      familySupports === null ||
                      hasPetsNow === null ||
                      hadPetsPast === null;

                    if (missingRequired) {
                      setShowQuestionnaireErrors(true);
                      return;
                    }

                    setShowQuestionnaireErrors(false);
                    setStep(3);
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="mt-6 grid gap-4">
              <StepPhotos
                fileInputRef={homeInputRef}
                onSelectFiles={onSelectHomeFiles}
                previewUrls={homePreviewUrls}
                onRemoveAt={removeHomeAt}
                onClearAll={clearHomePhotos}
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="btn pill px-3 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  onClick={() => setStep(2)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-4 py-2"
                  style={{ border: "1px solid var(--border-color)" }}
                  onClick={async () => {
                    if (homePhotos.length === 0) {
                      showToast(
                        "error",
                        "Please upload at least 1 home photo."
                      );
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const [homePaths, idDocumentPath] = await Promise.all([
                        uploadHomePhotos(),
                        uploadIdDocument(),
                      ]);
                      const payload = {
                        petId,
                        applicantName: `${firstName} ${lastName}`.trim(),
                        termsAccepted: ackInfo,
                        // applicant
                        firstName,
                        lastName,
                        address,
                        phone,
                        email,
                        birthDate,
                        occupation,
                        company,
                        socialProfile,
                        civilStatus,
                        pronouns,
                        adoptedBefore,
                        promptedBy,
                        idDocumentType,
                        idDocumentPath,
                        // questionnaire
                        adoptWhat,
                        homeType: homeTypeQ,
                        rents,
                        movePlan,
                        liveWith,
                        allergies,
                        familySupports,
                        dailyCareBy,
                        financialResponsible,
                        vacationCaregiver,
                        hoursAlone,
                        introSteps,
                        hasPetsNow,
                        hadPetsPast,
                        homePhotoPaths: homePaths,
                      };
                      const res = await fetch("/api/adoption-applications", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      if (!res.ok && res.status !== 202) {
                        const body: unknown = await res
                          .json()
                          .catch(() => ({}));
                        let msg = "Submission failed";
                        if (
                          body &&
                          typeof body === "object" &&
                          "error" in body
                        ) {
                          const err = (body as Record<string, unknown>).error;
                          if (typeof err === "string") msg = err;
                        }
                        throw new Error(msg);
                      }
                      showToast("success", "Application submitted!");
                      if (idDocumentPreviewUrl) {
                        try {
                          URL.revokeObjectURL(idDocumentPreviewUrl);
                        } catch {}
                      }
                      setIdDocumentType("");
                      setIdDocumentFile(null);
                      setIdDocumentPreviewUrl(null);
                      router.push("/#adoption");
                    } catch (e: unknown) {
                      console.error(e);
                      const msg =
                        e instanceof Error
                          ? e.message
                          : "Failed to submit application";
                      showToast("error", msg);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Submit Application"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      {viewer && (
        <div className="fixed inset-0 z-[90]" onClick={() => setViewer(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <XCircleIcon
            type="button"
            aria-label="Close viewer"
            className="absolute left-4 top-4 h-9 w-9 p-1 rounded-full text-white bg-[var(--primary-red)] hover:brightness-90 transition-colors duration-200 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setViewer(null);
            }}
          >
            ×
          </XCircleIcon>
          <div className="relative z-[91] grid place-items-center w-full h-full p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.url}
              alt="pet"
              className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
