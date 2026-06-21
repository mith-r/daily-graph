import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireVerified } from "@/lib/http";
import { addPushToken, removePushToken } from "@/lib/pushTokens";

export const dynamic = "force-dynamic";

// APNs device tokens are hex strings (64 chars today, but Apple says treat
// the length as opaque) — allow a sane range.
const TokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{16,512}$/, "invalid device token"),
});

export async function POST(req: Request) {
  const me = await requireVerified();
  if (me instanceof NextResponse) return me;

  const data = await readJson(req);
  if (data instanceof NextResponse) return data;

  const parsed = TokenSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  try {
    await addPushToken(parsed.data.token.toLowerCase(), me.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/push/register failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const me = await requireVerified();
  if (me instanceof NextResponse) return me;

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const parsed = TokenSchema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  try {
    await removePushToken(parsed.data.token.toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/push/register failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
