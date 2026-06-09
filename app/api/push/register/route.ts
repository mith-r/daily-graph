import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/dal";
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
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
