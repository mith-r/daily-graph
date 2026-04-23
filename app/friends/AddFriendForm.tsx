"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addFriendAction,
  type FriendRequestState,
} from "@/app/actions/friends";

const initial: FriendRequestState = undefined;

export function AddFriendForm() {
  const [state, action, pending] = useActionState(addFriendAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-3 flex flex-wrap gap-2">
      <input
        name="identifier"
        type="text"
        required
        autoComplete="off"
        placeholder="email or @username"
        className="flex-1 min-w-0 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-white text-neutral-900 font-medium px-4 disabled:opacity-40"
      >
        Send
      </button>
      {state?.error && (
        <p className="basis-full text-xs text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="basis-full text-xs text-green-400">Request sent.</p>
      )}
    </form>
  );
}
