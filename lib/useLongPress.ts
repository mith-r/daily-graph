"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  thresholdMs?: number;
  // If unset, defaults to 8 for mouse and 14 for touch/pen — finger jitter
  // exceeds 8px easily, especially on a small target.
  moveTolerancePx?: number;
  // Fires on pointerup when the long-press never triggered and the pointer
  // never moved past tolerance — i.e. a plain tap/click.
  onTap?: (e: { clientX: number; clientY: number }) => void;
};

// Fires onTrigger after `thresholdMs` of pointer-down without moving more than
// the move tolerance. Captures the pointer at down so the gesture stays routed
// to the original element even if the finger drifts off it. The caller is
// responsible for any drag handling once triggered (typically by installing
// global pointermove/pointerup listeners on window).
export function useLongPress(
  onTrigger: ((e: { clientX: number; clientY: number }) => void) | undefined,
  { thresholdMs = 400, moveTolerancePx, onTap }: Options = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number; tolerance: number } | null>(
    null
  );
  // True once the pointer has moved past tolerance — used to suppress the tap.
  const movedRef = useRef(false);
  // True once the long-press timer has actually fired — used to suppress the
  // tap. Decoupled from timerRef so a tap-only dot (no long-press handler, so
  // no timer) still taps when held past the threshold.
  const triggeredRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  const onTapRef = useRef(onTap);

  // Keep latest callbacks without recreating handlers each render.
  useEffect(() => {
    onTriggerRef.current = onTrigger;
    onTapRef.current = onTap;
  });

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    movedRef.current = false;
    triggeredRef.current = false;
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
      movedRef.current = false;
      triggeredRef.current = false;
      const x = e.clientX;
      const y = e.clientY;
      if (timerRef.current) clearTimeout(timerRef.current);
      // Only arm the timer when there's a real long-press handler. A tap-only
      // dot (e.g. your own dot in friends mode) would otherwise fire a pointless
      // haptic buzz and mark itself triggered, dropping the tap.
      const onTrigger = onTriggerRef.current;
      if (onTrigger) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          triggeredRef.current = true;
          // Haptic confirmation on devices that support it (Android Chrome).
          // No-op on iOS Safari, which doesn't expose the Vibration API.
          navigator.vibrate?.(15);
          onTrigger({ clientX: x, clientY: y });
        }, thresholdMs);
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.hypot(dx, dy) > startRef.current.tolerance) {
        movedRef.current = true;
        cancel();
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      // A tap = the long-press never fired and the pointer never traveled past
      // tolerance. (movedRef cancels and nulls startRef, so checking startRef is
      // enough for movement, but the explicit check keeps the intent clear.)
      if (startRef.current && !triggeredRef.current && !movedRef.current) {
        onTapRef.current?.({ clientX: e.clientX, clientY: e.clientY });
      }
      cancel();
    },
    onPointerCancel: cancel,
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress OS context menu / iOS callout that fires alongside long-press.
      e.preventDefault();
    },
  };
}
