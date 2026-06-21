import "server-only";
import { getRedis } from "./redis";

// Moderation ban state lives under its OWN key, separate from the user:${id}
// record. The user record is a single JSON blob that profile mutators
// (updateDisplayName/updateAvatar/updatePhoto/...) rewrite with a non-atomic
// read-modify-write. If ban state lived on that blob, a victim's concurrent
// profile edit could land after an admin's ban write and silently un-ban them
// (last-write-wins). Keeping ban state on a dedicated key that ONLY the
// moderation actions write makes a ban impossible to clobber via a profile edit.
//
// This module imports nothing from lib/users or lib/moderation, so it can be
// imported by all of them (and the DAL) without an import cycle.

export type BanState = {
  bannedAt: number;
  reason: string;
  by: string; // id of the admin who applied the ban
};

const banKey = (id: string) => `user:${id}:ban`;

export async function setBan(
  userId: string,
  reason: string,
  adminId: string
): Promise<void> {
  await getRedis().set(banKey(userId), {
    bannedAt: Date.now(),
    reason,
    by: adminId,
  } satisfies BanState);
}

export async function clearBan(userId: string): Promise<void> {
  await getRedis().del(banKey(userId));
}

export async function getBan(userId: string): Promise<BanState | null> {
  return (await getRedis().get<BanState>(banKey(userId))) ?? null;
}

// Batch-resolve which of the given ids are banned, in one MGET.
export async function getBannedIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (ids.length === 0) return out;
  const recs = await getRedis().mget<(BanState | null)[]>(...ids.map(banKey));
  ids.forEach((id, i) => {
    if (recs[i]?.bannedAt) out.add(id);
  });
  return out;
}

export function isBanned(ban: BanState | null | undefined): boolean {
  return !!ban?.bannedAt;
}
