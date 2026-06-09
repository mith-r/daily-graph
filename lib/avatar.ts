import { hashString, mulberry32 } from "./rng";
import type { AvatarConfig } from "./types";

// Shared, dependency-free catalog of avatar building blocks — the single source
// of truth for the editor UI (app/profile/AvatarEditor.tsx), the Zod validator
// (lib/validation.ts), and the SVG renderer (components/Avatar.tsx). NOT marked
// "server-only" so it can be imported from client components too.
//
// Each facial feature is a preset *id*; the renderer maps id → JSX. The id
// tuples below are `as const` so the validator can build a `z.enum` from them
// and TypeScript can derive the literal union. A parallel label map (typed
// `Record<Id, string>`) gives the editor human labels and — because the Record
// requires every id as a key — guarantees the two never drift apart.

export type Option<Id extends string = string> = { id: Id; label: string };

function options<Id extends string>(
  ids: readonly Id[],
  labels: Record<Id, string>
): Option<Id>[] {
  return ids.map((id) => ({ id, label: labels[id] }));
}

// --- Feature id tuples (source of truth for validation + iteration) ---

export const HAIR_IDS = [
  "none",
  "short",
  "buzz",
  "side",
  "curly",
  "long",
  "bun",
  "afro",
  "mohawk",
] as const;
export type HairId = (typeof HAIR_IDS)[number];

export const BROW_IDS = ["neutral", "raised", "angry", "flat"] as const;
export type BrowId = (typeof BROW_IDS)[number];

export const EYE_IDS = ["round", "happy", "sleepy", "wink", "wide"] as const;
export type EyeId = (typeof EYE_IDS)[number];

export const MOUTH_IDS = [
  "smile",
  "grin",
  "neutral",
  "frown",
  "open",
] as const;
export type MouthId = (typeof MOUTH_IDS)[number];

export const FACIAL_HAIR_IDS = [
  "none",
  "stubble",
  "mustache",
  "beard",
  "goatee",
] as const;
export type FacialHairId = (typeof FACIAL_HAIR_IDS)[number];

export const GLASSES_IDS = [
  "none",
  "round",
  "square",
  "sunglasses",
] as const;
export type GlassesId = (typeof GLASSES_IDS)[number];

export const HAT_IDS = ["none", "beanie", "cap", "tophat"] as const;
export type HatId = (typeof HAT_IDS)[number];

// --- Editor option lists (id + human label) ---

export const HAIR_STYLES = options<HairId>(HAIR_IDS, {
  none: "Bald",
  short: "Short",
  buzz: "Buzz",
  side: "Side part",
  curly: "Curly",
  long: "Long",
  bun: "Bun",
  afro: "Afro",
  mohawk: "Mohawk",
});

export const BROWS = options<BrowId>(BROW_IDS, {
  neutral: "Neutral",
  raised: "Raised",
  angry: "Furrowed",
  flat: "Flat",
});

export const EYES = options<EyeId>(EYE_IDS, {
  round: "Round",
  happy: "Happy",
  sleepy: "Sleepy",
  wink: "Wink",
  wide: "Wide",
});

export const MOUTHS = options<MouthId>(MOUTH_IDS, {
  smile: "Smile",
  grin: "Grin",
  neutral: "Neutral",
  frown: "Frown",
  open: "Surprised",
});

export const FACIAL_HAIR = options<FacialHairId>(FACIAL_HAIR_IDS, {
  none: "None",
  stubble: "Stubble",
  mustache: "Mustache",
  beard: "Beard",
  goatee: "Goatee",
});

export const GLASSES = options<GlassesId>(GLASSES_IDS, {
  none: "None",
  round: "Round",
  square: "Square",
  sunglasses: "Shades",
});

export const HATS = options<HatId>(HAT_IDS, {
  none: "None",
  beanie: "Beanie",
  cap: "Cap",
  tophat: "Top hat",
});

// --- Color palettes (hex #rrggbb). Offered as swatches in the editor; the
// validator accepts any well-formed hex, so these only drive defaults + UI. ---

export const SKIN_TONES = [
  "#ffe0bd",
  "#f6c89f",
  "#e8b48a",
  "#d99e6a",
  "#c68642",
  "#a05a2c",
  "#7a4a21",
  "#5a3415",
] as const;

export const BG_COLORS = [
  "#1f2a44",
  "#2a4d69",
  "#2a9d8f",
  "#3a7d44",
  "#e76f51",
  "#bc4749",
  "#6d597a",
  "#577590",
  "#b5838d",
  "#3d348b",
] as const;

export const HAIR_COLORS = [
  "#1a1a1a",
  "#2c1b10",
  "#4b2e1e",
  "#7a4a21",
  "#b87333",
  "#d4a017",
  "#e6c200",
  "#c0c0c0",
  "#e8e8e8",
  "#c0392b",
  "#8e44ad",
  "#2e86de",
] as const;

// Sensible neutral starting face for anyone who hasn't designed one yet.
export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#e8b48a",
  bg: "#2a4d69",
  hair: "short",
  hairColor: "#2c1b10",
  brows: "neutral",
  eyes: "round",
  mouth: "smile",
  facialHair: "none",
  glasses: "none",
  hat: "none",
};

// --- Graph avatar size ---
//
// A *viewer* preference (not how others see you): scales every face on YOUR
// view of the graph so people who find it cluttered can shrink them and others
// can go bigger. Stored as a continuous multiplier on the user record and
// multiplied into Dot's base pixel sizes. 1 is the historical size, so existing
// views are unchanged unless someone opts in. Bounds double as the size slider's
// min/max in the profile editor.
export const AVATAR_SCALE_MIN = 0.8;
export const AVATAR_SCALE_MAX = 1.6;
export const AVATAR_SCALE_STEP = 0.05;
export const DEFAULT_AVATAR_SCALE = 1;

// Coerce a stored/incoming value into a usable multiplier: non-numbers (absent
// or stale preference) fall back to the default, and anything out of range is
// clamped to the slider bounds so a crafted POST can't blow dots up arbitrarily.
export function clampAvatarScale(n: number | undefined | null): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT_AVATAR_SCALE;
  return Math.min(AVATAR_SCALE_MAX, Math.max(AVATAR_SCALE_MIN, n));
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

// Deterministic random face from a seed string (e.g. a userId), so the
// "Randomize" button and any seeded preview are reproducible. Mirrors the
// hashString + mulberry32 approach used elsewhere (lib/celebrities.ts) — no
// Math.random, so it's stable across renders and SSR/CSR.
export function randomAvatar(seed: string): AvatarConfig {
  const rand = mulberry32(hashString(`avatar:${seed}`));
  return {
    skin: pick(rand, SKIN_TONES),
    bg: pick(rand, BG_COLORS),
    hair: pick(rand, HAIR_IDS),
    hairColor: pick(rand, HAIR_COLORS),
    brows: pick(rand, BROW_IDS),
    eyes: pick(rand, EYE_IDS),
    mouth: pick(rand, MOUTH_IDS),
    facialHair: pick(rand, FACIAL_HAIR_IDS),
    glasses: pick(rand, GLASSES_IDS),
    hat: pick(rand, HAT_IDS),
  };
}
