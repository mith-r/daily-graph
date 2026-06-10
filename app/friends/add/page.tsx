import Link from "next/link";
import { requireUser } from "@/lib/dal";
import {
  getIgnoredSuggestionIds,
  getMutualFriendCounts,
  listAllUsers,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/users";
import { Nav } from "@/components/Nav";
import { toPerson } from "../PersonRow";
import { AddFriendsBrowser, type Suggestion } from "./AddFriendsBrowser";

export const dynamic = "force-dynamic";

const SUGGESTION_LIMIT = 20;

export default async function AddFriendsPage() {
  const me = await requireUser();
  const [friends, incoming, outgoing, everyone, ignored] = await Promise.all([
    listFriends(me.id),
    listIncomingRequests(me.id),
    listOutgoingRequests(me.id),
    listAllUsers(),
    getIgnoredSuggestionIds(me.id),
  ]);

  // Anyone not already connected (or pending) is addable. Ignored users stay
  // in here — they're only filtered out of the suggestions list below, so
  // search can still find them.
  const connected = new Set<string>([
    me.id,
    ...friends.map((u) => u.id),
    ...incoming.map((u) => u.id),
    ...outgoing.map((u) => u.id),
  ]);
  const candidates = everyone.filter((u) => !connected.has(u.id));

  const counts = await getMutualFriendCounts(
    new Set(friends.map((f) => f.id)),
    candidates.map((c) => c.id)
  );

  const ranked: Suggestion[] = candidates
    .map((c) => ({ ...toPerson(c), mutualCount: counts.get(c.id) ?? 0 }))
    .sort(
      (a, b) =>
        b.mutualCount - a.mutualCount ||
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }) ||
        a.username.localeCompare(b.username)
    );

  const suggestions = ranked
    .filter((c) => !ignored.has(c.id))
    .slice(0, SUGGESTION_LIMIT);

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">Add friends</h1>
          <p className="mt-1 text-sm text-white/60">
            Find people, answer requests, and grow your graph.{" "}
            <Link
              href="/friends"
              className="underline underline-offset-2 hover:text-white/80"
            >
              Back to friends
            </Link>
          </p>
        </section>

        <AddFriendsBrowser
          suggestions={suggestions}
          searchPool={ranked}
          incoming={incoming.map(toPerson)}
          outgoing={outgoing.map(toPerson)}
        />
      </div>
    </main>
  );
}
