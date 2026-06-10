import { NextResponse } from "next/server";
import { apnsConfigured, sendApnsAlert } from "@/lib/apns";
import { getAllPushTokens, removePushToken } from "@/lib/pushTokens";

export const dynamic = "force-dynamic";
// Fan-out over many device tokens can outlive the default timeout.
export const maxDuration = 60;

// Daily "Today's graph is up" blast, triggered by Vercel Cron (vercel.json).
// Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically when the
// CRON_SECRET env var is set on the project.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!apnsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "APNs env vars not configured" },
      { status: 503 }
    );
  }

  try {
    const tokens = await getAllPushTokens();
    const result = await sendApnsAlert(tokens, {
      title: "Daily Graphs",
      body: "Today's graph is up — place your dot!",
    });

    if (result.staleTokens.length > 0) {
      await Promise.all(result.staleTokens.map((t) => removePushToken(t)));
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      pruned: result.staleTokens.length,
    });
  } catch (err) {
    console.error("GET /api/cron/push failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
