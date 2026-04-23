"use client";

import { useActionState } from "react";
import { signup, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = undefined;

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);

  return (
    <form action={action} className="mt-6 space-y-3">
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <FieldErrors errors={state?.errors?.email} />

      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        maxLength={20}
        placeholder="alice_03"
        hint="3–20 chars. Letters, numbers, underscore. Start with a letter."
      />
      <FieldErrors errors={state?.errors?.username} />

      <Field
        label="Display name"
        name="displayName"
        type="text"
        autoComplete="nickname"
        maxLength={24}
        hint="Shown on the graph."
      />
      <FieldErrors errors={state?.errors?.displayName} />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
      />
      <FieldErrors errors={state?.errors?.password} />

      {state?.message && (
        <p className="text-sm text-red-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-white text-neutral-900 font-medium py-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-white/60">
        {label}
      </span>
      <input
        {...rest}
        required
        className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <ul className="-mt-2 text-xs text-red-400 space-y-0.5">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}
