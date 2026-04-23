import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { countIncomingRequests } from "@/lib/users";
import { computeStreak, listUserDates } from "@/lib/placements";
import { todayKey } from "@/lib/date";
import type { PublicUser } from "@/lib/types";

export async function Nav({ me }: { me: PublicUser }) {
  const [incoming, dates] = await Promise.all([
    countIncomingRequests(me.id),
    listUserDates(me.id),
  ]);
  const streak = computeStreak(dates, todayKey());

  return (
    <nav className="w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-white">
            Daily Graph
          </Link>
          <Link
            href="/friends"
            className="relative text-white/60 hover:text-white transition inline-flex items-center gap-1.5"
          >
            Friends
            {incoming > 0 && (
              <span
                aria-label={`${incoming} pending friend request${incoming === 1 ? "" : "s"}`}
                className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none min-w-[1.125rem] h-[1.125rem] px-1.5"
              >
                {incoming > 99 ? "99+" : incoming}
              </span>
            )}
          </Link>
          <Link
            href="/history"
            className="text-white/60 hover:text-white transition"
          >
            History
          </Link>
          <Link
            href="/settings"
            className="text-white/60 hover:text-white transition"
          >
            Settings
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <span
              aria-label={`${streak} day streak`}
              title={`${streak} day streak`}
              className="inline-flex items-center gap-1 text-white/80"
            >
              <span aria-hidden>🔥</span>
              <span className="font-medium tabular-nums">{streak}</span>
            </span>
          )}
          <span className="text-white/60">{me.displayName}</span>
          <form action={logout}>
            <button className="text-white/60 hover:text-white transition">
              Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
