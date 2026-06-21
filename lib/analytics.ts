import "server-only";
import { getRedis } from "./redis";
import { addDays, todayKey } from "./date";

const DAY_TTL_SECONDS = 60 * 60 * 24 * 90;
const DEDUPE_TTL_SECONDS = 60 * 10;
const MAX_ACTIVE_MS_PER_PING = 60_000;
const RECENT_DAYS = 30;

export type AnalyticsEvent = "pageview" | "heartbeat";

export type AnalyticsDay = {
  date: string;
  activeUsers: number;
  pageViews: number;
  activeMs: number;
  heartbeats: number;
  signups: number;
  placements: number;
  votes: number;
};

export type AnalyticsSummary = {
  today: AnalyticsDay;
  recentDays: AnalyticsDay[];
  dau7: number;
  dau30: number;
  activeMs7: number;
  activeMs30: number;
};

const dayKey = (date: string) => `analytics:day:${date}`;
const activeUsersKey = (date: string) => `analytics:active_users:${date}`;
const dedupeKey = (eventId: string) => `analytics:event:${eventId}`;
const datesKey = "analytics:dates";

function dateScore(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10))
  );
}

function numberField(
  raw: Record<string, unknown> | null,
  field: keyof Omit<AnalyticsDay, "date" | "activeUsers">
): number {
  const value = raw?.[field];
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function touchDate(date: string): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.zadd(datesKey, { score: dateScore(date), member: date }),
    redis.expire(dayKey(date), DAY_TTL_SECONDS),
    redis.expire(activeUsersKey(date), DAY_TTL_SECONDS),
  ]);
}

async function incrementDay(
  date: string,
  field: keyof Omit<AnalyticsDay, "date" | "activeUsers">,
  amount = 1
): Promise<void> {
  const redis = getRedis();
  await redis.hincrby(dayKey(date), field, amount);
  await redis.expire(dayKey(date), DAY_TTL_SECONDS);
}

async function markActiveUser(date: string, userId: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd(activeUsersKey(date), userId);
  await redis.expire(activeUsersKey(date), DAY_TTL_SECONDS);
}

async function claimEvent(eventId: string | null): Promise<boolean> {
  if (!eventId) return true;
  const redis = getRedis();
  const claimed = await redis.set(dedupeKey(eventId), "1", {
    nx: true,
    ex: DEDUPE_TTL_SECONDS,
  });
  return claimed === "OK";
}

export async function recordAnalyticsPing(input: {
  userId: string;
  event: AnalyticsEvent;
  eventId: string | null;
  activeMs?: number;
  date?: string;
}): Promise<void> {
  const date = input.date ?? todayKey();
  if (!(await claimEvent(input.eventId))) return;

  await Promise.all([touchDate(date), markActiveUser(date, input.userId)]);

  if (input.event === "pageview") {
    await incrementDay(date, "pageViews");
    return;
  }

  const activeMs = Math.max(
    0,
    Math.min(MAX_ACTIVE_MS_PER_PING, Math.round(input.activeMs ?? 0))
  );
  if (activeMs <= 0) return;
  await Promise.all([
    incrementDay(date, "heartbeats"),
    incrementDay(date, "activeMs", activeMs),
  ]);
}

export async function recordSignup(date = todayKey()): Promise<void> {
  await touchDate(date);
  await incrementDay(date, "signups");
}

export async function recordPlacement(date = todayKey()): Promise<void> {
  await touchDate(date);
  await incrementDay(date, "placements");
}

// Count a vote at most once per (round, user). A vote is freely toggleable
// (cast → clear → re-cast), so a plain per-cast increment is inflatable by one
// user repeatedly toggling; an NX marker per (round, user) makes day.votes a
// true count of distinct voters for the round. The calendar-day counter still
// reflects the day the (first) vote happened.
const votedMarkerKey = (round: string, userId: string) =>
  `analytics:voted:${round}:${userId}`;

export async function recordVote(round: string, userId: string): Promise<void> {
  const redis = getRedis();
  const claimed = await redis.set(votedMarkerKey(round, userId), "1", {
    nx: true,
    ex: DAY_TTL_SECONDS,
  });
  if (claimed !== "OK") return;
  const date = todayKey();
  await touchDate(date);
  await incrementDay(date, "votes");
}

// DAU is a set of user ids, so admin activity can be excluded retroactively by
// counting the set minus the excluded ids. The scalar counters (activeMs,
// pageViews, heartbeats) can't be decomposed per-user, so for those admins are
// only excluded going forward (at the recording sites).
async function countActiveUsers(
  date: string,
  exclude?: ReadonlySet<string>
): Promise<number> {
  const redis = getRedis();
  if (!exclude || exclude.size === 0) {
    return redis.scard(activeUsersKey(date));
  }
  const members = (await redis.smembers(activeUsersKey(date))) as string[];
  let count = 0;
  for (const id of members) if (!exclude.has(id)) count++;
  return count;
}

export async function getAnalyticsDay(
  date: string,
  excludeUserIds?: ReadonlySet<string>
): Promise<AnalyticsDay> {
  const redis = getRedis();
  const [raw, activeUsers] = await Promise.all([
    redis.hgetall<Record<string, unknown>>(dayKey(date)),
    countActiveUsers(date, excludeUserIds),
  ]);
  return {
    date,
    activeUsers,
    pageViews: numberField(raw, "pageViews"),
    activeMs: numberField(raw, "activeMs"),
    heartbeats: numberField(raw, "heartbeats"),
    signups: numberField(raw, "signups"),
    placements: numberField(raw, "placements"),
    votes: numberField(raw, "votes"),
  };
}

export async function getAnalyticsSummary(
  endDate = todayKey(),
  excludeUserIds?: ReadonlySet<string>
): Promise<AnalyticsSummary> {
  const dates = Array.from({ length: RECENT_DAYS }, (_, i) =>
    addDays(endDate, -i)
  );
  const recentDays = await Promise.all(
    dates.map((date) => getAnalyticsDay(date, excludeUserIds))
  );
  const first7 = recentDays.slice(0, 7);
  const totalDau7 = first7.reduce((sum, day) => sum + day.activeUsers, 0);
  const totalDau30 = recentDays.reduce((sum, day) => sum + day.activeUsers, 0);
  return {
    today: recentDays[0],
    recentDays,
    dau7: Math.round(totalDau7 / first7.length),
    dau30: Math.round(totalDau30 / recentDays.length),
    activeMs7: first7.reduce((sum, day) => sum + day.activeMs, 0),
    activeMs30: recentDays.reduce((sum, day) => sum + day.activeMs, 0),
  };
}
