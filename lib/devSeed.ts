import "server-only";
import { getRedis } from "./redis";
import { setPlacement } from "./placements";
import { setNudge } from "./nudges";
import { ensureDebugUser } from "./users";
import { DEBUG_USER } from "./debug";
import { todayKey } from "./date";
import type { User } from "./types";

// Demo data for the in-memory dev stub so the graph isn't empty on first load:
// the Debug User plus two friends, all placed today, with nudges in BOTH
// directions so the "your nudges" and "how your friends moved you" lines are
// both visible (handy for eyeballing the Dot/line-alignment fix).
//
// Only invoked from instrumentation.ts when USE_IN_MEMORY_REDIS=1.

async function seedUser(
  id: string,
  username: string,
  displayName: string
): Promise<User> {
  const redis = getRedis();
  const user: User = {
    id,
    email: `${username}@example.com`,
    username,
    displayName,
    passwordHash: "",
    createdAt: Date.now(),
  };
  await redis.set(`user:${id}`, user);
  await redis.set(`user:email:${user.email}`, id);
  await redis.set(`user:username:${username}`, id);
  await redis.sadd("users:all", id);
  return user;
}

export async function seedDemoData(): Promise<void> {
  const redis = getRedis();
  const me = await ensureDebugUser();
  const alex = await seedUser("demo-alex", "alex", "Alex");
  const sam = await seedUser("demo-sam", "sam", "Sam");

  // Mutual friendships so the demo users show up in the Debug User's graph.
  await redis.sadd(`user:${me.id}:friends`, alex.id, sam.id);
  await redis.sadd(`user:${alex.id}:friends`, me.id);
  await redis.sadd(`user:${sam.id}:friends`, me.id);

  const date = todayKey();
  const now = Date.now();
  await setPlacement(date, {
    userId: me.id,
    displayName: me.displayName,
    x: 0,
    y: 0,
    createdAt: now,
  });
  await setPlacement(date, {
    userId: alex.id,
    displayName: alex.displayName,
    x: 0.5,
    y: 0.4,
    createdAt: now,
  });
  await setPlacement(date, {
    userId: sam.id,
    displayName: sam.displayName,
    x: -0.45,
    y: 0.55,
    createdAt: now,
  });

  // Alex nudged ME → renders a "how your friends moved you" line from my dot.
  await setNudge(date, me.id, {
    nudgerUserId: alex.id,
    dx: 0.3,
    dy: 0.25,
    createdAt: now,
  });
  // I nudged Sam → renders my nudge line from Sam's dot.
  await setNudge(date, sam.id, {
    nudgerUserId: me.id,
    dx: -0.2,
    dy: -0.15,
    createdAt: now,
  });

  console.log(`[devSeed] seeded demo data for ${date}`);
}
