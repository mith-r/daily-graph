"use client";

import { useState, useTransition } from "react";
import type { PromptSuggestionWithVotes, VoteState } from "@/lib/types";

type Props = {
  meId: string;
  initial: VoteState;
};

export function VoteClient({ meId, initial }: Props) {
  const [state, setState] = useState<VoteState>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setState(initial);
  }

  async function vote(suggestionId: string) {
    if (pendingId) return;
    setPendingId(suggestionId);
    setError(null);

    const snapshot = state;
    const optimistic = applyOptimistic(state, meId, suggestionId);
    startTransition(() => setState(optimistic));

    try {
      const res = await fetch("/api/prompt-vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as VoteState;
      setState(json);
    } catch (e) {
      setState(snapshot);
      setError(e instanceof Error ? e.message : "vote failed");
    } finally {
      setPendingId(null);
    }
  }

  if (state.suggestions.length === 0) {
    return (
      <p className="mt-3 text-sm text-white/50">
        No suggestions yet — be the first.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <ul className="space-y-2">
        {state.suggestions.map((s) => (
          <SuggestionRow
            key={s.id}
            suggestion={s}
            voted={state.myVote === s.id}
            mine={s.authorId === meId}
            pending={pendingId === s.id}
            onVote={() => vote(s.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  voted,
  mine,
  pending,
  onVote,
}: {
  suggestion: PromptSuggestionWithVotes;
  voted: boolean;
  mine: boolean;
  pending: boolean;
  onVote: () => void;
}) {
  return (
    <li className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm leading-snug">
          <span className="text-white/90">{suggestion.xLeft}</span>
          <span className="text-white/40">↔</span>
          <span className="text-white/90">{suggestion.xRight}</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm leading-snug">
          <span className="text-white/90">{suggestion.yBottom}</span>
          <span className="text-white/40">↕</span>
          <span className="text-white/90">{suggestion.yTop}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="truncate">
            {mine ? "you" : suggestion.authorDisplayName} ·{" "}
            <span className="tabular-nums">
              {suggestion.voteCount}{" "}
              {suggestion.voteCount === 1 ? "vote" : "votes"}
            </span>
          </span>
          {suggestion.rolledOver && (
            <span className="shrink-0 rounded border border-white/10 px-1 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
              held over
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onVote}
        disabled={pending}
        aria-pressed={voted}
        className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition disabled:opacity-40 ${
          voted
            ? "bg-white text-neutral-900 font-medium"
            : "border border-white/20 text-white/80 hover:text-white hover:border-white/40"
        }`}
      >
        {voted ? "Voted" : "Vote"}
      </button>
    </li>
  );
}

function applyOptimistic(
  state: VoteState,
  userId: string,
  clickedId: string
): VoteState {
  const wasVoted = state.myVote === clickedId;
  const next: VoteState = {
    ...state,
    suggestions: state.suggestions.map((s) => {
      if (s.id === clickedId) {
        return {
          ...s,
          voteCount: s.voteCount + (wasVoted ? -1 : 1),
        };
      }
      if (s.id === state.myVote) {
        return { ...s, voteCount: Math.max(0, s.voteCount - 1) };
      }
      return s;
    }),
    myVote: wasVoted ? null : clickedId,
  };
  // keep ranking consistent for UX
  next.suggestions.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt - b.createdAt;
  });
  return next;
}
