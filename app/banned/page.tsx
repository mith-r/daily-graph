import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { getUserById } from "@/lib/users";
import { getBan } from "@/lib/moderation";
import { logout } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

// The lock-out notice shown to banned accounts. Deliberately does NOT call
// requireUser/getCurrentUser (those return null for banned users, which would
// loop) — it reads the session directly. Anyone who isn't actually banned is
// bounced home.
export default async function BannedPage() {
  const session = await readSession();
  const user = session ? await getUserById(session.userId) : null;
  const ban = user ? await getBan(user.id) : null;
  // A stored ban record always carries bannedAt, so its presence == banned.
  if (!user || !ban) redirect("/");

  return (
    <main className="flex-1 bg-navy text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your account is suspended
        </h1>
        <p className="mt-3 text-sm text-white/60">
          A moderator has suspended this account for violating the community
          guidelines. You no longer have access to Daily Graph.
        </p>
        {ban.reason && (
          <p className="mt-4 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70">
            <span className="text-white/45">Reason: </span>
            {ban.reason}
          </p>
        )}
        <p className="mt-4 text-xs text-white/40">
          If you think this was a mistake, contact the team from the home page.
        </p>
        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="rounded-md border border-white/20 text-white/80 px-4 py-2 text-sm hover:text-white hover:border-white/40 transition"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
