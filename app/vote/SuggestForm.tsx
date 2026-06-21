"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  suggestPromptAction,
  type SuggestPromptState,
} from "@/app/actions/voting";

const initial: SuggestPromptState = undefined;

const fieldClass =
  "w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40 text-sm";

export function SuggestForm() {
  const [state, action, pending] = useActionState(suggestPromptAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-3 space-y-3">
      <div>
        <label className="block text-xs text-white/50 mb-1">
          Top of y-axis
        </label>
        <input
          name="yTop"
          required
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. ghosts in the morning"
          className={fieldClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1">
            Left of x-axis
          </label>
          <input
            name="xLeft"
            required
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. monk mode"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">
            Right of x-axis
          </label>
          <input
            name="xRight"
            required
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. screen time: NSFW"
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-white/50 mb-1">
          Bottom of y-axis
        </label>
        <input
          name="yBottom"
          required
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. cries after"
          className={fieldClass}
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-white text-neutral-900 font-medium px-4 py-2 text-sm disabled:opacity-40"
        >
          {pending ? "Sending…" : "Suggest"}
        </button>
        {state?.error && (
          <p className="text-xs text-red-400">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-emerald-400">Submitted.</p>
        )}
      </div>
    </form>
  );
}
