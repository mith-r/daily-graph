import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { recordPlacement } from "@/lib/analytics";
import { getPlacement, setPlacement } from "@/lib/placements";
import { todayKey } from "@/lib/date";
import { readJson, requireVerified, toFiniteNumber } from "@/lib/http";
import { buildTodayResponse } from "@/lib/today";
import type { Placement } from "@/lib/types";

export const dynamic = "force-dynamic";

function clampCoord(v: unknown): number | null {
  const n = toFiniteNumber(v);
  return n === null ? null : Math.max(-1, Math.min(1, n));
}

export async function POST(req: Request) {
  const me = await requireVerified();
  if (me instanceof NextResponse) return me;

  const data = await readJson(req);
  if (data instanceof NextResponse) return data;
  const body = data as { x?: unknown; y?: unknown };
  const x = clampCoord(body.x);
  const y = clampCoord(body.y);
  if (x === null || y === null) {
    return NextResponse.json({ error: "invalid coords" }, { status: 400 });
  }

  const date = todayKey();

  try {
    // If already placed today, the new coords are ignored (idempotent).
    const existing = await getPlacement(date, me.id);
    const placement: Placement =
      existing ?? {
        userId: me.id,
        displayName: me.displayName,
        x,
        y,
        createdAt: Date.now(),
      };
    if (!existing) {
      await setPlacement(date, placement);
      if (!isAdminUser(me)) {
        await recordPlacement(date).catch((err) => {
          console.error("analytics placement counter failed:", err);
        });
      }
    }

    const resp = await buildTodayResponse(me, date);
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/placements failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
