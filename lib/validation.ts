import { z } from "zod";

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

export const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  username: UsernameSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(24, "Display name must be 24 characters or fewer."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

// Friend-add accepts either "user@example.com" or a bare/prefixed username
// like "alice" or "@alice". Caller resolves which kind it is.
export const FriendIdentifierSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter an email or @username."),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export function parseFriendIdentifier(
  raw: string
): { kind: "email"; value: string } | { kind: "username"; value: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip a leading @ (so "@alice" works)
  const bare = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  // If it looks like an email, validate as one.
  if (bare.includes("@")) {
    const result = z.string().email().safeParse(bare.toLowerCase());
    return result.success ? { kind: "email", value: result.data } : null;
  }

  const result = UsernameSchema.safeParse(bare);
  return result.success ? { kind: "username", value: result.data } : null;
}
