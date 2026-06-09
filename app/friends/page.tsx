import { requireUser } from "@/lib/dal";
import {
  listAllUsers,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/users";
import type { FriendSummary } from "@/lib/types";
import { Nav } from "@/components/Nav";
import { FriendsBrowser } from "./FriendsBrowser";

// Strip email (and any other secrets) before handing lists to the client component.
const toPerson = (u: FriendSummary) => ({
  id: u.id,
  username: u.username,
  displayName: u.displayName,
});

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const me = await requireUser();
  const [friends, incoming, outgoing, everyone] = await Promise.all([
    listFriends(me.id),
    listIncomingRequests(me.id),
    listOutgoingRequests(me.id),
    listAllUsers(),
  ]);

  const known = new Set<string>([
    me.id,
    ...friends.map((u) => u.id),
    ...incoming.map((u) => u.id),
    ...outgoing.map((u) => u.id),
  ]);
  const discover = everyone.filter((u) => !known.has(u.id));

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">Friends</h1>
          <p className="mt-1 text-sm text-white/60">
            Only friends&apos; dots show up on your daily graph.
          </p>
        </section>

        <FriendsBrowser
          meId={me.id}
          friends={friends.map(toPerson)}
          incoming={incoming.map(toPerson)}
          outgoing={outgoing.map(toPerson)}
          discover={discover.map(toPerson)}
        />
      </div>
    </main>
  );
}
