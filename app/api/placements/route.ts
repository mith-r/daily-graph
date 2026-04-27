import { NextResponse } from "next/server";
import {
  buildHeatmap,
  getAllPlacements,
  getPlacement,
  setPlacement,
} from "@/lib/placements";
import { getTodaysPrompt } from "@/lib/prompts";
import { todayKey } from "@/lib/date";
import { getCurrentUser } from "@/lib/dal";
import { getFriendIds } from "@/lib/users";
import type { Placement, TodayResponse } from "@/lib/types";

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
    // If already placed today, just return current state (idempotent).
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

    const all = await getAllPlacements(date);
    const friendIds = await getFriendIds(me.id);
    const others = all.filter(
      (p) => p.userId !== me.id && friendIds.has(p.userId)
    );

    const resp: TodayResponse = {
      date,
      prompt: await getTodaysPrompt(date),
      myPlacement: placement,
      others,
      heatmap: buildHeatmap(all.filter((p) => p.userId !== me.id)),
    };
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/placements failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
