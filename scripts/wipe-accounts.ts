// One-off: delete every user record and placement hash from the Upstash Redis.
// Run with: npx tsx --env-file=.env.local scripts/wipe-accounts.ts
async function main() {
  const { Redis } = await import("@upstash/redis");

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Redis env vars missing. Load .env.local first.");
  }
  const redis = new Redis({ url, token });

  async function collectKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      keys.push(...batch);
      cursor = next;
    } while (cursor !== "0");
    return keys;
  }

  const userKeys = await collectKeys("user:*");
  const placementKeys = await collectKeys("placements:*");
  const all = [...userKeys, ...placementKeys];
  console.log(
    `Found ${userKeys.length} user keys, ${placementKeys.length} placement keys.`
  );
  for (const k of all) console.log(`  - ${k}`);

  if (all.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const chunkSize = 50;
  for (let i = 0; i < all.length; i += chunkSize) {
    const chunk = all.slice(i, i + chunkSize);
    await redis.del(...chunk);
  }
  console.log(`Deleted ${all.length} keys.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
