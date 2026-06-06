import "server-only";
import { hashString, mulberry32 } from "./rng";
import type { Placement } from "./types";

// Parody celebrity personas rendered on the "Everyone" graph. These are NOT
// real users — they never log in, get friended, or nudge, so they live as a
// static list here rather than in Redis. Their daily positions are generated
// deterministically (see getCelebrityPlacements), so everyone sees the same
// placements all day and a fresh cast tomorrow — no cron, no writes.
//
// Parody only: rendered with real names but unaffiliated and randomly placed.
// See the disclaimer in the site footer (app/layout.tsx).
type Celebrity = { id: string; displayName: string };

export const CELEBRITIES: Celebrity[] = [
  { id: "celeb:taylor-swift", displayName: "Taylor Swift" },
  { id: "celeb:beyonce", displayName: "Beyoncé" },
  { id: "celeb:drake", displayName: "Drake" },
  { id: "celeb:bad-bunny", displayName: "Bad Bunny" },
  { id: "celeb:sabrina-carpenter", displayName: "Sabrina Carpenter" },
  { id: "celeb:travis-kelce", displayName: "Travis Kelce" },
  { id: "celeb:zendaya", displayName: "Zendaya" },
  { id: "celeb:timothee-chalamet", displayName: "Timothée Chalamet" },
  { id: "celeb:dwayne-johnson", displayName: "Dwayne Johnson" },
  { id: "celeb:kim-kardashian", displayName: "Kim Kardashian" },
  { id: "celeb:lebron-james", displayName: "LeBron James" },
  { id: "celeb:billie-eilish", displayName: "Billie Eilish" },
  { id: "celeb:ariana-grande", displayName: "Ariana Grande" },
  { id: "celeb:pedro-pascal", displayName: "Pedro Pascal" },
];

// How many of the pool appear on any given day. A rotating subset keeps the
// "Everyone" graph feeling fresh — a reason to check back daily.
const DAILY_CAST_SIZE = 6;

// Today's celebrity placements. Deterministic per date: the cast (which subset
// shows) and each member's (x, y) are both seeded by the date, so every viewer
// sees the same thing all day and it rotates tomorrow.
export function getCelebrityPlacements(dateKey: string): Placement[] {
  const cast = [...CELEBRITIES]
    .sort(
      (a, b) =>
        hashString(`cast:${dateKey}:${a.id}`) -
        hashString(`cast:${dateKey}:${b.id}`)
    )
    .slice(0, DAILY_CAST_SIZE);

  return cast.map((c) => {
    const rand = mulberry32(hashString(`${c.id}:${dateKey}`));
    return {
      userId: c.id,
      displayName: c.displayName,
      x: rand() * 2 - 1, // -1..1
      y: rand() * 2 - 1, // -1..1
      createdAt: 0, // synthetic; celebrities aren't stored per-day
    };
  });
}
