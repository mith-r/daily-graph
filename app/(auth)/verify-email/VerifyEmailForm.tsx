"use client";

import { useActionState } from "react";
import {
  fixEmailAction,
  resendVerificationAction,
  verifyEmailAction,
  type FixEmailFormState,
  type VerifyEmailFormState,
} from "@/app/actions/verification";

const initialVerify: VerifyEmailFormState = undefined;
const initialFix: FixEmailFormState = undefined;

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const [verifyState, verify, verifying] = useActionState(
    verifyEmailAction,
    initialVerify
  );
  const [resendState, resend, resending] = useActionState(
    resendVerificationAction,
    initialVerify
  );
  const [fixState, fix, fixing] = useActionState(fixEmailAction, initialFix);

  // fixEmailAction reports the corrected address after it re-points the
  // account; reflect it without waiting for a server re-render.
  const email = fixState?.email ?? initialEmail;

  return (
    <div>
      <form action={verify} className="mt-6 space-y-3">
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-white/60">
            Verification code
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
        {verifyState?.errors?.code && (
          <p className="-mt-2 text-xs text-red-400">
            {verifyState.errors.code[0]}
          </p>
        )}
        {verifyState?.message && (
          <p className="text-sm text-red-400">{verifyState.message}</p>
        )}

        <button
          type="submit"
          disabled={verifying}
          className="w-full rounded-md bg-white text-neutral-900 font-medium py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {verifying ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <form action={resend} className="mt-3 text-center">
        <button
          type="submit"
          disabled={resending}
          className="text-sm text-white/60 underline hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
        {resendState?.sent && (
          <p className="mt-1 text-xs text-emerald-400">
            Code sent to {email}.
          </p>
        )}
        {resendState?.message && (
          <p className="mt-1 text-xs text-red-400">{resendState.message}</p>
        )}
      </form>

      {/* Native disclosure — works (and stays in the HTML) without JS. */}
      <details className="mt-6 border-t border-white/10 pt-4" open={fixState ? true : undefined}>
        <summary className="cursor-pointer text-sm text-white/60 underline hover:text-white">
          Wrong email? Fix it
        </summary>

        <form action={fix} className="mt-3 space-y-3">
          <p className="text-xs text-white/40">
            Mistyped your email at signup? Enter the correct address and your
            password — we&apos;ll send the code there instead. Your account
            and friends stay exactly as they are.
          </p>
          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-white/60">
              Correct email
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
            />
          </label>
          {fixState?.errors?.email && (
            <p className="-mt-2 text-xs text-red-400">
              {fixState.errors.email[0]}
            </p>
          )}

          <label className="block">
            <span className="block text-xs uppercase tracking-widest text-white/60">
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
            />
          </label>
          {fixState?.errors?.password && (
            <p className="-mt-2 text-xs text-red-400">
              {fixState.errors.password[0]}
            </p>
          )}

          {fixState?.message && (
            <p className="text-sm text-red-400">{fixState.message}</p>
          )}
          {fixState?.sent && (
            <p className="text-sm text-emerald-400">
              Email updated — code sent to {fixState.email}.
            </p>
          )}

          <button
            type="submit"
            disabled={fixing}
            className="w-full rounded-md bg-white/10 border border-white/20 text-white font-medium py-2 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {fixing ? "Updating…" : "Update email & send code"}
          </button>
        </form>
      </details>
    </div>
  );
}
