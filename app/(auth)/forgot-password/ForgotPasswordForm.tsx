"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type ForgotPasswordFormState,
} from "@/app/actions/verification";

const initial: ForgotPasswordFormState = undefined;

// Two phases in one form (keeps the email out of the URL): ask for the email,
// then ask for the emailed code plus a new password. The request action always
// reports "sent" whether or not the account exists (anti-enumeration).
// Actions are bound to the forms directly so both phases also work without JS.
export function ForgotPasswordForm() {
  const [requestState, request, requesting] = useActionState(
    requestPasswordResetAction,
    initial
  );
  const [resetState, reset, resetting] = useActionState(
    resetPasswordAction,
    initial
  );

  const email = resetState?.email ?? requestState?.email;
  const codePhase = !!(resetState?.sent || requestState?.sent);

  if (!codePhase) {
    return (
      <form action={request} className="mt-6 space-y-3">
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-white/60">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            required
            className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
          />
        </label>
        {requestState?.errors?.email && (
          <p className="-mt-2 text-xs text-red-400">
            {requestState.errors.email[0]}
          </p>
        )}

        <button
          type="submit"
          disabled={requesting}
          className="w-full rounded-md bg-white text-neutral-900 font-medium py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {requesting ? "Sending…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form action={reset} className="mt-6 space-y-3">
      <p className="text-sm text-white/60">
        If an account exists for <span className="text-white">{email}</span>,
        we sent it a code.
      </p>
      <input type="hidden" name="email" value={email ?? ""} />

      <label className="block">
        <span className="block text-xs uppercase tracking-widest text-white/60">
          Code
        </span>
        <input
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="123456"
          required
          className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40 tracking-[0.3em] text-center text-lg"
        />
      </label>
      {resetState?.errors?.code && (
        <p className="-mt-2 text-xs text-red-400">{resetState.errors.code[0]}</p>
      )}

      <label className="block">
        <span className="block text-xs uppercase tracking-widest text-white/60">
          New password
        </span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
        />
      </label>
      {resetState?.errors?.password && (
        <p className="-mt-2 text-xs text-red-400">
          {resetState.errors.password[0]}
        </p>
      )}

      {resetState?.message && (
        <p className="text-sm text-red-400">{resetState.message}</p>
      )}

      <button
        type="submit"
        disabled={resetting}
        className="w-full rounded-md bg-white text-neutral-900 font-medium py-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {resetting ? "Resetting…" : "Reset password"}
      </button>

      {/* Full reload so both action states reset to phase 1. */}
      <a
        href="/forgot-password"
        className="block w-full text-center text-sm text-white/60 underline hover:text-white"
      >
        Use a different email
      </a>
    </form>
  );
}
