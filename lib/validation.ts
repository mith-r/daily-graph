import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
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

export const FriendEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
