"use client";

export type NudgeLine = {
  id: string; // stable key, e.g. `out-${friendId}` / `in-${nudgerId}`
  fromX: number; // -1..1
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  opacity?: number;
  focused?: boolean; // emphasize (brighter + thicker) — set while a dot is focused
};

type Props = {
  lines: NudgeLine[];
};

// SVG overlay over the graph canvas. viewBox spans -1..1 to match the placement
// coordinate system. y is inverted (negated) when plotted because SVG y grows
// downward while our canvas y grows upward.
export function NudgeLines({ lines }: Props) {
  if (lines.length === 0) return null;
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="-1 -1 2 2"
    >
      {lines.map((l) => {
        const base = l.opacity ?? 0.4;
        const opacity = l.focused ? Math.min(1, base + 0.4) : base;
        return (
          <line
            key={l.id}
            x1={l.fromX}
            y1={-l.fromY}
            x2={l.toX}
            y2={-l.toY}
            stroke={l.color}
            strokeOpacity={opacity}
            strokeWidth={l.focused ? 2 : 1}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
