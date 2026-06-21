import "server-only";
import { getRedis } from "./redis";
import { addDays, tomorrowKey } from "./date";
import type {
  Prompt,
  PromptSuggestion,
  PromptSuggestionWithVotes,
} from "./types";

const ROUND_TTL_SECONDS = 60 * 60 * 24 * 60;
const LABEL_MAX = 40;

const suggestionsKey = (targetDate: string) => `prompt_suggestions:${targetDate}`;
// All of a round's votes live in ONE hash: userId -> suggestionId. A vote (or
// switch) is a single HSET and an unvote a single HDEL, so a user is mapped to
// exactly one suggestion atomically — no concurrent multi-key race can leave
// them counted in two suggestions' tallies. Tallies are derived by counting this
// hash. (Replaces the old per-suggestion vote SETs + per-user vote key; an
// in-flight round's votes under the old keys are simply not read after deploy.)
const votesKey = (targetDate: string) => `prompt_votes:${targetDate}`;
const winnerKey = (targetDate: string) => `prompt_winner:${targetDate}`;
// Guards the once-per-day rollover of un-chosen suggestions (independent of the
// winner key, so it still fires on days where nobody voted and no winner is set).
const rolledKey = (targetDate: string) => `prompt_rolled:${targetDate}`;

// Case-insensitive identity of a suggestion's four axes — mirrors the duplicate
// check in addSuggestion, used to avoid rolling a prompt into a round that
// already contains the same one.
function sigKey(s: {
  xLeft: string;
  xRight: string;
  yBottom: string;
  yTop: string;
}): string {
  return [s.xLeft, s.xRight, s.yBottom, s.yTop]
    .map((x) => x.toLowerCase())
    .join("|");
}

export function openRoundDate(): string {
  return tomorrowKey();
}

export type SuggestionInput = {
  xLeft: string;
  xRight: string;
  yBottom: string;
  yTop: string;
};

export type SuggestionAuthor = {
  id: string;
  displayName: string;
};

function normalizeLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || trimmed.length > LABEL_MAX) return null;
  return trimmed;
}

function validateSuggestion(
  input: SuggestionInput
): { ok: true; value: Required<SuggestionInput> } | { ok: false; error: string } {
  const xLeft = normalizeLabel(input.xLeft);
  const xRight = normalizeLabel(input.xRight);
  const yBottom = normalizeLabel(input.yBottom);
  const yTop = normalizeLabel(input.yTop);
  if (!xLeft || !xRight || !yBottom || !yTop) {
    return {
      ok: false,
      error: `Each label must be 1–${LABEL_MAX} characters.`,
    };
  }
  return { ok: true, value: { xLeft, xRight, yBottom, yTop } };
}

export async function listSuggestionsWithVotes(
  targetDate: string,
  opts?: { excludeUserIds?: ReadonlySet<string> }
): Promise<PromptSuggestionWithVotes[]> {
  const redis = getRedis();
  const raw = await redis.hgetall<Record<string, PromptSuggestion>>(
    suggestionsKey(targetDate)
  );
  if (!raw) return [];
  const suggestions = Object.values(raw);
  if (suggestions.length === 0) return [];
  // Tally from the single votes hash (userId -> suggestionId). When
  // excludeUserIds is given (the admin dashboard) those voters are dropped from
  // the count; gameplay callers pass nothing, so winner selection counts every
  // vote.
  const exclude = opts?.excludeUserIds;
  const votes = await redis.hgetall<Record<string, string>>(
    votesKey(targetDate)
  );
  const tally = new Map<string, number>();
  if (votes) {
    for (const [voterId, suggestionId] of Object.entries(votes)) {
      if (exclude && exclude.has(voterId)) continue;
      tally.set(suggestionId, (tally.get(suggestionId) ?? 0) + 1);
    }
  }
  const withVotes: PromptSuggestionWithVotes[] = suggestions.map((s) => ({
    ...s,
    voteCount: tally.get(s.id) ?? 0,
  }));
  withVotes.sort((a, b) => {
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return a.createdAt - b.createdAt;
  });
  return withVotes;
}

export async function getUserVote(
  targetDate: string,
  userId: string
): Promise<string | null> {
  const redis = getRedis();
  const v = await redis.hget<string>(votesKey(targetDate), userId);
  return v ?? null;
}

