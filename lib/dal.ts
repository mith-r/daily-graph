import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "./session";
import { getUserById } from "./users";
import type { PublicUser } from "./types";

export const getSession = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;
  return session;
});

export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
  };
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
