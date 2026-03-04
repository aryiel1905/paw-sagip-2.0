"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdoptionPetsPaged } from "@/data/supabaseApi";
import { showToast } from "@/lib/toast";
import type { AdoptionPet } from "@/types/app";
import { SPECIES_SUGGESTIONS, normalizeSpecies } from "@/constants/species";

type Props = {
  open: boolean;
  onClose: () => void;
  accent?: string;
};

type MatchAnswers = {
  petType: string;
  energy: "calm" | "playful" | "";
};

type PetEnergy = "calm" | "playful" | "neutral";

type MatchRow = {
  pet: AdoptionPet;
  score: number;
  reasons: string[];
};

function inferEnergyFromAge(ageText?: string | null): PetEnergy {
  const text = normalizeSpecies(ageText);
  if (!text) return "neutral";
  if (
    text.includes("kitten") ||
    text.includes("puppy") ||
    text.includes("young")
  ) {
    return "playful";
  }
  if (text.includes("senior") || text.includes("old")) {
    return "calm";
  }
  return "neutral";
}

function petSpeciesKey(pet: AdoptionPet) {
  const raw = normalizeSpecies(pet.species);
  if (raw) {
    if (raw.includes("dog")) return "dog";
    if (raw.includes("cat")) return "cat";
    const clean = raw.startsWith("others;") ? raw.slice("others;".length) : raw;
    if (clean) return clean;
  }
  if (pet.kind === "dog" || pet.kind === "cat") return pet.kind;
  return "other";
}

function rankPet(pet: AdoptionPet, answers: MatchAnswers): MatchRow | null {
  const selected = normalizeSpecies(answers.petType);
  const petKey = petSpeciesKey(pet);
  const selectedIsOther = selected === "other" || selected === "others";
  const petIsOther = pet.kind === "other";

  if (!selected) return null;
  if (selectedIsOther) {
    if (!petIsOther) return null;
  } else if (petKey !== selected) {
    return null;
  }

  const reasons: string[] = ["Matches your preferred animal type"];
  const inferredEnergy = inferEnergyFromAge(pet.age);
  let score = 60;

  if (inferredEnergy === answers.energy) {
    score += 30;
    reasons.push(
      answers.energy === "calm"
        ? "Age profile suggests calmer energy"
        : "Age profile suggests playful energy"
    );
  } else if (inferredEnergy === "neutral") {
    score += 12;
    reasons.push("Energy is flexible based on available age info");
  } else {
    score += 2;
  }

  return { pet, score, reasons: reasons.slice(0, 2) };
}