export async function addSuggestion(
  targetDate: string,
  input: SuggestionInput,
  author: SuggestionAuthor
): Promise<{ ok: true; suggestion: PromptSuggestion } | { ok: false; error: string }> {
  const v = validateSuggestion(input);
  if (!v.ok) return v;

  const redis = getRedis();
  const existing = await redis.hgetall<Record<string, PromptSuggestion>>(
    suggestionsKey(targetDate)
  );
  if (existing) {
    const seen = new Set(Object.values(existing).map(sigKey));
    if (seen.has(sigKey(v.value))) {
      return { ok: false, error: "That prompt has already been suggested." };
    }
  }

  const suggestion: PromptSuggestion = {
    id: crypto.randomUUID(),
    targetDate,
    authorId: author.id,
    authorDisplayName: author.displayName,
    xLeft: v.value.xLeft,
    xRight: v.value.xRight,
    yBottom: v.value.yBottom,
    yTop: v.value.yTop,
    createdAt: Date.now(),
  };
  const key = suggestionsKey(targetDate);
  await redis.hset(key, { [suggestion.id]: suggestion });
  await redis.expire(key, ROUND_TTL_SECONDS);
  return { ok: true, suggestion };
}

export async function setVote(
  targetDate: string,
  userId: string,
  suggestionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const redis = getRedis();
  const exists = await redis.hexists(suggestionsKey(targetDate), suggestionId);
  if (!exists) return { ok: false, error: "Suggestion not found." };

  // Single atomic write: set (or switch) this user's vote. Overwriting the same
  // field guarantees one vote per user, so concurrent switches can't double-count.
  const key = votesKey(targetDate);
  await redis.hset(key, { [userId]: suggestionId });
  await redis.expire(key, ROUND_TTL_SECONDS);
  return { ok: true };
}

export async function clearVote(
  targetDate: string,
  userId: string
): Promise<void> {
  const redis = getRedis();
  await redis.hdel(votesKey(targetDate), userId);
}

export async function getWinnerPrompt(
  targetDate: string
): Promise<Prompt | null> {
  const redis = getRedis();
  const w = await redis.get<Prompt>(winnerKey(targetDate));
  return w ?? null;
}

export async function closeRound(targetDate: string): Promise<Prompt | null> {
  const redis = getRedis();
  const existing = await redis.get<Prompt>(winnerKey(targetDate));
  if (existing) return existing;

  const ranked = await listSuggestionsWithVotes(targetDate);
  const top = ranked.find((s) => s.voteCount > 0);

  let winner: Prompt | null = null;
  if (top) {
    const prompt: Prompt = {
      id: `vote-${targetDate}-${top.id.slice(0, 8)}`,
      xLeft: top.xLeft,
      xRight: top.xRight,
      yBottom: top.yBottom,
      yTop: top.yTop,
    };
    const set = await redis.set(winnerKey(targetDate), prompt, {
      nx: true,
      // Expire with the rest of the round's keys instead of living forever.
      ex: ROUND_TTL_SECONDS,
    });
    // If we lost the race, fall back to whoever won.
    winner =
      set === "OK"
        ? prompt
        : (await redis.get<Prompt>(winnerKey(targetDate))) ?? null;
  }

  // Roll un-chosen suggestions into the next open round, exactly once. The nx
  // guard is independent of the winner key so this still runs on days where
  // nobody voted (in which case every suggestion is a loser).
  const firstClose = await redis.set(rolledKey(targetDate), "1", {
    nx: true,
    ex: ROUND_TTL_SECONDS,
  });
  if (firstClose === "OK") {
    await rolloverUnchosen(targetDate, ranked, top?.id ?? null);
  }

  return winner;
}

// Copy a round's un-chosen suggestions into the next day's round so they get one
// more shot. Votes are not carried over (the new round starts fresh), and a
// suggestion that was already a rollover is dropped rather than rolled again.
async function rolloverUnchosen(
  fromDate: string,
  ranked: PromptSuggestionWithVotes[],
  winnerId: string | null
): Promise<void> {
  const candidates = ranked.filter(
    (s) => s.id !== winnerId && !s.rolledOver
  );
  if (candidates.length === 0) return;

  const redis = getRedis();
  const nextDate = addDays(fromDate, 1);
  const existing = await redis.hgetall<Record<string, PromptSuggestion>>(
    suggestionsKey(nextDate)
  );
  const seen = new Set(
    existing ? Object.values(existing).map(sigKey) : []
  );

  const toAdd: Record<string, PromptSuggestion> = {};
  for (const s of candidates) {
    const key = sigKey(s);
    if (seen.has(key)) continue;
    seen.add(key);
    toAdd[s.id] = {
      id: s.id,
      targetDate: nextDate,
      authorId: s.authorId,
      authorDisplayName: s.authorDisplayName,
      xLeft: s.xLeft,
      xRight: s.xRight,
      yBottom: s.yBottom,
      yTop: s.yTop,
      createdAt: s.createdAt,
      rolledOver: true,
    };
  }
  if (Object.keys(toAdd).length === 0) return;

  const key = suggestionsKey(nextDate);
  await redis.hset(key, toAdd);
  await redis.expire(key, ROUND_TTL_SECONDS);
}
