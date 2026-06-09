import "server-only";
import { getRedis } from "./redis";
import type { Nudge } from "./types";

const DAY_TTL_SECONDS = 60 * 60 * 24 * 30;

function nudgeKey(date: string, targetUserId: string): string {
  return `nudges:${date}:${targetUserId}`;
}

export async function setNudge(
  date: string,
  targetId: string,
  nudge: Nudge
): Promise<void> {
  const redis = getRedis();
  const key = nudgeKey(date, targetId);
  await redis.hset(key, { [nudge.nudgerUserId]: nudge });
  await redis.expire(key, DAY_TTL_SECONDS);
}

export async function removeNudge(
  date: string,
  targetId: string,
  nudgerId: string
): Promise<void> {
  const redis = getRedis();
  await redis.hdel(nudgeKey(date, targetId), nudgerId);
}

export async function getNudgesOn(
  date: string,
  targetId: string
): Promise<Nudge[]> {
  const redis = getRedis();
  const raw = await redis.hgetall<Record<string, Nudge>>(
    nudgeKey(date, targetId)
  );
  if (!raw) return [];
  return Object.values(raw);
}

// For each target, return all nudges placed on them, keyed by targetId. Batched
// so building the response only costs one round of parallel reads.
export async function getNudgesOnMany(
  date: string,
  targetIds: string[]
): Promise<Map<string, Nudge[]>> {
  const result = new Map<string, Nudge[]>();
  if (targetIds.length === 0) return result;
  const redis = getRedis();
  const raws = await Promise.all(
    targetIds.map((tid) =>
      redis.hgetall<Record<string, Nudge>>(nudgeKey(date, tid))
    )
  );
  targetIds.forEach((tid, i) => {
    const raw = raws[i];
    result.set(tid, raw ? Object.values(raw) : []);
  });
  return result;
}

// For each friend in friendIds, return my nudge of them (if any) keyed by friendId.
export async function getMyNudgesOnFriends(
  date: string,
  myId: string,
  friendIds: string[]
): Promise<Map<string, { dx: number; dy: number }>> {
  const result = new Map<string, { dx: number; dy: number }>();
  if (friendIds.length === 0) return result;
  const redis = getRedis();
  const nudges = await Promise.all(
    friendIds.map((fid) =>
      redis.hget<Nudge>(nudgeKey(date, fid), myId)
    )
  );
  friendIds.forEach((fid, i) => {
    const n = nudges[i];
    if (n) result.set(fid, { dx: n.dx, dy: n.dy });
  });
  return result;
}
