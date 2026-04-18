import { NextResponse } from "next/server";
import { getAllPlacements, setPlacement } from "@/lib/redis";
import { getTodaysPrompt } from "@/lib/prompts";
import { todayKey } from "@/lib/date";
import type { Placement, TodayResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function clamp(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(-1, Math.min(1, n));
}

export async function POST(req: Request) {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const body = data as {
    userId?: unknown;
    displayName?: unknown;
    x?: unknown;
    y?: unknown;
  };

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(userId)) {
    return NextResponse.json({ error: "invalid userId" }, { status: 400 });
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName || displayName.length > 24) {
    return NextResponse.json({ error: "invalid displayName" }, { status: 400 });
  }

  const x = clamp(body.x);
  const y = clamp(body.y);
  if (x === null || y === null) {
    return NextResponse.json({ error: "invalid coords" }, { status: 400 });
  }

  const date = todayKey();
  const placement: Placement = {
    userId,
    displayName,
    x,
    y,
    createdAt: Date.now(),
  };

  try {
    await setPlacement(date, placement);
    const all = await getAllPlacements(date);
    const others = all.filter((p) => p.userId !== userId);
    const resp: TodayResponse = {
      date,
      prompt: getTodaysPrompt(date),
      myPlacement: placement,
      others,
    };
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/placements failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
