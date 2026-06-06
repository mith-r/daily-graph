import { requireUser } from "@/lib/dal";
import { Nav } from "@/components/Nav";
import {
  getUserVote,
  listSuggestionsWithVotes,
  openRoundDate,
} from "@/lib/voting";
import { VoteClient } from "./VoteClient";
import { SuggestForm } from "./SuggestForm";
import type { VoteState } from "@/lib/types";

export const dynamic = "force-dynamic";

function prettyDate(key: string): string {
  const d = new Date(key + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
}

export default async function VotePage() {
  const me = await requireUser();
  const targetDate = openRoundDate();
  const [suggestions, myVote] = await Promise.all([
    listSuggestionsWithVotes(targetDate),
    getUserVote(targetDate, me.id),
  ]);
  const initial: VoteState = { targetDate, suggestions, myVote };

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">Tomorrow&apos;s prompt</h1>
          <p className="mt-1 text-sm text-white/60">
            {prettyDate(targetDate)} — top vote at midnight ET wins.
          </p>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Suggest one
          </h2>
          <SuggestForm />
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-white/60">
            Vote
          </h2>
          <VoteClient meId={me.id} initial={initial} />
        </section>
      </div>
    </main>
  );
}
