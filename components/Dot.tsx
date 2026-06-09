"use client";

import { Avatar } from "@/components/Avatar";
import { colorFor, toPct } from "@/lib/graph";
import { useLongPress } from "@/lib/useLongPress";
import type { AvatarConfig } from "@/lib/types";

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
  // The owner's designed face. When present (and not a celebrity), the dot is
  // replaced by this avatar wrapped in the identity-colored ring. Absent →
  // falls back to the plain colored dot.
  avatar?: AvatarConfig | null;
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
  avatar,
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
  // Celebrities keep their gold dots; everyone else who has designed a face
  // shows it. Without a face we fall back to the plain colored dot.
  const face = !isCelebrity && avatar ? avatar : null;

  const handlers = useLongPress((e) => {
    onLongPressStart?.(e.clientX, e.clientY);
  });

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in fade-in duration-500"
      style={{ left, top }}
    >
      <div className="relative">
        {/* Visible marker. Stays small visually; the hit area below is what's
            actually pressed. */}
        {face ? (
          <div
            className={`rounded-full transition-transform duration-150 ${
              beingNudged ? "scale-[1.25]" : ""
            }`}
            style={{
              // Identity-colored ring (white for me) + the usual soft glow, so
              // the face still reads with each person's color and nudge lines
              // visually match. Brightens to white while being nudged.
              boxShadow: beingNudged
                ? `0 0 0 2px #ffffff, 0 0 14px ${color}`
                : `0 0 0 2px ${color}, 0 0 12px ${color}`,
            }}
          >
            <Avatar config={face} size={isMe ? 16 : 13} />
          </div>
        ) : (
          <div
            className={`rounded-full transition-transform duration-150 ${
              isMe
                ? "w-4 h-4 ring-2 ring-white/80"
                : isCelebrity
                  ? "w-3.5 h-3.5 ring-2 ring-amber-300/70"
                  : "w-3 h-3"
            } ${
              beingNudged ? "scale-[1.6] ring-2 ring-white shadow-lg" : ""
            }`}
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
          />
        )}
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
