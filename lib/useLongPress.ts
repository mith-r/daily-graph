"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  thresholdMs?: number;
  // If unset, defaults to 8 for mouse and 14 for touch/pen — finger jitter
  // exceeds 8px easily, especially on a small target.
  moveTolerancePx?: number;
};

// Fires onTrigger after `thresholdMs` of pointer-down without moving more than
// the move tolerance. Captures the pointer at down so the gesture stays routed
// to the original element even if the finger drifts off it. The caller is
// responsible for any drag handling once triggered (typically by installing
// global pointermove/pointerup listeners on window).
export function useLongPress(
  onTrigger: (e: { clientX: number; clientY: number }) => void,
  { thresholdMs = 400, moveTolerancePx }: Options = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number; tolerance: number } | null>(
    null
  );
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
      // Capture so subsequent pointer events stay on this element regardless
      // of where the finger drifts. Without this, pointerleave fires the
      // moment the pointer crosses the (small) target's bounds and the
      // long-press is canceled prematurely.
      try {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // Capture isn't critical; if it fails we still get the long-press
        // through normal event routing.
      }
      const tolerance =
        moveTolerancePx ?? (e.pointerType === "mouse" ? 8 : 14);
      startRef.current = { x: e.clientX, y: e.clientY, tolerance };
      const x = e.clientX;
      const y = e.clientY;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // Haptic confirmation on devices that support it (Android Chrome).
        // No-op on iOS Safari, which doesn't expose the Vibration API.
        navigator.vibrate?.(15);
        onTriggerRef.current({ clientX: x, clientY: y });
      }, thresholdMs);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) > startRef.current.tolerance) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress OS context menu / iOS callout that fires alongside long-press.
      e.preventDefault();
    },
  };
}
