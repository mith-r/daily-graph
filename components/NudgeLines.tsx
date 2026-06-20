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
      // Stretch the -1..1 box to fill the (possibly non-square) canvas instead of
      // letterboxing it (the SVG default, xMidYMid meet). The dots/markers are
      // positioned with CSS percentages that fill the full rectangle, so the line
      // layer must stretch the same way to actually touch both endpoints. Stroke
      // width is unaffected thanks to vectorEffect="non-scaling-stroke" below.
      preserveAspectRatio="none"
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
