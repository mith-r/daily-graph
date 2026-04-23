import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { countIncomingRequests } from "@/lib/users";
import type { PublicUser } from "@/lib/types";

export async function Nav({ me }: { me: PublicUser }) {
  const incoming = await countIncomingRequests(me.id);

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
        </div>
        <div className="flex items-center gap-3">
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
