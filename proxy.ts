import { NextResponse, type NextRequest } from "next/server";
import { decryptSession } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("session")?.value;
  const session = await decryptSession(token);
  const authed = !!session && session.expiresAt > Date.now();
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!authed && !isPublic) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  if (authed && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude api (self-checks auth), Next internals, and any path with a
    // file extension (public assets like /window.svg).
    "/((?!api|_next|.*\\.).*)",
  ],
};
