import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/dal";
import { getFriendIds, getUserPhoto } from "@/lib/users";

export const dynamic = "force-dynamic";

// Serves a user's uploaded profile photo as real image bytes, so the graph and
// profile page can point an <img> at /api/avatar?id=<userId>&v=<photoVersion>
// instead of inlining the photo on the hot /api/today poll. The version query
// param lets the browser cache each upload immutably (a new upload bumps the
// version → a new URL → a fresh fetch).
//
// data: URLs are parsed here rather than handed to the browser directly so the
// poll payload stays tiny and the bytes are cacheable.
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

export async function GET(req: Request) {
  // Same-origin <img> requests carry the session cookie automatically, so this
  // gate keeps photos from being scraped by anonymous callers without paying a
  // per-image friend check.
  const me = await getVerifiedUser();
  if (!me) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  // Photos are only meant to be seen by the owner and their friends (the graph
  // never surfaces a non-friend's photo). Enforce that here too — otherwise any
  // verified user could pull down a stranger's private photo by guessing/lifting
  // their userId (ids leak via friend suggestions/search). Return 404 (not 403)
  // so we don't even confirm whether a photo exists. This costs one SMEMBERS per
  // image request (each <img> is its own request, so it can't share the friend
  // set /api/today loads); responses are cached immutably, so it's a first-paint
  // cost per photo'd friend, not a per-poll cost.
  if (id !== me.id && !(await getFriendIds(me.id)).has(id)) {
    return new NextResponse(null, { status: 404 });
  }

  const dataUrl = await getUserPhoto(id);
  const match = dataUrl ? DATA_URL_RE.exec(dataUrl) : null;
  if (!match) {
    return new NextResponse(null, { status: 404 });
  }

  const [, mime, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "content-type": mime,
      // Stored bytes are user-supplied; forbid MIME sniffing so the browser can
      // never reinterpret them as anything but the declared image type.
      "x-content-type-options": "nosniff",
      // The URL is versioned, so a given URL's bytes never change — cache them
      // hard (browser-private since the endpoint is auth-gated).
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
