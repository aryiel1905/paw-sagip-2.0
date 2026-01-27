import { Alert } from "@/types/app";

type EmojiTheme = {
  background: string;
  color: string;
};

const gradient = (light: string, mid: string, dark: string) =>
  `radial-gradient(circle at 50% 50%, ${light} 0%, ${mid} 45%, ${dark} 100%)`;

const DOG_FALLBACK: EmojiTheme = {
  background: gradient("#F8ECD9", "#EED9C2", "#DDBC9F"),
  color: "#8C4F22",
};
const CAT_FALLBACK: EmojiTheme = {
  background: gradient("#FFF3C4", "#FFE08A", "#FFB74A"),
  color: "#8C6B00",
};

function normalizeEmoji(value: string) {
  return value.replace(/\uFE0F/g, "");
}

const EMOJI = {
  MONKEY: "\u{1F412}",
  ORANGE_CAT: "\u{1F408}",
  BLACK_CAT: "\u{1F408}\u{200D}\u{2B1B}",
  HORSE: "\u{1F40E}",
  OX: "\u{1F402}",
  WATER_BUFFALO: "\u{1F403}",
  COW: "\u{1F404}",
  PIG: "\u{1F416}",
  BOAR: "\u{1F417}",
  SHEEP: "\u{1F411}",
  GOAT: "\u{1F410}",
  MOUSE: "\u{1F401}",
  RAT: "\u{1F400}",
  HAMSTER: "\u{1F439}",
  RABBIT: "\u{1F407}",
  CHIPMUNK: "\u{1F43F}\u{FE0F}",
  BEAVER: "\u{1F9AB}",
  HEDGEHOG: "\u{1F994}",
  OTTER: "\u{1F9A6}",
  SKUNK: "\u{1F9A8}",
  KANGAROO: "\u{1F998}",
  BADGER: "\u{1F9A1}",
  PAWS: "\u{1F43E}",
  BIRD: "\u{1F426}",
  PENGUIN: "\u{1F427}",
  DOVE: "\u{1F54A}\u{FE0F}",
  EAGLE: "\u{1F985}",
  DUCK: "\u{1F986}",
  SWAN: "\u{1F9A2}",
  OWL: "\u{1F989}",
  FLAMINGO: "\u{1F9A9}",
  PEACOCK: "\u{1F99A}",
  PARROT: "\u{1F99C}",
  BLACK_BIRD: "\u{1F426}\u{200D}\u{2B1B}",
  GOOSE: "\u{1FABF}",
  CROCODILE: "\u{1F40A}",
  TURTLE: "\u{1F422}",
  LIZARD: "\u{1F98E}",
  SNAKE: "\u{1F40D}",
};

