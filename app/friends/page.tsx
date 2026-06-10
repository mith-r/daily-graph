import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { countIncomingRequests, listFriends } from "@/lib/users";
import { getFriendGroups } from "@/lib/friendGroupsStore";
import { Nav } from "@/components/Nav";
import { FriendGroupsManager } from "./FriendGroupsManager";
import { FriendActions } from "./FriendActions";
import { PersonRow, toPerson } from "./PersonRow";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const me = await requireUser();
  const [friends, incomingCount, groups] = await Promise.all([
    listFriends(me.id),
    countIncomingRequests(me.id),
    getFriendGroups(me.id),
  ]);
  const people = friends.map(toPerson);

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Friends</h1>
            <p className="mt-1 text-sm text-white/60">
              Only friends&apos; dots show up on your daily graph.
            </p>
          </div>
          <Link
            href="/friends/add"
            className="inline-flex items-center gap-2 rounded-md bg-white text-neutral-900 text-sm px-4 py-2 font-medium shrink-0"
          >
            Add friends
            {incomingCount > 0 && (
              <span
                aria-label={`${incomingCount} pending friend request${incomingCount === 1 ? "" : "s"}`}
                className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none min-w-[1.125rem] h-[1.125rem] px-1.5"
              >
                {incomingCount > 99 ? "99+" : incomingCount}
              </span>
            )}
          </Link>
        </section>

        <FriendGroupsManager
          meId={me.id}
          friends={people}
          initialGroups={groups}
        />

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Your friends
          </h2>
          {people.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">No friends yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {people.map((u) => (
                <PersonRow
                  key={u.id}
                  user={u}
                  action={<FriendActions id={u.id} kind="friend" />}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
