import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/dal";
import { isAdminUser } from "@/lib/admin";
import { recordAnalyticsPing, type AnalyticsEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function parseEvent(value: unknown): AnalyticsEvent | null {
  return value === "pageview" || value === "heartbeat" ? value : null;
}

function parseActiveMs(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ ok: true });
  }
  // Admins are excluded from analytics so their own browsing — including
  // refreshing this dashboard — doesn't inflate the engagement metrics.
  if (isAdminUser(me)) {
    return NextResponse.json({ ok: true });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
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
      activeMs: parseActiveMs(body.activeMs),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/analytics/ping failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
