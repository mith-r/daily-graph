import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { countIncomingRequests } from "@/lib/users";
import { computeStreak, listUserDates } from "@/lib/placements";
import { todayKey } from "@/lib/date";
import { NavLink } from "@/components/NavLink";
import type { PublicUser } from "@/lib/types";

export async function Nav({ me }: { me: PublicUser }) {
  const [incoming, dates] = await Promise.all([
    countIncomingRequests(me.id),
    listUserDates(me.id),
  ]);
  const streak = computeStreak(dates, todayKey());

  const tabs = (
    <>
      <NavLink href="/friends">
        Friends
        {incoming > 0 && (
          <span
            aria-label={`${incoming} pending friend request${incoming === 1 ? "" : "s"}`}
            className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none min-w-[1.125rem] h-[1.125rem] px-1.5"
          >
            {incoming > 99 ? "99+" : incoming}
          </span>
        )}
      </NavLink>
      <NavLink href="/vote">Vote</NavLink>
      <NavLink href="/history">History</NavLink>
      <NavLink href="/team">Team</NavLink>
      <NavLink href="/settings">Settings</NavLink>
    </>
  );

  return (
    <nav className="w-full border-b border-white/10 bg-navy/80 backdrop-blur">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <Link href="/" className="font-semibold text-white leading-tight">
              Daily Graph
            </Link>
            <span className="text-pink-400 text-xs italic leading-tight">
              {"“More fun than porn.”"}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4">{tabs}</div>
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
            <span className="hidden sm:inline text-white/60">{me.displayName}</span>
            <form action={logout}>
              <button className="text-white/60 hover:text-white transition">
                Log out
              </button>
            </form>
          </div>
        </div>
        <div className="mt-3 flex sm:hidden items-center justify-around gap-2">
          {tabs}
        </div>
      </div>
    </nav>
  );
}
