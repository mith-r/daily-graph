import { z } from "zod";
import {
  BROW_IDS,
  EYE_IDS,
  FACIAL_HAIR_IDS,
  GLASSES_IDS,
  HAIR_IDS,
  HAT_IDS,
  MOUTH_IDS,
} from "./avatar";

// 3–20 chars, lowercase letters/digits/underscore. Must start with a letter.
const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;

export const UsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    USERNAME_RE,
    "Username must be 3–20 chars, start with a letter, and use only a–z, 0–9, or _."
  );

export const DisplayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(24, "Display name must be 24 characters or fewer.");

export const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  username: UsernameSchema,
  displayName: DisplayNameSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
});

export const UpdateDisplayNameSchema = z.object({
  displayName: DisplayNameSchema,
});

export const UpdateUsernameSchema = z.object({
  username: UsernameSchema,
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

// Colors are #rrggbb only — a strict hex pattern means a crafted POST can't
// smuggle arbitrary strings into the SVG. Feature slots are constrained to the
// known catalog ids (lib/avatar.ts), so unknown ids are rejected outright.
const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Colors must be #rrggbb hex.");

// Graph-density preference: a finite numeric multiplier. The action clamps it
// into the allowed range (lib/avatar.ts); here we just reject non-numbers so a
// crafted POST can't smuggle NaN/Infinity or a string through.
export const AvatarScaleSchema = z.object({
  scale: z.number().finite(),
});

export const AvatarConfigSchema = z.object({
  skin: HexColor,
  bg: HexColor,
  hair: z.enum(HAIR_IDS),
  hairColor: HexColor,
  brows: z.enum(BROW_IDS),
  eyes: z.enum(EYE_IDS),
  mouth: z.enum(MOUTH_IDS),
  facialHair: z.enum(FACIAL_HAIR_IDS),
  glasses: z.enum(GLASSES_IDS),
  hat: z.enum(HAT_IDS),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
