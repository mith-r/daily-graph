import { Redis } from "@upstash/redis";
import { getMemoryRedis } from "./memoryRedis";

// Dev-only escape hatch: with USE_IN_MEMORY_REDIS=1, back the app with an
// ephemeral in-process store instead of a real Upstash database. Never set this
// in production.
const useMemory = process.env.USE_IN_MEMORY_REDIS === "1";

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

if (!useMemory && (!url || !token)) {
  console.warn("Upstash Redis env vars missing; /api calls will fail at runtime.");
}

const _redis: Redis | null = useMemory
  ? (getMemoryRedis() as unknown as Redis)
  : url && token
    ? new Redis({ url, token })
    : null;

export function getRedis(): Redis {
  if (!_redis) throw new Error("Redis not configured");
  return _redis;
}
