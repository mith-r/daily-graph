import "server-only";
import { getRedis } from "./redis";
import { tomorrowKey } from "./date";
import type {
  Prompt,
  PromptSuggestion,
  PromptSuggestionWithVotes,
} from "./types";

const ROUND_TTL_SECONDS = 60 * 60 * 24 * 60;
const LABEL_MAX = 40;

const suggestionsKey = (targetDate: string) => `prompt_suggestions:${targetDate}`;
const suggestionVotesKey = (targetDate: string, suggestionId: string) =>
  `prompt_suggestion_votes:${targetDate}:${suggestionId}`;
const userVoteKey = (targetDate: string, userId: string) =>
  `prompt_user_vote:${targetDate}:${userId}`;
const winnerKey = (targetDate: string) => `prompt_winner:${targetDate}`;

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

export function validateSuggestion(
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
  targetDate: string
): Promise<PromptSuggestionWithVotes[]> {
  const redis = getRedis();
  const raw = await redis.hgetall<Record<string, PromptSuggestion>>(
    suggestionsKey(targetDate)
  );
  if (!raw) return [];
  const suggestions = Object.values(raw);
  if (suggestions.length === 0) return [];
  const counts = await Promise.all(
    suggestions.map((s) => redis.scard(suggestionVotesKey(targetDate, s.id)))
  );
  const withVotes: PromptSuggestionWithVotes[] = suggestions.map((s, i) => ({
    ...s,
    voteCount: counts[i] ?? 0,
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
  const v = await redis.get<string>(userVoteKey(targetDate, userId));
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
    for (const s of Object.values(existing)) {
      if (
        s.xLeft.toLowerCase() === v.value.xLeft.toLowerCase() &&
        s.xRight.toLowerCase() === v.value.xRight.toLowerCase() &&
        s.yBottom.toLowerCase() === v.value.yBottom.toLowerCase() &&
        s.yTop.toLowerCase() === v.value.yTop.toLowerCase()
      ) {
        return { ok: false, error: "That prompt has already been suggested." };
      }
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

  const prev = await redis.get<string>(userVoteKey(targetDate, userId));
  if (prev && prev !== suggestionId) {
    await redis.srem(suggestionVotesKey(targetDate, prev), userId);
  }
  const voteKey = suggestionVotesKey(targetDate, suggestionId);
  await redis.sadd(voteKey, userId);
  await redis.expire(voteKey, ROUND_TTL_SECONDS);
  await redis.set(userVoteKey(targetDate, userId), suggestionId, {
    ex: ROUND_TTL_SECONDS,
  });
  return { ok: true };
}

export async function clearVote(
  targetDate: string,
  userId: string
): Promise<void> {
  const redis = getRedis();
  const prev = await redis.get<string>(userVoteKey(targetDate, userId));
  if (prev) {
    await redis.srem(suggestionVotesKey(targetDate, prev), userId);
  }
  await redis.del(userVoteKey(targetDate, userId));
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
  if (!top) return null;

  const prompt: Prompt = {
    id: `vote-${targetDate}-${top.id.slice(0, 8)}`,
    xLeft: top.xLeft,
    xRight: top.xRight,
    yBottom: top.yBottom,
    yTop: top.yTop,
  };
  const set = await redis.set(winnerKey(targetDate), prompt, { nx: true });
  if (set === "OK") return prompt;
  // Lost the race; return whoever won.
  return (await redis.get<Prompt>(winnerKey(targetDate))) ?? null;
}
