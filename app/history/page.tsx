import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { getAllPlacements, listUserDates } from "@/lib/placements";
import { getTodaysPrompt } from "@/lib/prompts";
import { getFriendIds } from "@/lib/users";
import { Nav } from "@/components/Nav";
import { HistoryEntry } from "./HistoryEntry";

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

export default async function HistoryPage() {
  const me = await requireUser();
  const [dates, friendIds] = await Promise.all([
    listUserDates(me.id),
    getFriendIds(me.id),
  ]);

  const rawEntries = await Promise.all(
    dates.map(async (date) => {
      const [all, prompt] = await Promise.all([
        getAllPlacements(date),
        getTodaysPrompt(date),
      ]);
      const mine = all.find((p) => p.userId === me.id) ?? null;
      if (!mine) return null;
      const others = all.filter(
        (p) => p.userId !== me.id && friendIds.has(p.userId)
      );
      return {
        date,
        pretty: prettyDate(date),
        prompt,
        mine,
        others,
        total: all.length,
      };
    })
  );
  const entries = rawEntries.filter(
    (e): e is NonNullable<typeof e> => e !== null
  );

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <section>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="mt-1 text-sm text-white/60">
            Your past placements. Days older than 30 fall off.
          </p>
        </section>

        {entries.length === 0 ? (
          <p className="text-sm text-white/50">
            No placements yet. Head to{" "}
            <Link href="/" className="underline hover:text-white/80">
              today&apos;s graph
            </Link>{" "}
            to make your first one.
          </p>
        ) : (
          <ul className="space-y-16">
            {entries.map((e) => (
              <li key={e.date}>
                <HistoryEntry entry={e} meId={me.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
