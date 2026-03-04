export const SPECIES_SUGGESTIONS = [
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

export function normalizeSpecies(value?: string | null) {
  return (value || "").trim().toLowerCase();
}
