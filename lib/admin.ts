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

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

export function isAdminUser(user: Pick<PublicUser, "email"> | null): boolean {
  return isAdminEmail(user?.email);
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();
  return user;
}
