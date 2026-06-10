import { NextResponse } from "next/server";
import { todayKey } from "@/lib/date";
import { getVerifiedUser } from "@/lib/dal";
import { buildTodayResponse } from "@/lib/today";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
