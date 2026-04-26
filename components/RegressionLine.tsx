"use client";

import type { LineSegment } from "@/lib/regression";

type Props = { segment: LineSegment };

export function RegressionLine({ segment }: Props) {
  const toX = (x: number) => `${((x + 1) / 2) * 100}%`;
  const toY = (y: number) => `${((1 - y) / 2) * 100}%`;
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    >
      <line
        x1={toX(segment.x1)}
        y1={toY(segment.y1)}
        x2={toX(segment.x2)}
        y2={toY(segment.y2)}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
