import "server-only";
import { getRedis } from "./redis";
import { setPlacement } from "./placements";
import { setNudge } from "./nudges";
import { ensureDebugUser } from "./users";
import { todayKey } from "./date";
import { hashString, mulberry32 } from "./rng";
import type { User } from "./types";

const FRIEND_COUNT = 12;
const CROWD_COUNT = 26;
const INCOMING_NUDGES = 6;
const OUTGOING_NUDGES = 5;
// Friend-on-friend nudges so focusing a friend shows "who moved them".
const INTER_NUDGES = 10;
const INCOMING_REQUESTS = 4;

const DEMO_NAMES = [
  "Alex",
  "Sam",
  "Maya",
  "Jordan",
  "Riley",
  "Casey",
  "Avery",
  "Morgan",
  "Quinn",
  "Taylor",
  "Jamie",
  "Parker",
  "Nina",
  "Theo",
  "Priya",
  "Mateo",
  "Leah",
  "Noah",
  "Iris",
  "Miles",
  "Zoe",
  "Kai",
  "Elena",
  "Owen",
  "Sofia",
  "Amir",
  "Ruby",
  "Jules",
  "Lena",
  "Andre",
  "Tessa",
  "Finn",
  "Mina",
  "Rowan",
  "Harper",
  "Sage",
  "Esme",
  "Caleb",
  "Nora",
  "Dario",
] as const;

type XY = { x: number; y: number };
type NudgeXY = { dx: number; dy: number };

// Demo data for the in-memory dev stub so the graph is dense enough to debug:
// the Debug User plus a larger friend cast, background crowd placements for the
// Everyone heatmap, and obvious nudge lines in both directions.
//
// Only invoked from instrumentation.ts when USE_IN_MEMORY_REDIS=1.

