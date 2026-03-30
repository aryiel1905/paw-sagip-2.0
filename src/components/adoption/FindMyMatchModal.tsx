"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdoptionPetsPaged } from "@/data/supabaseApi";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { showToast } from "@/lib/toast";
import type { AdoptionPet, EnergyLevel } from "@/types/app";
import { normalizeSpecies } from "@/constants/species";

type Props = {
  open: boolean;
  onClose: () => void;
  accent?: string;
};

type MatchAnswers = {
  petType: string;
  energy: "" | "low" | "medium" | "high";
};

type MatchRow = {
  pet: AdoptionPet;
  score: number;
  reasons: string[];
};

type SpeciesOption = {
  value: string;
  label: string;
  count: number;
};

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

function petSpeciesLabel(pet: AdoptionPet, key: string) {
  const raw = (pet.species ?? "").trim();
  if (raw && !normalizeSpecies(raw).startsWith("others;")) {
    return raw
      .split(/\s+/)
      .map((part) =>
        part.length ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part
      )
      .join(" ");
  }
  if (key === "other") return "Other";
  return key
    .split(/\s+/)
    .map((part) =>
      part.length ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part
    )
    .join(" ");
}

function userEnergyToLevel(
  value: MatchAnswers["energy"]
): EnergyLevel | null {
  if (value === "low") return 1;
  if (value === "medium") return 2;
  if (value === "high") return 3;
  return null;
}

function energyLabel(level: EnergyLevel | null | undefined): string {
  if (level === 1) return "Low";
  if (level === 2) return "Medium";
  if (level === 3) return "High";
  return "Not set";
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
  const userEnergy = userEnergyToLevel(answers.energy);
  const petEnergy = pet.energyLevel ?? null;
  let score = 60;

  if (userEnergy && petEnergy) {
    const distance = Math.abs(userEnergy - petEnergy);
    if (distance === 0) {
      score += 30;
      reasons.push(`Energy level matches your lifestyle (${energyLabel(petEnergy)})`);
    } else if (distance === 1) {
      score += 14;
      reasons.push(`Energy level is close to your preference (${energyLabel(petEnergy)})`);
    } else {
      score += 2;
      reasons.push(`Energy level is far from your preference (${energyLabel(petEnergy)})`);
    }
  } else {
    score += 8;
    reasons.push("Energy level is not set yet, so this match is based mostly on pet type");
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

  const speciesOptions = useMemo<SpeciesOption[]>(() => {
    const byKey = new Map<string, SpeciesOption>();
    for (const pet of candidates) {
      const key = petSpeciesKey(pet);
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }
      byKey.set(key, {
        value: key,
        label: petSpeciesLabel(pet, key),
        count: 1,
      });
    }
    return Array.from(byKey.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });
  }, [candidates]);

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

  const goOrPrompt = useCallback(
    async (to: string) => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;
        if (!user) {
          try {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("auth:postLoginRedirect", to);
            }
          } catch {}
          onClose();
          showToast("success", "Please sign in to view pet details.");
          try {
            window.dispatchEvent(
              new CustomEvent("app:signin", { detail: { mode: "login" } })
            );
          } catch {}
          return;
        }
        onClose();
        router.push(to);
      } catch {
        onClose();
        router.push(to);
      }
    },
    [onClose, router]
  );

  useEffect(() => {
    if (!open || candidates.length > 0 || loadingPool) return;
    loadMatchingPool();
  }, [open, candidates.length, loadingPool, loadMatchingPool]);

  useEffect(() => {
    if (!answers.petType) return;
    const stillExists = speciesOptions.some(
      (option) => option.value === answers.petType
    );
    if (!stillExists) {
      setAnswers((prev) => ({ ...prev, petType: "" }));
      setResults([]);
    }
  }, [answers.petType, speciesOptions]);

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
              Pick your pet type and lifestyle energy. We&apos;ll compare it with the admin-set energy level of each pet.
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
              disabled={loadingPool || speciesOptions.length === 0}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  petType: e.target.value,
                }))
              }
            >
              <option value="">
                {loadingPool
                  ? "Loading available animals..."
                  : speciesOptions.length === 0
                  ? "No available animals"
                  : "Select one"}
              </option>
              {speciesOptions.map((species) => (
                <option key={species.value} value={species.value}>
                  {species.label} ({species.count})
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
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
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
                  <p className="mb-2 text-xs text-black/60">
                    Energy: {energyLabel(entry.pet.energyLevel ?? null)}
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
                    onClick={() => goOrPrompt(`/adopt/${entry.pet.id}`)}
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
