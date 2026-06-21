import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { recordPlacement } from "@/lib/analytics";
import { createPlacement } from "@/lib/placements";
import { todayKey } from "@/lib/date";
import { readJson, requireVerified, toFiniteNumber } from "@/lib/http";
import { buildTodayResponse } from "@/lib/today";
import type { Placement } from "@/lib/types";

export const dynamic = "force-dynamic";

// toFiniteNumber rejects coerced junk (null/""/[]/false→0, true→1) outright, so
// a garbage coord 400s instead of silently pinning a permanent first placement
// at the center/corner. Then clamp the genuine number into the unit square.
function clampCoord(v: unknown): number | null {
  const n = toFiniteNumber(v);
  return n === null ? null : Math.max(-1, Math.min(1, n));
}

export async function POST(req: Request) {
  const me = await requireVerified();
  if (me instanceof NextResponse) return me;

  const data = await readJson(req);
  if (data instanceof NextResponse) return data;
  // `null`/non-object bodies parse fine; guard before property access so they
  // 400 instead of throwing an uncaught TypeError (500).
  if (data === null || typeof data !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const body = data as { x?: unknown; y?: unknown };
  const x = clampCoord(body.x);
  const y = clampCoord(body.y);
  if (x === null || y === null) {
    return NextResponse.json({ error: "invalid coords" }, { status: 400 });
  }

  const date = todayKey();

  try {
    // Place once per day. createPlacement is atomic (HSETNX): only the call that
    // actually creates the placement returns true, so the analytics counter is
    // incremented exactly once even under concurrent first POSTs. A later POST
    // (already placed) is a no-op and the existing coords stand.
    const placement: Placement = {
      userId: me.id,
      displayName: me.displayName,
      x,
      y,
      createdAt: Date.now(),
    };
    const created = await createPlacement(date, placement);
    if (created && !isAdminUser(me)) {
      await recordPlacement(date).catch((err) => {
        console.error("analytics placement counter failed:", err);
      });
    }

    const resp = await buildTodayResponse(me, date);
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/placements failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
