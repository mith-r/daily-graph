import { Redis } from "@upstash/redis";
import type { Placement } from "./types";

// Upstash Redis client. Reads env vars set by the Vercel ↔ Upstash integration.
// Accepts either UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN (legacy name).
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  // Throw lazily instead of at module load so `next build` still succeeds
  // when env vars aren't populated yet (e.g. first commit before Vercel
  // integration is attached). Calls will fail clearly at request time.
  console.warn("Upstash Redis env vars missing; /api calls will fail at runtime.");
}

const redis =
  url && token
    ? new Redis({ url, token })
    : null;

const DAY_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function dayKey(date: string): string {
  return `placements:${date}`;
}

export async function getAllPlacements(date: string): Promise<Placement[]> {
  if (!redis) throw new Error("Redis not configured");
  const raw = await redis.hgetall<Record<string, Placement>>(dayKey(date));
  if (!raw) return [];
  // Upstash returns objects already parsed; values are whatever was stored.
  return Object.values(raw);
}

export async function getPlacement(
  date: string,
  userId: string
): Promise<Placement | null> {
  if (!redis) throw new Error("Redis not configured");
  const val = await redis.hget<Placement>(dayKey(date), userId);
  return val ?? null;
}

export async function setPlacement(
  date: string,
  placement: Placement
): Promise<void> {
  if (!redis) throw new Error("Redis not configured");
  const key = dayKey(date);
  await redis.hset(key, { [placement.userId]: placement });
  await redis.expire(key, DAY_TTL_SECONDS);
}
