"use client";

import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = undefined;

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <form action={action} className="mt-6 space-y-3">
      <label className="block">
        <span className="block text-xs uppercase tracking-widest text-white/60">
          Email
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
        />
      </label>
      {state?.errors?.email && (
        <p className="-mt-2 text-xs text-red-400">{state.errors.email[0]}</p>
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
      {state?.errors?.password && (
        <p className="-mt-2 text-xs text-red-400">{state.errors.password[0]}</p>
      )}

      {state?.message && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-white text-neutral-900 font-medium py-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
