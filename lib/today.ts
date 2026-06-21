import "server-only";
import {
  buildHeatmap,
  getAllPlacements,
} from "./placements";
import { getCelebrityPlacements } from "./celebrities";
import { getMyNudgesOnFriends, getNudgesOn, getNudgesOnMany } from "./nudges";
import { getFriendIds, getUserAvatars } from "./users";
import { getBannedIds } from "./banStore";
import { getTodaysPrompt } from "./prompts";
import type { PlacementWithNudge, PublicUser, TodayResponse } from "./types";

// Single source of truth for assembling the response sent to /api/today,
// /api/placements, and /api/nudges. Each route just calls this after its
// own write step.
export async function buildTodayResponse(
  me: PublicUser,
  date: string
): Promise<TodayResponse> {
  const all = await getAllPlacements(date);
  const mine = all.find((p) => p.userId === me.id) ?? null;

  // A ban must retract a harasser's day-of presence everywhere it's read, not
  // just their nudges: their placement dot is dropped from friends' graphs, the
  // heatmap, and the "Everyone" count too. (Their own placement isn't indexed by
  // ban status, so it's filtered here on read.)
  const bannedPlacers = await getBannedIds(
    all.map((p) => p.userId).filter((id) => id !== me.id)
  );
  const visiblePlacements = all.filter(
    (p) => p.userId === me.id || !bannedPlacers.has(p.userId)
  );

  let others: PlacementWithNudge[] = [];
  let nudgesOnMe: TodayResponse["nudgesOnMe"] = [];

  if (mine) {
    const friendIds = await getFriendIds(me.id);
    const friendPlacements = visiblePlacements.filter(
      (p) => p.userId !== me.id && friendIds.has(p.userId)
    );
    const placedFriendIds = friendPlacements.map((p) => p.userId);
    const placedFriendIdSet = new Set(placedFriendIds);
    const myNudges = await getMyNudgesOnFriends(date, me.id, placedFriendIds);
    // Nudges on each friend from my OTHER placed friends — drives the
    // "who moved this friend" focus view. Restricted to my friends so a
    // stranger's nudge on my friend never leaks; my own nudge stays in myNudge.
    const nudgesOnFriends = await getNudgesOnMany(date, placedFriendIds);
    const all_nudges = await getNudgesOn(date, me.id);

    // A banned user is locked out of placing NEW nudges, but nudges they left
    // before the ban aren't indexed by author and so survive. Drop them here too
    // (covers nudgers who didn't place today, hence aren't in bannedPlacers).
    const candidateNudgerIds = new Set<string>();
    for (const list of nudgesOnFriends.values())
      for (const n of list) candidateNudgerIds.add(n.nudgerUserId);
    for (const n of all_nudges) candidateNudgerIds.add(n.nudgerUserId);
    const bannedNudgers = await getBannedIds([...candidateNudgerIds]);

    others = friendPlacements.map((p) => {
      const myNudge = myNudges.get(p.userId);
      const fromFriends = (nudgesOnFriends.get(p.userId) ?? []).filter(
        (n) =>
          n.nudgerUserId !== me.id &&
          placedFriendIdSet.has(n.nudgerUserId) &&
          !bannedNudgers.has(n.nudgerUserId)
      );
      return {
        ...p,
        ...(myNudge ? { myNudge } : {}),
        ...(fromFriends.length ? { nudgesFromFriends: fromFriends } : {}),
      };
    });

    // Only show nudges from current friends; ignore stale ones from removed
    // friends and any from since-banned users.
    nudgesOnMe = all_nudges.filter(
      (n) => friendIds.has(n.nudgerUserId) && !bannedNudgers.has(n.nudgerUserId)
    );
  }

  // Join each placement to its owner's designed face and/or uploaded photo (if
  // any) so the graph can render an avatar in place of the dot. Populated here
  // at read time only — never written back into the placements hash. Celebrities
  // are intentionally left out (they keep their gold dots).
  const avatarIds = [
    ...(mine ? [mine.userId] : []),
    ...others.map((p) => p.userId),
  ];
  const avatars = await getUserAvatars(avatarIds);
  const myPlacement = mine
    ? {
        ...mine,
        avatar: avatars.get(mine.userId)?.avatar ?? null,
        photoVersion: avatars.get(mine.userId)?.photoVersion ?? null,
        // Reflect the owner's CURRENT display name, not the one snapshotted into
        // the placement at write time (which would otherwise go stale on rename).
        displayName: avatars.get(mine.userId)?.displayName ?? mine.displayName,
      }
    : null;
  others = others.map((p) => ({
    ...p,
    avatar: avatars.get(p.userId)?.avatar ?? null,
    photoVersion: avatars.get(p.userId)?.photoVersion ?? null,
    displayName: avatars.get(p.userId)?.displayName ?? p.displayName,
  }));

  return {
    date,
    prompt: await getTodaysPrompt(date),
    myPlacement,
    others,
    nudgesOnMe,
    // Heatmap excludes me and any banned placer (visiblePlacements already drops
    // banned), matching the dots shown on the graph.
    heatmap: buildHeatmap(visiblePlacements.filter((p) => p.userId !== me.id)),
    celebrities: getCelebrityPlacements(date),
  };
}
