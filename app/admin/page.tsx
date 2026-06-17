import { Nav } from "@/components/Nav";
import {
  banUserAction,
  dismissReportAction,
  unbanUserAction,
} from "@/app/actions/moderation";
import { isAdminEmail, requireAdmin } from "@/lib/admin";
import { getAnalyticsSummary } from "@/lib/analytics";
import { todayKey } from "@/lib/date";
import { isBanned, listOpenReports } from "@/lib/moderation";
import { getAllPlacements } from "@/lib/placements";
import { reportReasonLabel } from "@/lib/reportReasons";
import { listAllUserRecords } from "@/lib/users";
import { listSuggestionsWithVotes, openRoundDate } from "@/lib/voting";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("en-US");

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatNumber(n: number): string {
  return numberFormat.format(n);
}

function formatWhen(ts: number): string {
  return dateTimeFormat.format(new Date(ts));
}

function formatDuration(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function createdOn(timestamp: number, date: string): boolean {
  return todayKey(new Date(timestamp)) === date;
}

export default async function AdminPage() {
  const me = await requireAdmin();
  const today = todayKey();
  const voteDate = openRoundDate();

  // Exclude admin accounts from every metric so the team's own usage of the
  // app (and this dashboard) doesn't inflate the numbers.
  const allUsers = await listAllUserRecords();
  const adminIds = new Set(
    allUsers.filter((u) => isAdminEmail(u.email)).map((u) => u.id)
  );

  const [analytics, placements, suggestions, reports] = await Promise.all([
    getAnalyticsSummary(today, adminIds),
    getAllPlacements(today),
    listSuggestionsWithVotes(voteDate, { excludeUserIds: adminIds }),
    listOpenReports(),
  ]);

  // Resolve report participants from the already-loaded user records (no extra
  // round trips).
  const usersById = new Map<string, User>(allUsers.map((u) => [u.id, u]));

  const users = allUsers.filter((u) => !adminIds.has(u.id));
  const visiblePlacements = placements.filter((p) => !adminIds.has(p.userId));
  const visibleSuggestions = suggestions.filter(
    (s) => !adminIds.has(s.authorId)
  );

  const totalUsers = users.length;
  const newUsersToday = users.filter((u) => createdOn(u.createdAt, today)).length;
  const placementRate =
    totalUsers > 0 ? visiblePlacements.length / totalUsers : 0;
  const totalVotes = visibleSuggestions.reduce((sum, s) => sum + s.voteCount, 0);
  const avgActiveToday =
    analytics.today.activeUsers > 0
      ? analytics.today.activeMs / analytics.today.activeUsers
      : 0;

  return (
    <main className="flex-1 bg-navy text-white">
      <Nav me={me} />
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/55">
              Aggregate activity through {today}.
            </p>
          </div>
          <div className="text-xs text-white/45">
            Prompt voting for {voteDate}
          </div>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="DAU today" value={formatNumber(analytics.today.activeUsers)} />
          <Metric label="Avg DAU, 7 days" value={formatNumber(analytics.dau7)} />
          <Metric label="Avg DAU, 30 days" value={formatNumber(analytics.dau30)} />
          <Metric
            label="Active time today"
            value={formatDuration(analytics.today.activeMs)}
            detail={`${formatDuration(avgActiveToday)} / active user`}
          />
          <Metric label="Page views today" value={formatNumber(analytics.today.pageViews)} />
          <Metric label="Total users" value={formatNumber(totalUsers)} />
          <Metric
            label="New users today"
            value={formatNumber(newUsersToday)}
            detail={`${formatNumber(analytics.today.signups)} tracked signup events`}
          />
          <Metric
            label="Placements today"
            value={formatNumber(visiblePlacements.length)}
            detail={`${formatPercent(placementRate)} of users`}
          />
          <Metric
            label="Vote suggestions"
            value={formatNumber(visibleSuggestions.length)}
            detail={`${formatNumber(totalVotes)} current votes`}
          />
          <Metric
            label="7-day active time"
            value={formatDuration(analytics.activeMs7)}
          />
          <Metric
            label="30-day active time"
            value={formatDuration(analytics.activeMs30)}
          />
          <Metric
            label="Heartbeat events"
            value={formatNumber(analytics.today.heartbeats)}
            detail="today"
          />
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Recent Days</h2>
            <span className="text-xs text-white/45">Last 14 days</span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-md border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                <tr>
                  <Th>Date</Th>
                  <Th>DAU</Th>
                  <Th>Active</Th>
                  <Th>Views</Th>
                  <Th>Signups</Th>
                  <Th>Placements</Th>
                  <Th>Votes</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {analytics.recentDays.slice(0, 14).map((day) => (
                  <tr key={day.date} className="text-white/80">
                    <Td>{day.date}</Td>
                    <Td>{formatNumber(day.activeUsers)}</Td>
                    <Td>{formatDuration(day.activeMs)}</Td>
                    <Td>{formatNumber(day.pageViews)}</Td>
                    <Td>{formatNumber(day.signups)}</Td>
                    <Td>{formatNumber(day.placements)}</Td>
                    <Td>{formatNumber(day.votes)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Reports</h2>
            <span className="text-xs text-white/45">
              {reports.length} open
            </span>
          </div>
          {reports.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">No open reports.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {reports.map((r) => {
                const reported = usersById.get(r.reportedUserId);
                const reporter = usersById.get(r.reporterId);
                const banned = isBanned(reported);
                return (
                  <div
                    key={r.id}
                    className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm">
                          <span className="text-white/90">
                            {reported?.displayName ?? "(deleted user)"}
                          </span>
                          {reported && (
                            <span className="text-white/45">
                              {" "}
                              @{reported.username}
                            </span>
                          )}
                          {banned && (
                            <span className="ml-2 rounded border border-red-400/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-300">
                              Banned
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/50">
                          {reportReasonLabel(r.reason)} · reported by{" "}
                          {reporter?.displayName ?? "(deleted user)"} ·{" "}
                          {formatWhen(r.createdAt)}
                        </div>
                        {r.context && (
                          <div className="text-xs text-white/55">
                            Context:{" "}
                            <span className="text-white/75">{r.context}</span>
                          </div>
                        )}
                        {r.details && (
                          <p className="whitespace-pre-wrap text-sm text-white/70">
                            {r.details}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {banned ? (
                          <form
                            action={unbanUserAction.bind(
                              null,
                              r.reportedUserId
                            )}
                          >
                            <button className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white">
                              Unban
                            </button>
                          </form>
                        ) : (
                          <form
                            action={banUserAction.bind(
                              null,
                              r.id,
                              r.reportedUserId
                            )}
                          >
                            <button className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500">
                              Ban
                            </button>
                          </form>
                        )}
                        <form action={dismissReportAction.bind(null, r.id)}>
                          <button className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white">
                            Dismiss
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <div className="text-xs uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-xs text-white/45">{detail}</div>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium whitespace-nowrap">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 tabular-nums whitespace-nowrap">{children}</td>;
}
