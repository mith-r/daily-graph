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
