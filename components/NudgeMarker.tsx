"use client";

import { colorFor, toPct } from "@/lib/graph";

type Props = {
  x: number; // -1..1
  y: number; // -1..1
  nudgerUserId: string;
  // Set-aware color from assignColors(); falls back to colorFor(nudgerUserId).
  color?: string;
};

export function NudgeMarker({ x, y, nudgerUserId, color: colorProp }: Props) {
  const left = `${toPct(x)}%`;
  const top = `${toPct(y, true)}%`;
  const color = colorProp ?? colorFor(nudgerUserId);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
      style={{
        left,
        top,
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        opacity: 0.75,
      }}
    />
  );
}
