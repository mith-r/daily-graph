import { NextResponse } from "next/server";
import { getVerifiedUser } from "@/lib/dal";
import { getUserPhoto } from "@/lib/users";

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
      // The URL is versioned, so a given URL's bytes never change — cache them
      // hard (browser-private since the endpoint is auth-gated).
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
