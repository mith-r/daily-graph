import "server-only";
import { getRedis } from "./redis";
import type { Placement } from "./types";

const DAY_TTL_SECONDS = 60 * 60 * 24 * 30;

function dayKey(date: string): string {
  return `placements:${date}`;
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
  await redis.hset(key, { [placement.userId]: placement });
  await redis.expire(key, DAY_TTL_SECONDS);
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
