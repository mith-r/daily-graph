import { NextResponse } from "next/server";
import {
  buildHeatmap,
  getAllPlacements,
  getPlacement,
} from "@/lib/placements";
import { getTodaysPrompt } from "@/lib/prompts";
import { todayKey } from "@/lib/date";
import { getCurrentUser } from "@/lib/dal";
import { getFriendIds } from "@/lib/users";
import type { TodayResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = todayKey();
  const prompt = getTodaysPrompt(date);

  try {
    const all = await getAllPlacements(date);
    const mine = all.find((p) => p.userId === me.id) ?? null;

    let others: TodayResponse["others"] = [];
    if (mine) {
      const friendIds = await getFriendIds(me.id);
      others = all.filter(
        (p) => p.userId !== me.id && friendIds.has(p.userId)
      );
    }

    const body: TodayResponse = {
      date,
      prompt,
      myPlacement: mine,
      others,
      heatmap: buildHeatmap(all.filter((p) => p.userId !== me.id)),
    };
    return NextResponse.json(body, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/today failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
