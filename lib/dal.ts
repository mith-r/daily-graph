import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { ensureDebugUser, getUserById, toPublic } from "./users";
import { DEBUG_AUTH_ENABLED } from "./debug";
import type { PublicUser } from "./types";

export const getSession = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;
  return session;
});

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
  return toPublic(user);
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
