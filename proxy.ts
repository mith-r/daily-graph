import { NextResponse, type NextRequest } from "next/server";
import { decryptSession } from "@/lib/session";
import { DEBUG_AUTH_ENABLED } from "@/lib/debug";

// NOTE: /verify-email is deliberately NOT public — it needs a session, and the
// verification check itself lives in the DAL (this proxy can run outside the
// main runtime, where the in-memory Redis stub isn't available).
const PUBLIC_PATHS = new Set([
  "/welcome",
  "/login",
  "/signup",
  "/forgot-password",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("session")?.value;
  const session = await decryptSession(token);
  const realAuthed = !!session && session.expiresAt > Date.now();
  // Debug bypass treats everyone as authed for route-gating, mirroring
  // getCurrentUser so the proxy doesn't redirect to /login.
  const authed = realAuthed || DEBUG_AUTH_ENABLED;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!authed && !isPublic) {
    // First-timers land on the animated marketing page. It's a static file in
    // public/, so it sits outside this matcher and is served directly.
    const url = new URL("/landing.html", request.url);
    return NextResponse.redirect(url);
  }

  // Only bounce away from the public auth screens for a *real* session —
  // otherwise a debug-bypass user could never reach the forms to log in as
  // someone else.
  if (realAuthed && isPublic) {
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
