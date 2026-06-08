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
      <div
        className={`mt-1 text-xs max-w-[5rem] truncate sm:max-w-none sm:whitespace-nowrap select-none pointer-events-none ${
          isCelebrity ? "text-amber-200/90" : "text-white/80"
        }`}
      >
        {isMe ? `${label} (you)` : isCelebrity ? `✨ ${label}` : label}
      </div>
    </div>
  );
}
