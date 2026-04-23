import { requireUser } from "@/lib/dal";
import { getPlacement, getFriendPlacements } from "@/lib/placements";
import { getTodaysPrompt } from "@/lib/prompts";
import { todayKey } from "@/lib/date";
import { getFriendIds } from "@/lib/users";
import { HomeClient } from "./HomeClient";
import { Nav } from "@/components/Nav";
import type { TodayResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireUser();

  const date = todayKey();
  const prompt = getTodaysPrompt(date);
  const mine = await getPlacement(date, me.id);

  let others: TodayResponse["others"] = [];
  if (mine) {
    const friendIds = await getFriendIds(me.id);
    others = await getFriendPlacements(date, friendIds);
  }

  const initial: TodayResponse = {
    date,
    prompt,
    myPlacement: mine,
    others,
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12">
        <HomeClient me={me} initial={initial} />
      </div>
    </main>
  );
}
