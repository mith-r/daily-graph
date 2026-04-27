"use client";

import { colorFor, toPct } from "@/lib/graph";
import { useLongPress } from "@/lib/useLongPress";

type Props = {
  x: number; // -1..1
  y: number; // -1..1
  label: string;
  userId: string;
  isMe?: boolean;
  onLongPressStart?: (clientX: number, clientY: number) => void;
  beingNudged?: boolean;
};

export function Dot({
  x,
  y,
  label,
  userId,
  isMe,
  onLongPressStart,
  beingNudged,
}: Props) {
  const left = `${toPct(x)}%`;
  const top = `${toPct(y, true)}%`;
  const color = isMe ? "white" : colorFor(userId);
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
            isMe ? "w-4 h-4 ring-2 ring-white/80" : "w-3 h-3"
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
      <div className="mt-1 text-xs text-white/80 max-w-[5rem] truncate sm:max-w-none sm:whitespace-nowrap select-none pointer-events-none">
        {isMe ? `${label} (you)` : label}
      </div>
    </div>
  );
}
