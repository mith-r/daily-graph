"use client";

import { hashString } from "@/lib/rng";

type Props = {
  x: number; // -1..1
  y: number; // -1..1
  label: string;
  userId: string;
  isMe?: boolean;
};

// Map -1..1 → 0..100 (percent). x grows left→right, y grows bottom→top, so invert y for CSS top.
function toPct(v: number, invert = false): number {
  const clamped = Math.max(-1, Math.min(1, v));
  const pct = ((clamped + 1) / 2) * 100;
  return invert ? 100 - pct : pct;
}

function colorFor(userId: string): string {
  const hue = hashString(userId) % 360;
  return `hsl(${hue} 70% 60%)`;
}

export function Dot({ x, y, label, userId, isMe }: Props) {
  const left = `${toPct(x)}%`;
  const top = `${toPct(y, true)}%`;
  const color = isMe ? "white" : colorFor(userId);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none animate-in fade-in duration-500"
      style={{ left, top }}
    >
      <div
        className={`rounded-full ${isMe ? "w-4 h-4 ring-2 ring-white/80" : "w-3 h-3"}`}
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />
      <div className="mt-1 text-xs text-white/80 max-w-[5rem] truncate sm:max-w-none sm:whitespace-nowrap">
        {isMe ? `${label} (you)` : label}
      </div>
    </div>
  );
}
