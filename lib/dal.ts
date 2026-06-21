import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { ensureDebugUser, getUserById, toPublic } from "./users";
import { DEBUG_AUTH_ENABLED, DEBUG_USER } from "./debug";
import { getBan, isBanned, type BanState } from "./moderation";
import type { PublicUser, User } from "./types";

export const getSession = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;
  return session;
});

// A ban locks the account out everywhere — except keep the Debug User usable in
// local dev (DEBUG_BYPASS_AUTH), so a test ban can't brick the bypass. Ban state
// is read from its own key (lib/banStore) so a profile edit can't mask it.
function isLockedOut(user: User, ban: BanState | null): boolean {
  return (
    isBanned(ban) && !(DEBUG_AUTH_ENABLED && user.id === DEBUG_USER.id)
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
  // Reject sessions issued before the last password change (i.e. revoke all
  // pre-reset sessions). Prefer the millisecond issue time so a pre-existing
  // session minted in the SAME second as the reset is still revoked, while the
  // post-reset auto-login (minted strictly after passwordChangedAt) survives.
  // Legacy tokens lack issuedAtMs → fall back to the floored-second comparison.
  if (user.passwordChangedAt) {
    const revoked =
      session.issuedAtMs !== undefined
        ? session.issuedAtMs < user.passwordChangedAt
        : session.issuedAt !== undefined &&
          session.issuedAt < Math.floor(user.passwordChangedAt / 1000);
    if (revoked) {
      return DEBUG_AUTH_ENABLED ? toPublic(await ensureDebugUser()) : null;
    }
  }
  // Banned users resolve to null: API routes hit their existing `!me → 401` and
  // pages fall through to requireUser's /banned redirect below.
  if (isLockedOut(user, await getBan(user.id))) return null;
  return toPublic(user);
});

// Authenticated, but possibly NOT email-verified. Only the verification screen
// and its actions should use this; everything else goes through requireUser.
export async function requireAccount(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (user) return user;
  // getCurrentUser returns null for both logged-out and banned users. Send
  // banned users to /banned (not /login, which would just loop them back in).
  const session = await getSession();
  if (session) {
    const raw = await getUserById(session.userId);
    if (raw && isLockedOut(raw, await getBan(raw.id))) redirect("/banned");
  }
  redirect("/login");
}

export async function requireUser(): Promise<PublicUser> {
  const user = await requireAccount();
  // Unverified accounts can't use the app — park them on the verify screen.
  if (!user.emailVerifiedAt) redirect("/verify-email");
  return user;
}

// API-route flavor of the verification gate: null (→ 401) instead of redirect.
export const getVerifiedUser = cache(async (): Promise<PublicUser | null> => {
  const user = await getCurrentUser();
  if (!user?.emailVerifiedAt) return null;
  return user;
});
