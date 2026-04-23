"use client";

import type { HeatmapData } from "@/lib/types";

type Props = { data: HeatmapData };

export function Heatmap({ data }: Props) {
  const { cols, rows, grid } = data;

  return (
    <div
      aria-hidden
      className="absolute inset-0 grid pointer-events-none overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {grid.map((count, i) => {
        if (count === 0) return <div key={i} />;
        const intensity = Math.min(count / 4, 1);
        const size = 170 + intensity * 70;
        const alpha = 0.3 + intensity * 0.45;
        return (
          <div
            key={i}
            className="relative flex items-center justify-center overflow-visible"
          >
            <div
              className="absolute rounded-full"
              style={{
                width: `${size}%`,
                aspectRatio: "1 / 1",
                background: `radial-gradient(circle, rgba(255, 220, 90, ${alpha}) 0%, rgba(255, 220, 90, 0) 65%)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
