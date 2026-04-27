import { NextResponse } from "next/server";
import { getPlacement, setPlacement } from "@/lib/placements";
import { todayKey } from "@/lib/date";
import { getCurrentUser } from "@/lib/dal";
import { buildTodayResponse } from "@/lib/today";
import type { Placement } from "@/lib/types";

export const dynamic = "force-dynamic";

function clamp(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(-1, Math.min(1, n));
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let data: unknown;
  try {
    data = await req.json();
  } catch {
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
    }

    const resp = await buildTodayResponse(me, date);
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/placements failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
