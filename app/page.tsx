import { requireUser } from "@/lib/dal";
import { todayKey } from "@/lib/date";
import { buildTodayResponse } from "@/lib/today";
import { getFriendGroups } from "@/lib/friendGroupsStore";
import { HomeClient } from "./HomeClient";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireUser();
  const [initial, groups] = await Promise.all([
    buildTodayResponse(me, todayKey()),
    getFriendGroups(me.id),
  ]);

  return (
    <main className="min-h-screen bg-navy text-white flex flex-col">
      <Nav me={me} />
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <HomeClient me={me} initial={initial} initialGroups={groups} />
      </div>
    </main>
  );
}
