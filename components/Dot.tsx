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
  onTap?: () => void;
  beingNudged?: boolean;
  // Something else is focused, so this dot fades back.
  dimmed?: boolean;
  // This dot is the current focus target.
  focused?: boolean;
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
  onTap,
  beingNudged,
  dimmed,
  focused,
}: Props) {
  const left = `${toPct(x)}%`;
  const top = `${toPct(y, true)}%`;
  const color = isMe
    ? "white"
    : isCelebrity
      ? CELEB_GOLD
      : colorProp ?? colorFor(userId);
  const interactive = !!onLongPressStart || !!onTap;

  const handlers = useLongPress(
    onLongPressStart
      ? (e) => onLongPressStart(e.clientX, e.clientY)
      : undefined,
    { onTap }
  );

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in fade-in duration-500 transition-opacity ${
        dimmed && !focused ? "opacity-25" : "opacity-100"
      }`}
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
            // Stop the tap from bubbling to the canvas background handler,
            // which would immediately clear the focus we're setting.
            onClick={(e) => e.stopPropagation()}
            {...handlers}
          />
        )}
      </div>
      {/* Label is absolutely positioned below the dot so it doesn't add to the
          wrapper's height — otherwise -translate-y-1/2 would center the
          dot+label box and push the dot above its true coordinate, making the
          nudge lines stop short of the dot. */}
      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 text-center text-xs max-w-[5rem] truncate sm:max-w-none sm:whitespace-nowrap select-none pointer-events-none ${
          isCelebrity ? "text-amber-200/90" : "text-white/80"
        }`}
      >
        {isMe ? `${label} (you)` : isCelebrity ? `✨ ${label}` : label}
      </div>
    </div>
  );
}
