"use client";

import { useActionState } from "react";
import {
  updateDisplayNameAction,
  type ProfileFormState,
} from "@/app/actions/profile";

const initial: ProfileFormState = undefined;

export function DisplayNameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(
    updateDisplayNameAction,
    initial
  );

  return (
    <form action={action} className="mt-3 space-y-3">
      <input
        name="displayName"
        defaultValue={current}
        maxLength={24}
        required
        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      {state?.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-400">Saved.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-white text-neutral-900 font-medium py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
