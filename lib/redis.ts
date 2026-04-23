import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.warn("Upstash Redis env vars missing; /api calls will fail at runtime.");
}

const _redis = url && token ? new Redis({ url, token }) : null;

export function getRedis(): Redis {
  if (!_redis) throw new Error("Redis not configured");
  return _redis;
}
