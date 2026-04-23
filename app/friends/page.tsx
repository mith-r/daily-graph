import { requireUser } from "@/lib/dal";
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/users";
import { Nav } from "@/components/Nav";
import { AddFriendForm } from "./AddFriendForm";
import { FriendActions } from "./FriendActions";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const me = await requireUser();
  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(me.id),
    listIncomingRequests(me.id),
    listOutgoingRequests(me.id),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">Friends</h1>
          <p className="mt-1 text-sm text-white/60">
            Only friends&apos; dots show up on your daily graph.
          </p>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Add a friend
          </h2>
          <AddFriendForm />
        </section>

        {incoming.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-widest text-white/60">
              Incoming requests
            </h2>
            <ul className="mt-3 space-y-2">
              {incoming.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <div className="text-sm">{u.displayName}</div>
                    <div className="text-xs text-white/50">{u.email}</div>
                  </div>
                  <FriendActions id={u.id} kind="incoming" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-widest text-white/60">
              Sent requests
            </h2>
            <ul className="mt-3 space-y-2">
              {outgoing.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <div className="text-sm">{u.displayName}</div>
                    <div className="text-xs text-white/50">{u.email}</div>
                  </div>
                  <FriendActions id={u.id} kind="outgoing" />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Your friends
          </h2>
          {friends.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">No friends yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {friends.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <div className="text-sm">{u.displayName}</div>
                    <div className="text-xs text-white/50">{u.email}</div>
                  </div>
                  <FriendActions id={u.id} kind="friend" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
