"use client";

import { colorFor, toPct } from "@/lib/graph";
import { useLongPress } from "@/lib/useLongPress";

type Props = {
  x: number; // -1..1
  y: number; // -1..1
  label: string;
  userId: string;
  // Set-aware color from assignColors(); falls back to colorFor(userId) when
  // omitted. Ignored for "me" (white) and celebrities (gold).
  color?: string;
  isMe?: boolean;
  isCelebrity?: boolean;
  onLongPressStart?: (clientX: number, clientY: number) => void;
  beingNudged?: boolean;
};

// Gold accent shared by all celebrity dots so they read as a distinct class,
// not as friends. Matches the heatmap's warm tone (rgba(255, 220, 90)).
const CELEB_GOLD = "#ffdc5a";

// A label renders below its dot by default. Flip it ABOVE only in the two
// narrow zones where "below" looks wrong:
//   • Just above the center x-axis: a below-label crosses the axis line into
//     the busy center. Flipping up makes labels splay away from the axis.
const LABEL_FLIP_ABOVE_AXIS = 0.12; // y in (0, 0.12]  → flip up
//   • Near the bottom edge: a below-label spills outside the box and clips.
const LABEL_FLIP_NEAR_BOTTOM = -0.85; // y <= -0.85    → flip up

export function Dot({
  x,
  y,
  label,
  userId,
  color: colorProp,
  isMe,
  isCelebrity,
  onLongPressStart,
  beingNudged,
}: Props) {
  const left = `${toPct(x)}%`;
  const top = `${toPct(y, true)}%`;
  // Flip the label above the dot when rendering it below would cross the center
  // x-axis or spill past the bottom edge. Stays absolutely positioned either
  // way, so it adds zero wrapper height (keeps the dot centered on its coord).
  const labelAbove =
    (y > 0 && y <= LABEL_FLIP_ABOVE_AXIS) || y <= LABEL_FLIP_NEAR_BOTTOM;
  const color = isMe
    ? "white"
    : isCelebrity
      ? CELEB_GOLD
      : colorProp ?? colorFor(userId);
  const interactive = !!onLongPressStart;

  const handlers = useLongPress((e) => {
    onLongPressStart?.(e.clientX, e.clientY);
  });

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in fade-in duration-500"
      style={{ left, top }}
    >
      <div className="relative">
        {/* Visible dot. Stays small visually; the hit area below is what's
            actually pressed. */}
        <div
          className={`rounded-full transition-transform duration-150 ${
            isMe
              ? "w-4 h-4 ring-2 ring-white/80"
              : isCelebrity
                ? "w-3.5 h-3.5 ring-2 ring-amber-300/70"
                : "w-3 h-3"
          } ${
            beingNudged
              ? "scale-[1.6] ring-2 ring-white shadow-lg"
              : ""
          }`}
          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
        />
        {/* 44px invisible hit area centered on the dot. Absolute positioning
            so it doesn't push the label down. Only present for interactive
            (friend) dots. */}
        {interactive && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11"
            style={{
              touchAction: "none",
              WebkitTouchCallout: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor: beingNudged ? "grabbing" : "grab",
            }}
            {...handlers}
          />
        )}
      </div>
      {/* Label is absolutely positioned (below the dot by default, above it
          when labelAbove) so it doesn't add to the wrapper's height —
          otherwise -translate-y-1/2 would center the dot+label box and push
          the dot off its true coordinate, making the nudge lines stop short
          of the dot. */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 text-center text-xs max-w-[5rem] truncate sm:max-w-none sm:whitespace-nowrap select-none pointer-events-none ${
          labelAbove ? "bottom-full mb-1" : "top-full mt-1"
        } ${isCelebrity ? "text-amber-200/90" : "text-white/80"}`}
      >
        {isMe ? `${label} (you)` : isCelebrity ? `✨ ${label}` : label}
      </div>
    </div>
  );
}
