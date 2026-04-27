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
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in fade-in duration-500 ${
        interactive ? "" : "pointer-events-none"
      }`}
      style={{
        left,
        top,
        touchAction: interactive ? "none" : undefined,
      }}
      {...(interactive ? handlers : {})}
    >
      <div
        className={`rounded-full ${
          isMe ? "w-4 h-4 ring-2 ring-white/80" : "w-3 h-3"
        } ${beingNudged ? "ring-2 ring-white/90" : ""}`}
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />
      <div className="mt-1 text-xs text-white/80 max-w-[5rem] truncate sm:max-w-none sm:whitespace-nowrap select-none">
        {isMe ? `${label} (you)` : label}
      </div>
    </div>
  );
}
