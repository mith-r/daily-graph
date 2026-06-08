import { hashString } from "./rng";

// Map -1..1 → 0..100 (percent). x grows left→right, y grows bottom→top, so invert y for CSS top.
export function toPct(v: number, invert = false): number {
  const clamped = Math.max(-1, Math.min(1, v));
  const pct = ((clamped + 1) / 2) * 100;
  return invert ? 100 - pct : pct;
}

// Curated palette of vibrant [hue, saturation, lightness] triples, hand-tuned
// to stay distinct and pop on the navy background. Spans warm reds/oranges,
// pinks/magentas, purples, blues, cyans/teals, and greens. Deliberately omits
// very dark navy-adjacent blues (would blend into the bg) and pure gold near
// #ffdc5a (reserved for celebrity dots / the heatmap warm tone).
const PALETTE: [number, number, number][] = [
  [354, 85, 64], // red
  [12, 88, 60], // coral
  [28, 92, 58], // orange
  [45, 90, 60], // amber
  [80, 70, 58], // lime
  [140, 68, 52], // green
  [160, 72, 50], // emerald
  [175, 75, 52], // teal
  [190, 82, 56], // cyan
  [205, 88, 60], // sky blue
  [222, 88, 66], // blue
  [255, 78, 70], // indigo
  [270, 72, 68], // violet
  [288, 75, 66], // purple
  [312, 80, 64], // magenta
  [330, 85, 66], // pink
  [342, 88, 68], // rose
  [102, 64, 54], // chartreuse
];

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Render a palette slot to an hsl() string. With jitter (the default), applies
// a small per-user offset (independent hash bit-slices) so two users on the
// SAME slot still differ. Set-aware assignment turns jitter off for distinct
// slots — there it would only push already-separated colors back together.
function paletteColor(slot: number, hash: number, jitter = true): string {
  const [h, s, l] = PALETTE[slot];
  if (!jitter) return `hsl(${h} ${s}% ${l}%)`;
  const hueJitter = ((hash >>> 8) % 17) - 8; // ±8°
  const lightJitter = ((hash >>> 16) % 13) - 6; // ±6%
  return `hsl(${h + hueJitter} ${s}% ${clamp(l + lightJitter, 45, 78)}%)`;
}

// Circular distance between two hues, in degrees (0..180).
function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

// Stable, deterministic per-user color. Used as a fallback wherever the set of
// peers isn't known (e.g. "me", or an id missing from an assignColors() map).
// Prefer assignColors() when rendering a group so colors are spread apart.
export function colorFor(userId: string): string {
  const hash = hashString(userId);
  return paletteColor(hash % PALETTE.length, hash);
}

// Assign each user a palette color chosen across the WHOLE set, so colors are
// spread as far apart as possible — two friends in the same graph won't both
// end up as near-identical blues (which per-user hashing can't prevent).
// Deterministic for a given set of ids regardless of input order, with the
// usual per-user jitter for variety. Degrades gracefully (reuses the most
// distant slots) when there are more users than palette entries.
export function assignColors(userIds: string[]): Map<string, string> {
  const map = new Map<string, string>();
  // Dedupe + order by hash so the assignment is stable for a given set.
  const ordered = Array.from(new Set(userIds)).sort(
    (a, b) => hashString(a) - hashString(b)
  );
  const usedSlots = new Set<number>();
  const usedHues: number[] = [];
  for (const id of ordered) {
    const hash = hashString(id);
    const pref = hash % PALETTE.length;
    // Until every slot is taken, only consider unused slots; after that allow
    // reuse so large groups still get the most-distant available color.
    const candidates = PALETTE.map((_, s) => s).filter(
      (s) => usedSlots.size >= PALETTE.length || !usedSlots.has(s)
    );
    let bestSlot = candidates[0];
    let bestScore = -Infinity;
    for (const s of candidates) {
      const minDist = usedHues.length
        ? Math.min(...usedHues.map((u) => hueDist(PALETTE[s][0], u)))
        : 360;
      // Maximize distance from already-used hues; break ties toward the user's
      // own preferred slot so the first/only user keeps its hash color.
      const score = minDist + (s === pref ? 0.5 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestSlot = s;
      }
    }
    // Only reused slots (groups larger than the palette) need jitter to stay
    // distinct; distinct slots are already spread, so render them jitter-free.
    const reused = usedSlots.has(bestSlot);
    usedSlots.add(bestSlot);
    usedHues.push(PALETTE[bestSlot][0]);
    map.set(id, paletteColor(bestSlot, hash, reused));
  }
  return map;
}
