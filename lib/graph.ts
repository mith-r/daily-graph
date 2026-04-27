import { hashString } from "./rng";

// Map -1..1 → 0..100 (percent). x grows left→right, y grows bottom→top, so invert y for CSS top.
export function toPct(v: number, invert = false): number {
  const clamped = Math.max(-1, Math.min(1, v));
  const pct = ((clamped + 1) / 2) * 100;
  return invert ? 100 - pct : pct;
}

export function colorFor(userId: string): string {
  const hue = hashString(userId) % 360;
  return `hsl(${hue} 70% 60%)`;
}
