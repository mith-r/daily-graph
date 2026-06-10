import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { ensureDebugUser, getUserById, toPublic } from "./users";
import { DEBUG_AUTH_ENABLED, DEBUG_USER } from "./debug";
import { isBanned } from "./moderation";
import type { PublicUser, User } from "./types";

export const getSession = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;
  return session;
});

// A ban locks the account out everywhere — except keep the Debug User usable in
// local dev (DEBUG_BYPASS_AUTH), so a test ban can't brick the bypass.
function isLockedOut(user: User): boolean {
  return (
    isBanned(user) && !(DEBUG_AUTH_ENABLED && user.id === DEBUG_USER.id)
  );
}

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSession();
  // Debug bypass: with no valid session, act as the seeded Debug User instead
  // of being logged out. This is the single chokepoint for pages, API routes,
  // and server actions, so the whole site becomes usable without auth.
  if (!session) {
    return DEBUG_AUTH_ENABLED ? toPublic(await ensureDebugUser()) : null;
  }
  const user = await getUserById(session.userId);
  if (!user) {
    return DEBUG_AUTH_ENABLED ? toPublic(await ensureDebugUser()) : null;
  }
  // Banned users resolve to null: API routes hit their existing `!me → 401` and
  // pages fall through to requireUser's /banned redirect below.
  if (isLockedOut(user)) return null;
  return toPublic(user);
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (user) return user;
  // getCurrentUser returns null for both logged-out and banned users. Send
  // banned users to /banned (not /login, which would just loop them back in).
  const session = await getSession();
  if (session) {
    const raw = await getUserById(session.userId);
    if (raw && isLockedOut(raw)) redirect("/banned");
  }
  redirect("/login");
}
