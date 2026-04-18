import { NextResponse } from "next/server";
import { getAllPlacements, getPlacement } from "@/lib/redis";
import { getTodaysPrompt } from "@/lib/prompts";
import { todayKey } from "@/lib/date";
import type { TodayResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId || !/^[a-zA-Z0-9-]{8,64}$/.test(userId)) {
    return NextResponse.json({ error: "invalid userId" }, { status: 400 });
  }

  const date = todayKey();
  const prompt = getTodaysPrompt(date);

  try {
    const mine = await getPlacement(date, userId);
    // Server-side gate: don't leak others until caller has placed.
    const others = mine
      ? (await getAllPlacements(date)).filter((p) => p.userId !== userId)
      : [];

    const body: TodayResponse = {
      date,
      prompt,
      myPlacement: mine,
      others,
    };
    return NextResponse.json(body, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/today failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
