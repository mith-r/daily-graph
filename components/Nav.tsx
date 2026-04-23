import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { PublicUser } from "@/lib/types";

export function Nav({ me }: { me: PublicUser }) {
  return (
    <nav className="w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-white">
            Daily Graph
          </Link>
          <Link
            href="/friends"
            className="text-white/60 hover:text-white transition"
          >
            Friends
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
