"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  thresholdMs?: number;
  moveTolerancePx?: number;
};

// Fires onTrigger after `thresholdMs` of pointer-down without moving more than
// `moveTolerancePx`. The element keeps receiving regular pointer events; the
// caller is responsible for any drag handling once triggered (typically by
// installing global pointermove/pointerup listeners on window).
export function useLongPress(
  onTrigger: (e: { clientX: number; clientY: number }) => void,
  { thresholdMs = 400, moveTolerancePx = 8 }: Options = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const onTriggerRef = useRef(onTrigger);

  // Keep latest callback without recreating handlers each render.
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  });

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      // Only react to primary button / first touch.
      if (e.button !== 0 && e.pointerType === "mouse") return;
      startRef.current = { x: e.clientX, y: e.clientY };
      const x = e.clientX;
      const y = e.clientY;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onTriggerRef.current({ clientX: x, clientY: y });
      }, thresholdMs);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) > moveTolerancePx) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress OS context menu / iOS callout that fires alongside long-press.
      e.preventDefault();
    },
  };
}
