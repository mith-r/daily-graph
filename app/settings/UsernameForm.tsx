"use client";

import { useActionState } from "react";
import {
  updateUsernameAction,
  type ProfileFormState,
} from "@/app/actions/profile";

const initial: ProfileFormState = undefined;

export function UsernameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(
    updateUsernameAction,
    initial
  );

  return (
    <form action={action} className="mt-3 space-y-3">
      <div className="flex items-center rounded-md bg-white/5 border border-white/10 focus-within:border-white/40">
        <span className="pl-3 text-white/40 select-none">@</span>
        <input
          name="username"
          defaultValue={current}
          maxLength={20}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent px-2 py-2 text-white placeholder-white/30 outline-none"
        />
      </div>
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
