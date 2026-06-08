"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

type EventName = "pageview" | "heartbeat";

const PING_URL = "/api/analytics/ping";
const HEARTBEAT_MS = 15_000;
const MIN_ACTIVE_MS = 1_000;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const sessionId = useMemo(() => makeId(), []);
  const seqRef = useRef(0);
  const activeSinceRef = useRef<number | null>(null);

  function nextEventId(): string {
    seqRef.current += 1;
    return `${sessionId}-${seqRef.current}`;
  }

  function send(event: EventName, activeMs = 0, beacon = false) {
    const body = JSON.stringify({
      event,
      eventId: nextEventId(),
      activeMs: Math.max(0, Math.round(activeMs)),
    });

    if (beacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(PING_URL, blob);
      return;
    }

    fetch(PING_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: beacon,
    }).catch(() => {
      // Analytics must never surface as an app error.
    });
  }

  function flushActiveTime(beacon = false) {
    if (document.visibilityState !== "visible") return;
    const startedAt = activeSinceRef.current;
    if (startedAt === null) return;
    const now = Date.now();
    const elapsed = now - startedAt;
    activeSinceRef.current = now;
    if (elapsed >= MIN_ACTIVE_MS) {
      send("heartbeat", elapsed, beacon);
    }
  }

  useEffect(() => {
    activeSinceRef.current =
      document.visibilityState === "visible" ? Date.now() : null;
    send("pageview");

    const id = window.setInterval(() => {
      flushActiveTime();
    }, HEARTBEAT_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flushActiveTime(true);
        activeSinceRef.current = null;
      } else {
        activeSinceRef.current = Date.now();
      }
    }

    function onPageHide() {
      flushActiveTime(true);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      flushActiveTime(true);
    };
    // The pathname dependency records a pageview for client-side navigations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
