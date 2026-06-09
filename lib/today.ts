import "server-only";
import {
  buildHeatmap,
  getAllPlacements,
} from "./placements";
import { getCelebrityPlacements } from "./celebrities";
import { getMyNudgesOnFriends, getNudgesOn, getNudgesOnMany } from "./nudges";
import { getFriendIds, getUserAvatars } from "./users";
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

  let others: PlacementWithNudge[] = [];
  let nudgesOnMe: TodayResponse["nudgesOnMe"] = [];

  if (mine) {
    const friendIds = await getFriendIds(me.id);
    const friendPlacements = all.filter(
      (p) => p.userId !== me.id && friendIds.has(p.userId)
    );
    const placedFriendIds = friendPlacements.map((p) => p.userId);
    const placedFriendIdSet = new Set(placedFriendIds);
    const myNudges = await getMyNudgesOnFriends(date, me.id, placedFriendIds);
    // Nudges on each friend from my OTHER placed friends — drives the
    // "who moved this friend" focus view. Restricted to my friends so a
    // stranger's nudge on my friend never leaks; my own nudge stays in myNudge.
    const nudgesOnFriends = await getNudgesOnMany(date, placedFriendIds);
    others = friendPlacements.map((p) => {
      const myNudge = myNudges.get(p.userId);
      const fromFriends = (nudgesOnFriends.get(p.userId) ?? []).filter(
        (n) => n.nudgerUserId !== me.id && placedFriendIdSet.has(n.nudgerUserId)
      );
      return {
        ...p,
        ...(myNudge ? { myNudge } : {}),
        ...(fromFriends.length ? { nudgesFromFriends: fromFriends } : {}),
      };
    });

    const all_nudges = await getNudgesOn(date, me.id);
    // Only show nudges from current friends; ignore stale ones from removed friends.
    nudgesOnMe = all_nudges.filter((n) => friendIds.has(n.nudgerUserId));
  }

  // Join each placement to its owner's designed face (if any) so the graph can
  // render an avatar in place of the dot. Populated here at read time only —
  // never written back into the placements hash. Celebrities are intentionally
  // left out (they keep their gold dots).
  const avatarIds = [
    ...(mine ? [mine.userId] : []),
    ...others.map((p) => p.userId),
  ];
  const avatars = await getUserAvatars(avatarIds);
  const myPlacement = mine
    ? { ...mine, avatar: avatars.get(mine.userId) ?? null }
    : null;
  others = others.map((p) => ({ ...p, avatar: avatars.get(p.userId) ?? null }));

  return {
    date,
    prompt: await getTodaysPrompt(date),
    myPlacement,
    others,
    nudgesOnMe,
    heatmap: buildHeatmap(all.filter((p) => p.userId !== me.id)),
    celebrities: getCelebrityPlacements(date),
  };
}