const EMOJI_THEME_MAP: Record<string, EmojiTheme> = {
  [normalizeEmoji(EMOJI.MONKEY)]: {
    background: gradient("#F5D7B5", "#D7A97C", "#8C5A2B"),
    color: "#6B3A19",
  },
  [normalizeEmoji(EMOJI.ORANGE_CAT)]: {
    background: gradient("#FFE1B0", "#FFC266", "#F08A24"),
    color: "#8A4E00",
  },
  [normalizeEmoji(EMOJI.BLACK_CAT)]: {
    background: gradient("#E0E0E0", "#9A9A9A", "#2D2D2D"),
    color: "#1F1F1F",
  },
  [normalizeEmoji(EMOJI.HORSE)]: {
    background: gradient("#F4D4B7", "#C58E5C", "#7A4B25"),
    color: "#5B341B",
  },
  [normalizeEmoji(EMOJI.OX)]: {
    background: gradient("#E6D8C9", "#B08C6A", "#6B4C2B"),
    color: "#4A2F19",
  },
  [normalizeEmoji(EMOJI.WATER_BUFFALO)]: {
    background: gradient("#E3E7ED", "#A9B3C2", "#4A5568"),
    color: "#2D3748",
  },
  [normalizeEmoji(EMOJI.COW)]: {
    background: gradient("#F4F2EE", "#D1CDC6", "#5B5B5B"),
    color: "#3D3D3D",
  },
  [normalizeEmoji(EMOJI.PIG)]: {
    background: gradient("#FFD9E3", "#FFB0C7", "#D86A8B"),
    color: "#8A3B55",
  },
  [normalizeEmoji(EMOJI.BOAR)]: {
    background: gradient("#E1C5A8", "#B07A4A", "#5A361D"),
    color: "#4A2A18",
  },
  [normalizeEmoji(EMOJI.SHEEP)]: {
    background: gradient("#FFFFFF", "#ECECEC", "#BDBDBD"),
    color: "#6B6B6B",
  },
  [normalizeEmoji(EMOJI.GOAT)]: {
    background: gradient("#F7E3C9", "#D9B38C", "#9A6B3E"),
    color: "#6B4A2C",
  },
  [normalizeEmoji(EMOJI.MOUSE)]: {
    background: gradient("#F0F0F0", "#C8C8C8", "#8A8A8A"),
    color: "#5A5A5A",
  },
  [normalizeEmoji(EMOJI.RAT)]: {
    background: gradient("#E7E7E7", "#B5B5B5", "#6E6E6E"),
    color: "#4A4A4A",
  },
  [normalizeEmoji(EMOJI.HAMSTER)]: {
    background: gradient("#FFE6B7", "#F7C26E", "#B36A1E"),
    color: "#7A420F",
  },
  [normalizeEmoji(EMOJI.RABBIT)]: {
    background: gradient("#FFFFFF", "#EAEAEA", "#B0B0B0"),
    color: "#6B6B6B",
  },
  [normalizeEmoji(EMOJI.CHIPMUNK)]: {
    background: gradient("#FFE1B8", "#D9A364", "#8A5A2B"),
    color: "#6B3E1E",
  },
  [normalizeEmoji(EMOJI.BEAVER)]: {
    background: gradient("#E6C7A4", "#B47C4A", "#6B3F1E"),
    color: "#4A2A12",
  },
  [normalizeEmoji(EMOJI.HEDGEHOG)]: {
    background: gradient("#F1D7C2", "#C49B7E", "#6B4A3A"),
    color: "#4A2F23",
  },
  [normalizeEmoji(EMOJI.OTTER)]: {
    background: gradient("#E8CDB2", "#B5835A", "#6B3E22"),
    color: "#4A2A18",
  },
  [normalizeEmoji(EMOJI.SKUNK)]: {
    background: gradient("#F5F5F5", "#C7C7C7", "#3A3A3A"),
    color: "#2B2B2B",
  },
  [normalizeEmoji(EMOJI.KANGAROO)]: {
    background: gradient("#F5D1A8", "#D59A63", "#8A5A2F"),
    color: "#5A3A1E",
  },
  [normalizeEmoji(EMOJI.BADGER)]: {
    background: gradient("#E3E1D9", "#B1A89B", "#5B5246"),
    color: "#3B342B",
  },
  [normalizeEmoji(EMOJI.PAWS)]: {
    background: gradient("#F3F4F6", "#E5E7EB", "#9CA3AF"),
    color: "#4B5563",
  },
  [normalizeEmoji(EMOJI.BIRD)]: {
    background: gradient("#E0F2FF", "#A7D8FF", "#4A90E2"),
    color: "#2C5AA0",
  },
  [normalizeEmoji(EMOJI.PENGUIN)]: {
    background: gradient("#F1F7FF", "#C9D8F0", "#4B5563"),
    color: "#2F3B52",
  },
  [normalizeEmoji(EMOJI.DOVE)]: {
    background: gradient("#FFFFFF", "#E5E7EB", "#B0B7C3"),
    color: "#6B7280",
  },
  [normalizeEmoji(EMOJI.EAGLE)]: {
    background: gradient("#F6D8A8", "#C79245", "#7A4A12"),
    color: "#4A2B0C",
  },
  [normalizeEmoji(EMOJI.DUCK)]: {
    background: gradient("#FFF3B0", "#FFD35A", "#E38B00"),
    color: "#9A5B00",
  },
  [normalizeEmoji(EMOJI.SWAN)]: {
    background: gradient("#FFFFFF", "#E6F0FF", "#B3C6E6"),
    color: "#5A6F8A",
  },
  [normalizeEmoji(EMOJI.OWL)]: {
    background: gradient("#F0D1A8", "#C28957", "#6B3F1E"),
    color: "#4A2A16",
  },
  [normalizeEmoji(EMOJI.FLAMINGO)]: {
    background: gradient("#FFD1E8", "#FF9CCB", "#D85B9E"),
    color: "#8A2F63",
  },
  [normalizeEmoji(EMOJI.PEACOCK)]: {
    background: gradient("#B2F5EA", "#38B2AC", "#2C7A7B"),
    color: "#1E5C5C",
  },
  [normalizeEmoji(EMOJI.PARROT)]: {
    background: gradient("#D9F7C9", "#8EE26B", "#2F9E44"),
    color: "#1F6B2E",
  },
  [normalizeEmoji(EMOJI.BLACK_BIRD)]: {
    background: gradient("#E5E7EB", "#9CA3AF", "#1F2937"),
    color: "#111827",
  },
  [normalizeEmoji(EMOJI.GOOSE)]: {
    background: gradient("#F2F6FA", "#C8D5E6", "#6B7C93"),
    color: "#44546A",
  },
  [normalizeEmoji(EMOJI.CROCODILE)]: {
    background: gradient("#D9F7C9", "#8DCB6B", "#3D7A3E"),
    color: "#2F5A30",
  },
  [normalizeEmoji(EMOJI.TURTLE)]: {
    background: gradient("#D7F3E3", "#7BC5A8", "#2F7D5A"),
    color: "#1F5A41",
  },
  [normalizeEmoji(EMOJI.LIZARD)]: {
    background: gradient("#E3F7C9", "#A5D86E", "#5C8A2E"),
    color: "#3F5A1F",
  },
  [normalizeEmoji(EMOJI.SNAKE)]: {
    background: gradient("#E6F2C1", "#B7C974", "#6B7F2A"),
    color: "#4A5A1E",
  },
};

