"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAccount } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { checkOtp, invalidateOtp, issueOtp } from "@/lib/otp";
import {
  getUserByEmail,
  getUserById,
  markEmailVerified,
  updateEmail,
  updatePassword,
  verifyPassword,
} from "@/lib/users";
import {
  FixEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyCodeSchema,
} from "@/lib/validation";

const ISSUE_ERROR_MESSAGES = {
  cooldown: "A code was just sent — wait a minute before requesting another.",
  rate_limited: "Too many codes requested. Try again in an hour.",
  send_failed: "Couldn't send the email. Try again in a moment.",
} as const;

// --- Verify email ---

export type VerifyEmailFormState =
  | {
      errors?: { code?: string[] };
      message?: string;
      // Set after a successful send so the form can confirm it.
      sent?: boolean;
      // Set by fixEmailAction so the form can show the corrected address.
      email?: string;
    }
  | undefined;

export async function verifyEmailAction(
  _state: VerifyEmailFormState,
  formData: FormData
): Promise<VerifyEmailFormState> {
  const user = await requireAccount();
  if (user.emailVerifiedAt) redirect("/");

  const parsed = VerifyCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const result = await checkOtp({
    purpose: "verify-email",
    userId: user.id,
    code: parsed.data.code,
  });
  if ("error" in result) {
    const message =
      result.error === "invalid"
        ? "That code isn't right. Check the email and try again."
        : result.error === "too_many_attempts"
          ? "Too many wrong attempts. Request a new code."
          : "That code has expired. Request a new one.";
    return { message };
  }
  // Stale-code defense: only verify if the code was sent to the address
  // currently on the account (fix-email invalidates + reissues, but be sure).
  if (result.email !== user.email) {
    return { message: "That code has expired. Request a new one." };
  }

  const marked = await markEmailVerified(user.id);
  if ("error" in marked) return { message: marked.error };
  redirect("/");
}

export async function resendVerificationAction(): Promise<VerifyEmailFormState> {
  const user = await requireAccount();
  if (user.emailVerifiedAt) redirect("/");

  const issued = await issueOtp({
    purpose: "verify-email",
    userId: user.id,
    email: user.email,
  });
  if ("error" in issued) return { message: ISSUE_ERROR_MESSAGES[issued.error] };
  return { sent: true };
}

export type FixEmailFormState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
      sent?: boolean;
      email?: string;
    }
  | undefined;

export async function fixEmailAction(
  _state: FixEmailFormState,
  formData: FormData
): Promise<FixEmailFormState> {
  const account = await requireAccount();
  if (account.emailVerifiedAt) redirect("/");

  const parsed = FixEmailSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // PublicUser carries no passwordHash — load the full record to verify.
  const user = await getUserById(account.id);
  if (!user) return { message: "User not found." };
  const ok = await verifyPassword(user, parsed.data.password);
  if (!ok) return { message: "Incorrect password." };

  const emailChanged = parsed.data.email !== user.email;
  if (emailChanged) {
    const updated = await updateEmail(user.id, parsed.data.email);
    if ("error" in updated) return { message: updated.error };
    // Codes sent to the old address must not verify the new one.
    await invalidateOtp("verify-email", user.id);
  }

  const issued = await issueOtp({
    purpose: "verify-email",
    userId: user.id,
    email: parsed.data.email,
    // A changed address has never been sent a code — don't make the user sit
    // out the cooldown from the send to the old (wrong) address.
    ignoreCooldown: emailChanged,
  });
  if ("error" in issued) {
    // The email was still updated — reflect that even if the send failed.
    return {
      message: ISSUE_ERROR_MESSAGES[issued.error],
      email: parsed.data.email,
    };
  }
  return { sent: true, email: parsed.data.email };
}

// --- Forgot password ---

export type ForgotPasswordFormState =
  | {
      errors?: { email?: string[]; code?: string[]; password?: string[] };
      message?: string;
      // Phase 2 marker: the email a code was (purportedly) sent to.
      sent?: boolean;
      email?: string;
    }
  | undefined;

export async function requestPasswordResetAction(
  _state: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email;
  // Do ALL existence-dependent work (the user lookup AND the issue+email) AFTER
  // the response is sent. The lookup itself is timing-sensitive — an existing
  // account costs two Redis round-trips (email→id, id→user) vs one for an
  // unknown address — so keeping it (not just the email send) out of the
  // synchronous path is what actually makes the response constant-time. after()
  // still runs reliably within the function lifetime, so the email is sent;
  // errors are swallowed for anti-enumeration, and the per-email limiterKey
  // bounds probing of an address that does exist.
  after(async () => {
    const user = await getUserByEmail(email);
    if (!user) return;
    await issueOtp({
      purpose: "reset-password",
      userId: user.id,
      email: user.email,
      limiterKey: email,
    });
  });
  // Anti-enumeration: identical, constant-time response whether or not the
  // account exists.
  return { sent: true, email };
}

export async function resetPasswordAction(
  _state: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const rawEmail = formData.get("email");
  const parsed = ResetPasswordSchema.safeParse({
    email: rawEmail,
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      // Keep the form on the code+password phase.
      sent: true,
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    };
  }

  const failure: ForgotPasswordFormState = {
    message: "Invalid or expired code.",
    sent: true,
    email: parsed.data.email,
  };

  const user = await getUserByEmail(parsed.data.email);
  if (!user) return failure;

  const result = await checkOtp({
    purpose: "reset-password",
    userId: user.id,
    code: parsed.data.code,
  });
  if ("error" in result || result.email !== user.email) return failure;

  const updated = await updatePassword(user.id, parsed.data.password);
  if ("error" in updated) return failure;
  // Receiving the code proves ownership of the address — count it as verified.
  await markEmailVerified(user.id);
  // updatePassword revoked all prior sessions; mint a fresh one and go home.
  await createSession(user.id);
  redirect("/");
}
