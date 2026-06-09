"use client";

import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import {
  AVATAR_SCALE_MAX,
  AVATAR_SCALE_MIN,
  AVATAR_SCALE_STEP,
  clampAvatarScale,
} from "@/lib/avatar";
import { setAvatarScaleAction } from "@/app/actions/profile";
import type { AvatarConfig } from "@/lib/types";

// Matches Dot.tsx's base size for the current user's own dot, so the preview
// renders at the exact pixel size your dot will be on the graph.
const ME_BASE = 16;

export function AvatarSizeSetting({
  initial,
  preview,
}: {
  initial: number;
  // The user's own face, rendered at the selected size as a live preview.
  preview: AvatarConfig;
}) {
  const [scale, setScale] = useState(initial);
  // Drag fires onChange continuously; we only persist when it settles, so the
  // ref carries the latest value to the commit handlers without a stale closure.
  const scaleRef = useRef(initial);
  const savedRef = useRef(initial);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSlide = (value: number) => {
    const next = clampAvatarScale(value);
    scaleRef.current = next;
    setScale(next); // live preview, no save yet
  };

  // Persist once the drag/keypress settles. Optimistic: revert to the last saved
  // value if the write fails.
  const commit = () => {
    const next = scaleRef.current;
    if (next === savedRef.current) return;
    const prev = savedRef.current;
    savedRef.current = next;
    setError(null);
    startTransition(async () => {
      const res = await setAvatarScaleAction(next);
      if (res?.error) {
        savedRef.current = prev;
        scaleRef.current = prev;
        setScale(prev);
        setError(res.error);
      }
    });
  };

  const dotSize = Math.round(ME_BASE * scale);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-white/50 mb-2">
          Size on the graph
        </h2>
        <p className="text-sm text-white/60">
          Drag to set how big faces appear on your graph. Smaller feels less
          cluttered; larger is easier to make out. Only changes your own view —
          not how others see you.
        </p>
      </div>

      <div className="flex items-center gap-5">
        {/* Live preview: your dot at its true on-graph pixel size, shown on a
            patch of the graph's navy background for scale. */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-navy ring-1 ring-white/10">
          <div
            className="rounded-full"
            style={{
              boxShadow:
                "0 0 0 2px rgba(255,255,255,0.85), 0 0 12px rgba(255,255,255,0.25)",
            }}
          >
            <Avatar config={preview} size={dotSize} title="Size preview" />
          </div>
        </div>

        {/* Draggable bar. */}
        <div className="flex-1">
          <input
            type="range"
            min={AVATAR_SCALE_MIN}
            max={AVATAR_SCALE_MAX}
            step={AVATAR_SCALE_STEP}
            value={scale}
            onChange={(e) => onSlide(Number(e.target.value))}
            onPointerUp={commit}
            onTouchEnd={commit}
            onKeyUp={commit}
            onBlur={commit}
            aria-label="Avatar size on the graph"
            className="w-full cursor-pointer accent-white"
          />
          <div className="mt-1 flex justify-between text-[11px] text-white/40">
            <span>Smaller</span>
            <span>Larger</span>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </section>
  );
}
