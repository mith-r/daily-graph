import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/dal";
import { isAdminUser } from "@/lib/admin";
import { readJson, toFiniteNumber } from "@/lib/http";
import { recordAnalyticsPing, type AnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function parseEvent(value: unknown): AnalyticsEvent | null {
  return value === "pageview" || value === "heartbeat" ? value : null;
}

export async function POST(req: Request) {
  // Unlike the other routes, an anonymous caller gets a quiet 200 (not a 401)
  // and admins are dropped, so their own browsing doesn't inflate the metrics.
  const me = await getVerifiedUser();
  if (!me || isAdminUser(me)) {
    return NextResponse.json({ ok: true });
  }

  const data = await readJson(req);
  if (data instanceof NextResponse) return data;
  // A literal `null` body parses fine; guard before property access so it 400s
  // instead of throwing an uncaught TypeError (500).
  if (data === null || typeof data !== "object") {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  const body = data as {
    event?: unknown;
    eventId?: unknown;
    activeMs?: unknown;
  };
  const event = parseEvent(body.event);
  if (!event) {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  try {
    await recordAnalyticsPing({
      userId: me.id,
      event,
      eventId: typeof body.eventId === "string" ? body.eventId : null,
      activeMs: toFiniteNumber(body.activeMs) ?? 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/analytics/ping failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
