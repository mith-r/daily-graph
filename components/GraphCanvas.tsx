"use client";

import { useRef, type ReactNode } from "react";
import type { Prompt } from "@/lib/types";

type Props = {
  prompt: Prompt;
  onPlace?: (coords: { x: number; y: number }) => void;
  disabled?: boolean;
  children?: ReactNode; // dots
  // Optional ref to the inner canvas div, so callers can compute pointer
  // coordinates relative to it (used by the nudge drag handler).
  canvasRef?: { current: HTMLDivElement | null };
  // Fires when the canvas is tapped after placement (placement disabled). Used
  // to clear the tap-to-focus selection.
  onBackgroundTap?: () => void;
};

export function GraphCanvas({
  prompt,
  onPlace,
  disabled,
  children,
  canvasRef,
  onBackgroundTap,
}: Props) {
  const internalRef = useRef<HTMLDivElement>(null);

  function setRef(el: HTMLDivElement | null) {
    internalRef.current = el;
    if (canvasRef) canvasRef.current = el;
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled) {
      onBackgroundTap?.();
      return;
    }
    if (!onPlace || !internalRef.current) return;
    const rect = internalRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const x = px * 2 - 1;
    const y = 1 - py * 2; // invert: top of screen = +1
    onPlace({ x, y });
  }

  return (
    <div className="absolute inset-0 m-auto aspect-square h-full max-w-full sm:relative sm:inset-auto sm:m-0 sm:mx-auto sm:h-auto sm:w-full sm:max-w-xl">
      {/* Axis labels */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm text-white/70 max-w-[80%] text-center truncate">
        {prompt.yTop}
      </div>
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-sm text-white/70 max-w-[80%] text-center truncate">
        {prompt.yBottom}
      </div>
      {/* Mobile: x-axis labels render inside the graph at the edges so they don't get clipped by the viewport. */}
      <div className="sm:hidden absolute top-1/2 left-2 -translate-y-1/2 text-xs text-white/80 bg-navy/70 backdrop-blur-sm px-1.5 py-0.5 rounded max-w-[40%] truncate z-10">
        {prompt.xLeft}
      </div>
      <div className="sm:hidden absolute top-1/2 right-2 -translate-y-1/2 text-xs text-white/80 bg-navy/70 backdrop-blur-sm px-1.5 py-0.5 rounded max-w-[40%] truncate z-10 text-right">
        {prompt.xRight}
      </div>
      <div className="hidden sm:block absolute top-1/2 -left-2 -translate-x-full -translate-y-1/2 text-sm text-white/70">
        {prompt.xLeft}
      </div>
      <div className="hidden sm:block absolute top-1/2 -right-2 translate-x-full -translate-y-1/2 text-sm text-white/70">
        {prompt.xRight}
      </div>

      <div
        ref={setRef}
        onClick={handleClick}
        className={`relative w-full h-full rounded-lg border border-white/15 bg-white/[0.02] ${
          disabled ? "cursor-default" : "cursor-crosshair"
        }`}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
        {/* Axes */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/30 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/30 pointer-events-none" />

        {children}
      </div>
    </div>
  );
}
