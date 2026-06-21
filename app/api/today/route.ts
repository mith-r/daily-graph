import { NextResponse } from "next/server";
import { todayKey } from "@/lib/date";
import { requireVerified } from "@/lib/http";
import { buildTodayResponse } from "@/lib/today";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireVerified();
  if (me instanceof NextResponse) return me;

  try {
    const body = await buildTodayResponse(me, todayKey());
    return NextResponse.json(body, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/today failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
