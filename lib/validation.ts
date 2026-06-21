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

export const VerifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
});

// "Wrong email? Fix it" on the verify screen: the corrected address plus the
// current password (proof of account ownership).
export const FixEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
});

export const ResetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
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

// Profile photo upload. The client downscales/crops to a small square JPEG
// before sending, so this is just a safety net: accept only a base64 data URL
// of a known image type, and cap the decoded size so a crafted POST can't store
// an unbounded blob in Redis. ~400 KB comfortably fits the ~20–40 KB the client
// produces while leaving headroom.
const MAX_PHOTO_BYTES = 400_000;

const PHOTO_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export const PhotoDataUrlSchema = z
  .string()
  .refine((v) => PHOTO_DATA_URL_RE.test(v), "Unsupported image format.")
  .refine((v) => {
    const b64 = v.slice(v.indexOf(",") + 1);
    // 4 base64 chars encode 3 bytes; subtract padding to get the byte count.
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    const bytes = (b64.length * 3) / 4 - padding;
    return bytes <= MAX_PHOTO_BYTES;
  }, "Image is too large.");

// A user-submitted report against another account. reason mirrors ReportReason
// in lib/types.ts. details/context are free-text and length-capped so a crafted
// POST can't store an unbounded blob.
export const ReportSchema = z.object({
  reportedUserId: z.string().trim().min(1, "Missing user to report."),
  reason: z.enum([
    "inappropriate_suggestion",
    "impersonation",
    "harassment",
    "spam",
    "other",
  ]),
  details: z.string().trim().max(500, "Keep details under 500 characters.").optional(),
  context: z.string().trim().max(300).optional(),
});

// Pull the first Zod issue's message (or a fallback) for actions that surface a
// single error string rather than per-field errors.
export function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
