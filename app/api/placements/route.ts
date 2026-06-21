import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { recordPlacement } from "@/lib/analytics";
import { createPlacement } from "@/lib/placements";
import { todayKey } from "@/lib/date";
import { getVerifiedUser } from "@/lib/dal";
import { buildTodayResponse } from "@/lib/today";
import type { Placement } from "@/lib/types";

export const dynamic = "force-dynamic";

// Require a genuine finite number. Number() coercion would otherwise turn
// null/""/[]/false into 0 and true into 1 — all "valid" coords — silently
// pinning a junk first placement (which is permanent for the day) at the
// center/corner. Anything that isn't already a number is rejected → 400.
function clamp(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(-1, Math.min(1, v));
}

export async function POST(req: Request) {
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  // `null`/non-object bodies parse fine; guard before property access so they
  // 400 instead of throwing an uncaught TypeError (500).
  if (data === null || typeof data !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const body = data as { x?: unknown; y?: unknown };
  const x = clamp(body.x);
  const y = clamp(body.y);
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