function usernameFor(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function seededXY(id: string): XY {
  const rand = mulberry32(hashString(id));
  return {
    x: rand() * 2 - 1,
    y: rand() * 2 - 1,
  };
}

function maxTravelFrom(from: XY, angle: number): number {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const xLimit =
    ux > 0 ? (1 - from.x) / ux : ux < 0 ? (-1 - from.x) / ux : Infinity;
  const yLimit =
    uy > 0 ? (1 - from.y) / uy : uy < 0 ? (-1 - from.y) / uy : Infinity;
  return Math.max(0, Math.min(xLimit, yLimit));
}

function seededNudge(seed: string, from: XY, angleBase?: number): NudgeXY {
  const rand = mulberry32(hashString(seed));
  const initialAngle =
    angleBase === undefined
      ? rand() * Math.PI * 2
      : angleBase + (rand() - 0.5) * 0.45;

  let angle = initialAngle;
  let travel = maxTravelFrom(from, angle);
  for (let i = 1; i < 8; i++) {
    const candidate = initialAngle + (Math.PI / 4) * i;
    const candidateTravel = maxTravelFrom(from, candidate);
    if (candidateTravel > travel) {
      angle = candidate;
      travel = candidateTravel;
    }
  }

  const magnitude = Math.min(0.3 + rand() * 0.25, travel * 0.92);
  return {
    dx: Math.cos(angle) * magnitude,
    dy: Math.sin(angle) * magnitude,
  };
}

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
    // Verified so demo users never hit the email-verification gate.
    emailVerifiedAt: Date.now(),
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
  const demoUsers = await Promise.all(
    DEMO_NAMES.slice(0, FRIEND_COUNT + CROWD_COUNT).map((displayName) => {
      const username = usernameFor(displayName);
      return seedUser(`demo-${username}`, username, displayName);
    })
  );
  const friends = demoUsers.slice(0, FRIEND_COUNT);
  const crowd = demoUsers.slice(FRIEND_COUNT);

  // Mutual friendships so the demo users show up in the Debug User's graph.
  await redis.sadd(
    `user:${me.id}:friends`,
    friends[0].id,
    ...friends.slice(1).map((friend) => friend.id)
  );
  await Promise.all(
    friends.map((friend) => redis.sadd(`user:${friend.id}:friends`, me.id))
  );

  // Crowd↔friend friendships so the Add-friends suggestions have a real
  // mutual-friend spread to rank: crowd member i shares min(max(i - 6, 0), 12)
  // friends with the Debug User — some 0-mutual padding, a full 1..12 ladder,
  // and a cluster of ties at the top.
  await Promise.all(
    crowd.flatMap((member, i) => {
      const shared = friends.slice(0, Math.max(0, Math.min(i - 6, FRIEND_COUNT)));
      return shared.flatMap((friend) => [
        redis.sadd(`user:${member.id}:friends`, friend.id),
        redis.sadd(`user:${friend.id}:friends`, member.id),
      ]);
    })
  );

  const date = todayKey();
  const now = Date.now();
  await Promise.all([
    setPlacement(date, {
      userId: me.id,
      displayName: me.displayName,
      x: 0,
      y: 0,
      createdAt: now,
    }),
    ...demoUsers.map((user) => {
      const xy = seededXY(user.id);
      return setPlacement(date, {
        userId: user.id,
        displayName: user.displayName,
        x: xy.x,
        y: xy.y,
        createdAt: now,
      });
    }),
  ]);

  const incomingFriends = friends.slice(0, INCOMING_NUDGES);
  const outgoingFriends = friends
    .slice(INCOMING_NUDGES)
    .slice(0, OUTGOING_NUDGES);
  await Promise.all([
    ...incomingFriends.map((friend, i) => {
      const nudge = seededNudge(
        `incoming:${date}:${friend.id}`,
        { x: 0, y: 0 },
        (Math.PI * 2 * i) / incomingFriends.length
      );
      return setNudge(date, me.id, {
        nudgerUserId: friend.id,
        dx: nudge.dx,
        dy: nudge.dy,
        createdAt: now,
      });
    }),
    ...outgoingFriends.map((friend, i) => {
      const from = seededXY(friend.id);
      const nudge = seededNudge(
        `outgoing:${date}:${friend.id}`,
        from,
        (Math.PI * 2 * i) / outgoingFriends.length + Math.PI / 6
      );
      return setNudge(date, friend.id, {
        nudgerUserId: me.id,
        dx: nudge.dx,
        dy: nudge.dy,
        createdAt: now,
      });
    }),
  ]);

  // Friend-on-friend nudges: a handful of friends move a handful of other
  // friends, so focusing a friend reveals "who moved them" with several arrows.
  await Promise.all(
    Array.from({ length: INTER_NUDGES }, (_, i) => {
      const target = friends[i % FRIEND_COUNT];
      const nudger = friends[(i * 5 + 3) % FRIEND_COUNT];
      if (nudger.id === target.id) return null;
      const from = seededXY(target.id);
      const nudge = seededNudge(`inter:${date}:${nudger.id}:${target.id}`, from);
      return setNudge(date, target.id, {
        nudgerUserId: nudger.id,
        dx: nudge.dx,
        dy: nudge.dy,
        createdAt: now,
      });
    }).filter((p): p is Promise<void> => p !== null)
  );

  const requesters = crowd.slice(0, INCOMING_REQUESTS);
  await Promise.all([
    redis.sadd(
      `user:${me.id}:incoming`,
      requesters[0].id,
      ...requesters.slice(1).map((user) => user.id)
    ),
    ...requesters.map((user) => redis.sadd(`user:${user.id}:outgoing`, me.id)),
  ]);

  // Pre-ignore one high-mutual non-requester so "hidden from suggestions but
  // still findable via search" is demoable out of the box.
  await redis.sadd(
    `user:${me.id}:ignored-suggestions`,
    crowd[crowd.length - 1].id
  );

  console.log(`[devSeed] seeded demo data for ${date}`);
}
