"use client";

import type { HeatmapData } from "@/lib/types";

type Props = { data: HeatmapData };

export function Heatmap({ data }: Props) {
  const { cols, rows, grid, max } = data;
  const safeMax = Math.max(max, 1);

  return (
    <div
      aria-hidden
      className="absolute inset-0 grid pointer-events-none"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {grid.map((count, i) => {
        if (count === 0) return <div key={i} />;
        const intensity = count / safeMax;
        const sizePct = 35 + intensity * 65;
        const opacity = 0.35 + intensity * 0.5;
        return (
          <div key={i} className="flex items-center justify-center">
            <div
              className="rounded-full"
              style={{
                width: `${sizePct}%`,
                aspectRatio: "1 / 1",
                background: `rgba(255, 220, 90, ${opacity})`,
                boxShadow: `0 0 10px rgba(255, 220, 90, ${opacity * 0.6})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
