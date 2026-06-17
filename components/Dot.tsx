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
  // The owner's uploaded photo version, if any. Takes precedence over `avatar`:
  // when set (and not a celebrity), the dot shows their photo (served from
  // /api/avatar?id=…&v=…) inside the same ring. The version busts the cache when
  // they re-upload.
  photoVersion?: number | null;
  // Viewer's graph-density multiplier (1 = the historical size). Scales both the
  // avatar and the plain-dot fallback so the whole graph grows/shrinks together.
  scale?: number;
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
  avatar,
  photoVersion,
  scale = 1,
  onLongPressStart,
  onTap,
  beingNudged,
  dimmed,
  focused,
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
  const interactive = !!onLongPressStart || !!onTap;
  // Celebrities keep their gold dots; everyone else who has designed a face
  // shows it. Without a face we fall back to the plain colored dot. An uploaded
  // photo (when present) wins over the designed face.
  const photoSrc =
    !isCelebrity && photoVersion != null
      ? `/api/avatar?id=${encodeURIComponent(userId)}&v=${photoVersion}`
      : null;
  const face = !isCelebrity && !photoSrc && avatar ? avatar : null;

  // Base pixel sizes (scale 1 = the original look), grown by the viewer's
  // density preference. Faces are a touch bigger than plain dots; "me" is
  // bigger than friends so your own dot stands out.
  const avatarSize = Math.round((isMe ? 16 : 13) * scale);
  const dotPx = Math.round((isMe ? 16 : isCelebrity ? 14 : 12) * scale);

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
        {/* Visible marker. Stays small visually; the hit area below is what's
            actually pressed. */}
        {photoSrc ? (
          <div
            className={`rounded-full overflow-hidden transition-transform duration-150 ${
              beingNudged ? "scale-[1.25]" : ""
            }`}
            style={{
              // Same identity-colored ring/glow as the designed face, so an
              // uploaded photo reads identically on the graph.
              boxShadow: beingNudged
                ? `0 0 0 2px #ffffff, 0 0 14px ${color}`
                : `0 0 0 2px ${color}, 0 0 12px ${color}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc}
              alt=""
              width={avatarSize}
              height={avatarSize}
              style={{
                display: "block",
                width: avatarSize,
                height: avatarSize,
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          </div>
        ) : face ? (
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
            <Avatar config={face} size={avatarSize} />
          </div>
        ) : (
          <div
            className={`rounded-full transition-transform duration-150 ${
              isMe
                ? "ring-2 ring-white/80"
                : isCelebrity
                  ? "ring-2 ring-amber-300/70"
                  : ""
            } ${
              beingNudged ? "scale-[1.6] ring-2 ring-white shadow-lg" : ""
            }`}
            style={{
              width: dotPx,
              height: dotPx,
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}`,
            }}
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
            // Stop the tap from bubbling to the canvas background handler,
            // which would immediately clear the focus we're setting.
            onClick={(e) => e.stopPropagation()}
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
