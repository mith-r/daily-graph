"use client";

import { toPct } from "@/lib/graph";
import type { LineSegment } from "@/lib/regression";

type Props = { segment: LineSegment };

export function RegressionLine({ segment }: Props) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    >
      <line
        x1={`${toPct(segment.x1)}%`}
        y1={`${toPct(segment.y1, true)}%`}
        x2={`${toPct(segment.x2)}%`}
        y2={`${toPct(segment.y2, true)}%`}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1"
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
