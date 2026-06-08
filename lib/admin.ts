import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "./dal";
import type { PublicUser } from "./types";

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminUser(user: Pick<PublicUser, "email"> | null): boolean {
  if (!user) return false;
  return adminEmails().has(user.email.toLowerCase());
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();
  return user;
}
