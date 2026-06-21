import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { recordVote } from "@/lib/analytics";
import { getVerifiedUser } from "@/lib/dal";
import {
  clearVote,
  getUserVote,
  listSuggestionsWithVotes,
  openRoundDate,
  setVote,
} from "@/lib/voting";
import type { VoteState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const targetDate = openRoundDate();
  const [suggestions, myVote] = await Promise.all([
    listSuggestionsWithVotes(targetDate),
    getUserVote(targetDate, me.id),
  ]);
  const body: VoteState = { targetDate, suggestions, myVote };
  return NextResponse.json(body, {
    headers: { "cache-control": "no-store" },
  });
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
  // Guard `null`/non-object bodies before property access (typeof null ===
  // "object", so the explicit null check is required) — otherwise a 500.
  if (data === null || typeof data !== "object") {
    return NextResponse.json({ error: "invalid suggestionId" }, { status: 400 });
  }
  const body = data as { suggestionId?: unknown };
  const suggestionId =
    typeof body.suggestionId === "string" ? body.suggestionId : null;
  if (!suggestionId) {
    return NextResponse.json({ error: "invalid suggestionId" }, { status: 400 });
  }

  const targetDate = openRoundDate();
  try {
    const current = await getUserVote(targetDate, me.id);
    if (current === suggestionId) {
      await clearVote(targetDate, me.id);
    } else {
      const result = await setVote(targetDate, me.id, suggestionId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      // Count each voter at most once per round (recordVote dedupes via an NX
      // marker), so switching A→B or toggling off then on can't inflate the
      // daily counter.
      if (!isAdminUser(me)) {
        await recordVote(targetDate, me.id).catch((err) => {
          console.error("analytics vote counter failed:", err);
        });
      }
    }
    const [suggestions, myVote] = await Promise.all([
      listSuggestionsWithVotes(targetDate),
      getUserVote(targetDate, me.id),
    ]);
    const resp: VoteState = { targetDate, suggestions, myVote };
    return NextResponse.json(resp);
  } catch (err) {
    console.error("POST /api/prompt-vote failed:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
