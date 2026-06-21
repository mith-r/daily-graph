import { NextResponse } from "next/server";
import { todayKey } from "@/lib/date";
import { getVerifiedUser } from "@/lib/dal";
import { getFriendIds } from "@/lib/users";
import { getPlacement } from "@/lib/placements";
import { removeNudge, setNudge } from "@/lib/nudges";
import { buildTodayResponse } from "@/lib/today";

export const dynamic = "force-dynamic";

function parseFiniteNumber(v: unknown): number | null {
  // Require a genuine finite number — don't Number()-coerce true/""/[]/null into
  // 0/1 (matches the placements clamp), so junk offsets 400 instead of silently
  // moving a friend's dot.
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
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
  // JSON.parse("null") succeeds (and arrays/primitives parse too); guard before
  // reading properties so a `null` body returns 400 rather than throwing a 500.
  if (data === null || typeof data !== "object") {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const body = data as { targetUserId?: unknown; dx?: unknown; dy?: unknown };
  if (typeof body.targetUserId !== "string" || !body.targetUserId) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  if (body.targetUserId === me.id) {
    return NextResponse.json({ error: "cannot nudge self" }, { status: 400 });
  }
  const dxRaw = parseFiniteNumber(body.dx);
  const dyRaw = parseFiniteNumber(body.dy);
  if (dxRaw === null || dyRaw === null) {
    return NextResponse.json({ error: "invalid offset" }, { status: 400 });
  }

  const targetUserId = body.targetUserId;
  const friendIds = await getFriendIds(me.id);
  if (!friendIds.has(targetUserId)) {
    return NextResponse.json({ error: "not friends" }, { status: 403 });
  }

  const date = todayKey();
  const target = await getPlacement(date, targetUserId);
  if (!target) {
    return NextResponse.json(
      { error: "target hasn't placed today" },
      { status: 400 }
    );
  }

  // Clamp so the nudged position stays within the canvas (-1..1 on each axis).
  const dx = Math.max(-1 - target.x, Math.min(1 - target.x, dxRaw));
  const dy = Math.max(-1 - target.y, Math.min(1 - target.y, dyRaw));

  try {
    await setNudge(date, targetUserId, {
      nudgerUserId: me.id,
      dx,
      dy,
      createdAt: Date.now(),
    });
    const resp = await buildTodayResponse(me, date);
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/nudges failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("targetUserId");
  if (!targetUserId) {
    return NextResponse.json({ error: "missing target" }, { status: 400 });
  }

  const date = todayKey();
  try {
    await removeNudge(date, targetUserId, me.id);
    const resp = await buildTodayResponse(me, date);
    return NextResponse.json(resp);
  } catch (err) {
    console.error("DELETE /api/nudges failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
