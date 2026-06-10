import "server-only";
import { getRedis } from "./redis";
import { getUserById } from "./users";
import type { Report, ReportReason, ReportStatus, User } from "./types";

// Moderation storage. Reports are flagged by users and reviewed by mods on the
// admin dashboard; a mod can ban the reported account, which locks them out
// everywhere (enforced in lib/dal.ts). Follows the per-module redis-key style of
// lib/voting.ts / lib/users.ts.

const reportKey = (id: string) => `report:${id}`;
// The open-report queue is a plain SET (not a sorted set): the in-memory dev
// stub (lib/memoryRedis.ts) has no `zrem`, so a single report couldn't be pulled
// out of a ZSET locally. We sort by createdAt in JS instead — same approach as
// the `users:all` set.
const OPEN_REPORTS_KEY = "reports:open";
// One open report per (reporter, target) — prevents spam-reporting. Permanent
// (no TTL) so reports and this guard survive; unlike voting data they're an
// audit trail, not ephemeral.
const dedupeKey = (reporterId: string, reportedUserId: string) =>
  `report:dedupe:${reporterId}:${reportedUserId}`;
// Mirrors lib/users.ts's userKey so we can write ban state back onto the record.
const userKey = (id: string) => `user:${id}`;

export function isBanned(user: User | null | undefined): boolean {
  return !!user?.bannedAt;
}

export async function createReport(input: {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  context?: string;
}): Promise<{ ok: true }> {
  const redis = getRedis();

  // Reserve the (reporter, target) pair. If already reported, treat as a no-op
  // success so we don't reveal the prior report or let them pile on.
  const reserved = await redis.set(
    dedupeKey(input.reporterId, input.reportedUserId),
    "1",
    { nx: true }
  );
  if (reserved !== "OK") return { ok: true };

  const report: Report = {
    id: crypto.randomUUID(),
    reporterId: input.reporterId,
    reportedUserId: input.reportedUserId,
    reason: input.reason,
    details: input.details,
    context: input.context,
    createdAt: Date.now(),
    status: "open",
  };
  await redis.set(reportKey(report.id), report);
  await redis.sadd(OPEN_REPORTS_KEY, report.id);
  return { ok: true };
}

export async function listOpenReports(): Promise<Report[]> {
  const redis = getRedis();
  const ids = await redis.smembers(OPEN_REPORTS_KEY);
  if (ids.length === 0) return [];
  const reports = await redis.mget<(Report | null)[]>(
    ids.map((id) => reportKey(id))
  );
  return reports
    .filter((r): r is Report => !!r)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getReport(id: string): Promise<Report | null> {
  const redis = getRedis();
  return (await redis.get<Report>(reportKey(id))) ?? null;
}

export async function resolveReport(
  id: string,
  status: Exclude<ReportStatus, "open">,
  adminId: string
): Promise<void> {
  const redis = getRedis();
  const report = await getReport(id);
  if (report) {
    report.status = status;
    report.resolvedBy = adminId;
    report.resolvedAt = Date.now();
    await redis.set(reportKey(id), report);
  }
  // Pull it off the queue regardless so a stale/missing record can't get stuck.
  await redis.srem(OPEN_REPORTS_KEY, id);
}

export async function banUser(
  userId: string,
  reason: string,
  adminId: string
): Promise<{ ok: true } | { error: string }> {
  const redis = getRedis();
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  user.bannedAt = Date.now();
  user.bannedReason = reason;
  user.bannedBy = adminId;
  await redis.set(userKey(userId), user);
  return { ok: true };
}

export async function unbanUser(
  userId: string
): Promise<{ ok: true } | { error: string }> {
  const redis = getRedis();
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  delete user.bannedAt;
  delete user.bannedReason;
  delete user.bannedBy;
  await redis.set(userKey(userId), user);
  return { ok: true };
}