export default function FindMyMatchModal({
  open,
  onClose,
  accent = "#F57C00",
}: Props) {
  const router = useRouter();
  const [loadingPool, setLoadingPool] = useState(false);
  const [candidates, setCandidates] = useState<AdoptionPet[]>([]);
  const [results, setResults] = useState<MatchRow[]>([]);
  const [answers, setAnswers] = useState<MatchAnswers>({
    petType: "",
    energy: "",
  });

  const canRunMatch = !!answers.petType && !!answers.energy;

  const loadMatchingPool = useCallback(async () => {
    if (loadingPool) return;
    setLoadingPool(true);
    try {
      const pageSize = 200;
      const first = await fetchAdoptionPetsPaged(1, pageSize);
      const all = [...first.items];
      const totalCount = Math.max(first.total, first.items.length);
      const pagesNeeded = Math.max(1, Math.ceil(totalCount / pageSize));

      for (let p = 2; p <= pagesNeeded; p++) {
        const next = await fetchAdoptionPetsPaged(p, pageSize);
        all.push(...next.items);
        if (next.items.length === 0) break;
      }

      const deduped = Array.from(new Map(all.map((p) => [p.id, p])).values());
      setCandidates(deduped);
    } catch {
      setCandidates([]);
      showToast("error", "Unable to load pets for matching right now.");
    } finally {
      setLoadingPool(false);
    }
  }, [loadingPool]);

  const runMatch = useCallback(() => {
    if (!canRunMatch) return;

    const ranked = candidates
      .map((pet) => rankPet(pet, answers))
      .filter((row): row is MatchRow => !!row)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    setResults(ranked);
    if (ranked.length === 0) {
      showToast("error", "No matching pets found for this type yet.");
    }
  }, [answers, canRunMatch, candidates]);

  useEffect(() => {
    if (!open || candidates.length > 0 || loadingPool) return;
    loadMatchingPool();
  }, [open, candidates.length, loadingPool, loadMatchingPool]);

  useEffect(() => {
    if (!open) return;
    const body = document.body as HTMLBodyElement;
    const prevOverflow = body.style.overflow;
    body.classList.add("modal-open");
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      body.classList.remove("modal-open");
      body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close match finder"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl rounded-2xl shadow-soft surface p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-black">Find My Match</h2>
            <p className="text-sm text-black/70">
              Pick your pet type and preferred energy. We&apos;ll show your best fits.
            </p>
          </div>
          <button
            type="button"
            className="pill px-3 py-1"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-black">
            What animal are you looking for?
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              style={{ borderColor: "var(--border-color)" }}
              value={answers.petType}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  petType: e.target.value,
                }))
              }
            >
              <option value="">Select one</option>
              {SPECIES_SUGGESTIONS.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-black">
            What energy level fits your lifestyle?
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              style={{ borderColor: "var(--border-color)" }}
              value={answers.energy}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  energy: e.target.value as MatchAnswers["energy"],
                }))
              }
            >
              <option value="">Select one</option>
              <option value="calm">Calm</option>
              <option value="playful">Playful</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pill px-3 py-2 font-semibold"
            style={{
              border: "1px solid var(--border-color)",
              background: accent,
              color: "#fff",
              opacity: canRunMatch ? 1 : 0.7,
            }}
            disabled={!canRunMatch || loadingPool}
            onClick={runMatch}
          >
            {loadingPool ? "Loading pets..." : "Show recommendations"}
          </button>
          <button
            type="button"
            className="pill px-3 py-2"
            style={{ border: "1px solid var(--border-color)" }}
            onClick={() => {
              setAnswers({ petType: "", energy: "" });
              setResults([]);
            }}
          >
            Reset
          </button>
        </div>

        <div
          className="mt-4 max-h-[48vh] overflow-auto rounded-xl border p-3"
          style={{ borderColor: "var(--border-color)" }}
        >
          {results.length === 0 ? (
            <p className="text-sm text-black/70">
              {canRunMatch
                ? "Tap \"Show recommendations\" to see your best matches."
                : "Complete both questions to generate recommendations."}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((entry) => (
                <div
                  key={`match-${entry.pet.id}`}
                  className="rounded-xl border p-3"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-semibold text-black truncate">
                      {entry.pet.name?.trim() || entry.pet.kind.toUpperCase()}
                    </p>
                    <span className="text-xs font-semibold" style={{ color: accent }}>
                      {entry.score}
                    </span>
                  </div>
                  <p className="text-xs text-black/70 mb-2 truncate">
                    {entry.pet.breed ||
                      entry.pet.age ||
                      entry.pet.location ||
                      "Available for adoption"}
                  </p>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {entry.reasons.map((reason) => (
                      <span
                        key={`${entry.pet.id}-${reason}`}
                        className="rounded-full px-2 py-0.5 text-[11px]"
                        style={{
                          background: `color-mix(in srgb, ${accent} 12%, white)`,
                          color: "#333",
                        }}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="pill px-2 py-1 text-xs"
                    style={{ border: "1px solid var(--border-color)" }}
                    onClick={() => {
                      onClose();
                      router.push(`/adopt/${entry.pet.id}`);
                    }}
                  >
                    View details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
