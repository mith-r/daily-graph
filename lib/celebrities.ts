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

// The pool is intentionally large (60) so the "Everyone" graph stays fresh:
// a rotating window slides through it each day, so consecutive days share no
// one while the daily cast size still varies.
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
  { id: "celeb:the-weeknd", displayName: "The Weeknd" },
  { id: "celeb:olivia-rodrigo", displayName: "Olivia Rodrigo" },
  { id: "celeb:harry-styles", displayName: "Harry Styles" },
  { id: "celeb:dua-lipa", displayName: "Dua Lipa" },
  { id: "celeb:rihanna", displayName: "Rihanna" },
  { id: "celeb:kendrick-lamar", displayName: "Kendrick Lamar" },
  { id: "celeb:sza", displayName: "SZA" },
  { id: "celeb:post-malone", displayName: "Post Malone" },
  { id: "celeb:doja-cat", displayName: "Doja Cat" },
  { id: "celeb:lana-del-rey", displayName: "Lana Del Rey" },
  { id: "celeb:bruno-mars", displayName: "Bruno Mars" },
  { id: "celeb:lady-gaga", displayName: "Lady Gaga" },
  { id: "celeb:adele", displayName: "Adele" },
  { id: "celeb:ed-sheeran", displayName: "Ed Sheeran" },
  { id: "celeb:tyler-the-creator", displayName: "Tyler, the Creator" },
  { id: "celeb:chappell-roan", displayName: "Chappell Roan" },
  { id: "celeb:karol-g", displayName: "Karol G" },
  { id: "celeb:shakira", displayName: "Shakira" },
  { id: "celeb:margot-robbie", displayName: "Margot Robbie" },
  { id: "celeb:ryan-gosling", displayName: "Ryan Gosling" },
  { id: "celeb:florence-pugh", displayName: "Florence Pugh" },
  { id: "celeb:tom-holland", displayName: "Tom Holland" },
  { id: "celeb:sydney-sweeney", displayName: "Sydney Sweeney" },
  { id: "celeb:austin-butler", displayName: "Austin Butler" },
  { id: "celeb:jenna-ortega", displayName: "Jenna Ortega" },
  { id: "celeb:cillian-murphy", displayName: "Cillian Murphy" },
  { id: "celeb:anya-taylor-joy", displayName: "Anya Taylor-Joy" },
  { id: "celeb:keanu-reeves", displayName: "Keanu Reeves" },
  { id: "celeb:ryan-reynolds", displayName: "Ryan Reynolds" },
  { id: "celeb:emma-stone", displayName: "Emma Stone" },
  { id: "celeb:denzel-washington", displayName: "Denzel Washington" },
  { id: "celeb:jacob-elordi", displayName: "Jacob Elordi" },
  { id: "celeb:serena-williams", displayName: "Serena Williams" },
  { id: "celeb:lionel-messi", displayName: "Lionel Messi" },
  { id: "celeb:cristiano-ronaldo", displayName: "Cristiano Ronaldo" },
  { id: "celeb:stephen-curry", displayName: "Stephen Curry" },
  { id: "celeb:simone-biles", displayName: "Simone Biles" },
  { id: "celeb:patrick-mahomes", displayName: "Patrick Mahomes" },
  { id: "celeb:coco-gauff", displayName: "Coco Gauff" },
  { id: "celeb:shohei-ohtani", displayName: "Shohei Ohtani" },
  { id: "celeb:kylie-jenner", displayName: "Kylie Jenner" },
  { id: "celeb:elon-musk", displayName: "Elon Musk" },
  { id: "celeb:mrbeast", displayName: "MrBeast" },
  { id: "celeb:oprah-winfrey", displayName: "Oprah Winfrey" },
  { id: "celeb:snoop-dogg", displayName: "Snoop Dogg" },
  { id: "celeb:gordon-ramsay", displayName: "Gordon Ramsay" },
];

// How many of the pool appear on any given day. A small deterministic range
// keeps the "Everyone" graph feeling fresh without making the board too busy.
const MIN_DAILY_CAST_SIZE = 4;
const MAX_DAILY_CAST_SIZE = 8;

if (MAX_DAILY_CAST_SIZE * 2 > CELEBRITIES.length) {
  throw new Error("Celebrity pool must be at least twice the max daily cast size");
}

// Stable, date-independent shuffle of the full pool — same order forever, but
// not alphabetical, so the daily groupings look arbitrary. Sorting by a fixed
// per-id hash is enough to scramble the list deterministically.
const ORDERED = [...CELEBRITIES].sort(
  (a, b) => hashString(`order:${a.id}`) - hashString(`order:${b.id}`)
);

// Whole days since the Unix epoch for a "YYYY-MM-DD" key. UTC math on the
// canonical date string — no tz drift, since dateKey is already the app's
// agreed-upon calendar day (see lib/date.ts).
function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function dateKeyFromDayNumber(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

function dailyCastSize(dateKey: string): number {
  const range = MAX_DAILY_CAST_SIZE - MIN_DAILY_CAST_SIZE + 1;
  return MIN_DAILY_CAST_SIZE + (hashString(`cast-size:${dateKey}`) % range);
}

function castStartIndex(dateKey: string, poolSize: number): number {
  const today = dayNumber(dateKey);
  let start = 0;

  if (today >= 0) {
    for (let day = 0; day < today; day++) {
      start = (start + dailyCastSize(dateKeyFromDayNumber(day))) % poolSize;
    }
  } else {
    for (let day = -1; day >= today; day--) {
      start =
        (start - dailyCastSize(dateKeyFromDayNumber(day)) + poolSize) %
        poolSize;
    }
  }

  return start;
}

// Today's celebrity placements. Deterministic per date: a date-sized window
// slides through the stable ordering, and each member's (x, y) is seeded by the
// date. Because each day starts after the previous day's window, consecutive
// days never share a name (including across the wrap). Everyone sees the same
// thing all day; it rotates tomorrow.
export function getCelebrityPlacements(dateKey: string): Placement[] {
  const n = ORDERED.length;
  const size = dailyCastSize(dateKey);
  const start = castStartIndex(dateKey, n);
  const cast = Array.from(
    { length: size },
    (_, i) => ORDERED[(start + i) % n]
  );

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