function emojiTheme(emoji?: string | null): EmojiTheme | null {
  if (!emoji) return null;
  return EMOJI_THEME_MAP[normalizeEmoji(emoji)] ?? null;
}

function petFallbackTheme(kind?: string | null) {
  const value = (kind || "").toLowerCase();
  if (value.includes("dog")) return DOG_FALLBACK;
  if (value.includes("cat")) return CAT_FALLBACK;
  return null;
}

function speciesHint(a: Alert): "dog" | "cat" | "" {
  const raw = [
    (a as any).animal,
    (a as any).pet_kind,
    (a as any).petType,
    (a as any).species,
    (a as any).kind,
    (a as any).title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (raw.includes("dog")) return "dog";
  if (raw.includes("cat")) return "cat";
  return "";
}

export function alertFallbackTheme(alert: Alert, base: string) {
  const emojiMatch = emojiTheme(alert.emoji);
  if (emojiMatch) return emojiMatch;

  const direct =
    (alert as any).animal ??
    (alert as any).pet_kind ??
    (alert as any).petType ??
    (alert as any).species ??
    (alert as any).kind ??
    "";
  const themed =
    petFallbackTheme(direct) ??
    (speciesHint(alert) === "dog"
      ? DOG_FALLBACK
      : speciesHint(alert) === "cat"
      ? CAT_FALLBACK
      : null);
  return (
    themed ?? {
      backgroundColor: `color-mix(in srgb, ${base} 22%, white)`,
      color: base,
    }
  );
}
