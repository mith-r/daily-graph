import "server-only";
import { getRedis } from "./redis";
import { dateKeyToUTC } from "./date";
import type { Placement } from "./types";

const DAY_TTL_SECONDS = 60 * 60 * 24 * 30;
const USER_DATES_CAP = 120;

function dayKey(date: string): string {
  return `placements:${date}`;
}

function userDatesKey(userId: string): string {
  return `user:${userId}:dates`;
}

export async function getAllPlacements(date: string): Promise<Placement[]> {
  const redis = getRedis();
  const raw = await redis.hgetall<Record<string, Placement>>(dayKey(date));
  if (!raw) return [];
  return Object.values(raw);
}

export async function getPlacement(
  date: string,
  userId: string
): Promise<Placement | null> {
  const redis = getRedis();
  const val = await redis.hget<Placement>(dayKey(date), userId);
  return val ?? null;
}

// Score the dates index by the DATE itself (UTC midnight), not the per-request
// createdAt. This makes re-recording the same date a true no-op (same score, no
// reorder) so the self-healing call on every placement POST can't shuffle the
// list, and keeps the ordering correct even if a past date is ever backfilled
// (createdAt=now would wrongly sort an old date as newest).
function dayScore(date: string): number {
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10))
  );
}

async function recordUserDate(
  redis: ReturnType<typeof getRedis>,
  userId: string,
  date: string
): Promise<void> {
  const datesKey = userDatesKey(userId);
  await redis.zadd(datesKey, { score: dayScore(date), member: date });
  const size = await redis.zcard(datesKey);
  if (size > USER_DATES_CAP) {
    await redis.zremrangebyrank(datesKey, 0, size - USER_DATES_CAP - 1);
  }
}

export async function setPlacement(
  date: string,
  placement: Placement
): Promise<void> {
  const redis = getRedis();
  const key = dayKey(date);
  await redis.hset(key, { [placement.userId]: placement });
  await redis.expire(key, DAY_TTL_SECONDS);
  await recordUserDate(redis, placement.userId, date);
}

// First-placement-of-the-day, atomic. HSETNX claims the user's slot in one op so
// two concurrent first POSTs (double-tap, retry, two tabs) can't both "win":
// exactly one returns true and performs the side effects (dates index +
// analytics), the rest are no-ops. Returns true only when this call created the
// placement. (setPlacement remains the unconditional overwrite, used by seeding.)
export async function createPlacement(
  date: string,
  placement: Placement
): Promise<boolean> {
  const redis = getRedis();
  const key = dayKey(date);
  const created = await redis.hsetnx(key, placement.userId, placement);
  // Run the bookkeeping on every call (expire + zadd are idempotent), not only
  // on first create: if an earlier attempt created the placement but then threw
  // before indexing the date, a retry backfills the dates index here instead of
  // the HSETNX no-op skipping it forever (which would silently break the streak).
  await redis.expire(key, DAY_TTL_SECONDS);
  await recordUserDate(redis, placement.userId, date);
  return created === 1;
}

export async function listUserDates(userId: string): Promise<string[]> {
  const redis = getRedis();
  const members = (await redis.zrange(userDatesKey(userId), 0, -1, {
    rev: true,
  })) as string[];
  return members;
}

function dayDiff(a: string, b: string): number {
  return Math.round((dateKeyToUTC(a) - dateKeyToUTC(b)) / 86400000);
}

export function computeStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0;
  const gapFromToday = dayDiff(today, dates[0]);
  if (gapFromToday < 0 || gapFromToday > 1) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dayDiff(dates[i - 1], dates[i]) === 1) streak++;
    else break;
  }
  return streak;
}

const HEATMAP_COLS = 16;
const HEATMAP_ROWS = 16;

export function buildHeatmap(placements: Placement[]) {
  const grid = new Array(HEATMAP_COLS * HEATMAP_ROWS).fill(0);
  let max = 0;
  for (const p of placements) {
    // x, y are -1..1. Map x→col (left→right) and y→row (top→bottom, so invert y).
    const col = Math.min(
      HEATMAP_COLS - 1,
      Math.max(0, Math.floor(((p.x + 1) / 2) * HEATMAP_COLS))
    );
    const row = Math.min(
      HEATMAP_ROWS - 1,
      Math.max(0, Math.floor(((1 - p.y) / 2) * HEATMAP_ROWS))
    );
    const idx = row * HEATMAP_COLS + col;
    grid[idx] += 1;
    if (grid[idx] > max) max = grid[idx];
  }
  return {
    cols: HEATMAP_COLS,
    rows: HEATMAP_ROWS,
    grid,
    total: placements.length,
    max,
  };
}
