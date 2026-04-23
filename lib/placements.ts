import "server-only";
import { getRedis } from "./redis";
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

export async function setPlacement(
  date: string,
  placement: Placement
): Promise<void> {
  const redis = getRedis();
  const key = dayKey(date);
  const datesKey = userDatesKey(placement.userId);
  await redis.hset(key, { [placement.userId]: placement });
  await redis.expire(key, DAY_TTL_SECONDS);
  await redis.zadd(datesKey, {
    score: placement.createdAt,
    member: date,
  });
  const size = await redis.zcard(datesKey);
  if (size > USER_DATES_CAP) {
    await redis.zremrangebyrank(datesKey, 0, size - USER_DATES_CAP - 1);
  }
}

export async function listUserDates(userId: string): Promise<string[]> {
  const redis = getRedis();
  const members = (await redis.zrange(userDatesKey(userId), 0, -1, {
    rev: true,
  })) as string[];
  return members;
}

function dayDiff(a: string, b: string): number {
  const da = Date.UTC(
    Number(a.slice(0, 4)),
    Number(a.slice(5, 7)) - 1,
    Number(a.slice(8, 10))
  );
  const db = Date.UTC(
    Number(b.slice(0, 4)),
    Number(b.slice(5, 7)) - 1,
    Number(b.slice(8, 10))
  );
  return Math.round((da - db) / 86400000);
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

export async function getFriendPlacements(
  date: string,
  friendIds: Set<string>
): Promise<Placement[]> {
  if (friendIds.size === 0) return [];
  const all = await getAllPlacements(date);
  return all.filter((p) => friendIds.has(p.userId));
}

const HEATMAP_COLS = 20;
const HEATMAP_ROWS = 20;

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

export async function getTodaysHeatmap(date: string) {
  const all = await getAllPlacements(date);
  return buildHeatmap(all);
}
