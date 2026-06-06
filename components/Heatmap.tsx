"use client";

import type { HeatmapData } from "@/lib/types";

type Props = { data: HeatmapData };

const KERNEL_RADIUS = 2;

function computeDensity(
  grid: number[],
  cols: number,
  rows: number
): number[] {
  const density = new Array(cols * rows).fill(0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r * cols + c] === 0) continue;
      let sum = 0;
      for (let dr = -KERNEL_RADIUS; dr <= KERNEL_RADIUS; dr++) {
        for (let dc = -KERNEL_RADIUS; dc <= KERNEL_RADIUS; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          const dist2 = dr * dr + dc * dc;
          const weight = Math.exp(-dist2 / 2);
          sum += grid[rr * cols + cc] * weight;
        }
      }
      density[r * cols + c] = sum;
    }
  }
  return density;
}

export function Heatmap({ data }: Props) {
  const { cols, rows, grid } = data;
  const density = computeDensity(grid, cols, rows);

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
        // Density always includes the cell itself (weight 1), so subtract that so a lone dot starts at 0.
        const neighbors = Math.max(density[i] - 1, 0);
        const intensity = Math.min(neighbors / 3, 1);
        const size = 50 + intensity * 200;
        const alpha = 0.2 + intensity * 0.5;
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
