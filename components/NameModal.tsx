"use client";

import { useState } from "react";

type Props = {
  initial?: string;
  onSubmit: (name: string) => void;
};

export function NameModal({ initial = "", onSubmit }: Props) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();
  const ok = trimmed.length > 0 && trimmed.length <= 24;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (ok) onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-neutral-900 border border-white/10 p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-white">What should we call you?</h2>
        <p className="mt-1 text-sm text-white/60">
          Just a display name. Visible to whoever else places a dot today.
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="e.g. Alex"
          className="mt-4 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={!ok}
          className="mt-4 w-full rounded-md bg-white text-neutral-900 font-medium py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
