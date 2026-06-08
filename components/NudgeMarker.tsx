"use client";

import { colorFor, toPct } from "@/lib/graph";

type Props = {
  x: number; // -1..1
  y: number; // -1..1
  nudgerUserId: string;
  dimmed?: boolean;
  focused?: boolean;
};

export function NudgeMarker({ x, y, nudgerUserId, dimmed, focused }: Props) {
  const left = `${toPct(x)}%`;
  const top = `${toPct(y, true)}%`;
  const color = colorFor(nudgerUserId);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none transition-opacity duration-200"
      style={{
        left,
        top,
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        opacity: dimmed ? 0.15 : focused ? 1 : 0.75,
      }}
    />
  );
}
