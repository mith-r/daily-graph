import "server-only";
import { getRedis } from "./redis";
import { getUserById } from "./users";
import { clearBan, setBan } from "./banStore";
import type { Report, ReportReason, ReportStatus } from "./types";

// Re-exported so existing callers (the DAL, admin/banned pages) keep importing
// ban helpers from lib/moderation. Authoritative storage lives in lib/banStore.
export { getBan, getBannedIds, isBanned } from "./banStore";
export type { BanState } from "./banStore";

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
  try {
    await redis.set(reportKey(report.id), report);
    await redis.sadd(OPEN_REPORTS_KEY, report.id);
  } catch (err) {
    // The dedupe key was reserved with no TTL; if the report write fails we'd
    // otherwise leave an orphan lock that blocks this reporter forever (nothing
    // ever clears it, since resolveReport needs a report that doesn't exist).
    // Release it so the report can be retried.
    await redis.del(dedupeKey(input.reporterId, input.reportedUserId));
    throw err;
  }
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
    // Release the (reporter, target) dedupe guard now that the report is closed,
    // so the same reporter can flag this account again for a NEW incident (a
    // dismissed false-alarm reoffends, or a banned-then-unbanned user reoffends).
    // Without this the guard is permanent and every later report is silently
    // swallowed, letting repeat offenders escape moderation.
    await redis.del(dedupeKey(report.reporterId, report.reportedUserId));
  }
  // Pull it off the queue regardless so a stale/missing record can't get stuck.
  await redis.srem(OPEN_REPORTS_KEY, id);
}

export async function banUser(
  userId: string,
  reason: string,
  adminId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  // Authoritative ban state lives on its own key (lib/banStore) so a concurrent
  // profile edit by the target can't clobber it via the shared user record.
  await setBan(userId, reason, adminId);
  return { ok: true };
}

export async function unbanUser(
  userId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await getUserById(userId);
  if (!user) return { error: "User not found." };
  await clearBan(userId);
  return { ok: true };
}
