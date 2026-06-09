import "server-only";
import { getRedis } from "./redis";

// All registered APNs device tokens live in one Redis set; the daily cron
// fans out to every member. A parallel hash maps token → userId so stale
// tokens can be traced/cleaned if needed.
const TOKENS_KEY = "push:ios:tokens";
const TOKEN_OWNERS_KEY = "push:ios:token-owners";

export async function addPushToken(
  token: string,
  userId: string
): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.sadd(TOKENS_KEY, token),
    redis.hset(TOKEN_OWNERS_KEY, { [token]: userId }),
  ]);
}

export async function removePushToken(token: string): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.srem(TOKENS_KEY, token),
    redis.hdel(TOKEN_OWNERS_KEY, token),
  ]);
}

export async function getAllPushTokens(): Promise<string[]> {
  const redis = getRedis();
  return (await redis.smembers(TOKENS_KEY)) as string[];
}
