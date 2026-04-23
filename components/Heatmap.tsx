"use client";

import type { HeatmapData } from "@/lib/types";

type Props = { data: HeatmapData };

export function Heatmap({ data }: Props) {
  const { cols, rows, grid, max } = data;

  return (
    <div
      aria-hidden
      className="absolute inset-0 grid pointer-events-none"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {grid.map((count, i) => (
        <div
          key={i}
          style={{
            background:
              count > 0
                ? `rgba(255, 220, 90, ${0.15 + (count / Math.max(max, 1)) * 0.55})`
                : "transparent",
          }}
        />
      ))}
    </div>
  );
}
