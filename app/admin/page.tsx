import { Nav } from "@/components/Nav";
import { isAdminEmail, requireAdmin } from "@/lib/admin";
import { getAnalyticsSummary } from "@/lib/analytics";
import { todayKey } from "@/lib/date";
import { getAllPlacements } from "@/lib/placements";
import { listAllUserRecords } from "@/lib/users";
import { listSuggestionsWithVotes, openRoundDate } from "@/lib/voting";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("en-US");

function formatNumber(n: number): string {
  return numberFormat.format(n);
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

  const [analytics, placements, suggestions] = await Promise.all([
    getAnalyticsSummary(today, adminIds),
    getAllPlacements(today),
    listSuggestionsWithVotes(voteDate, { excludeUserIds: adminIds }),
  ]);

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
    <main className="min-h-screen bg-navy text-white">
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
