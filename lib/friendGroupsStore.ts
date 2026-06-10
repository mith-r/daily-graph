import "server-only";
import { getRedis } from "./redis";
import { coerceFriendGroups, type FriendGroup } from "./friendGroups";

// Friend-filter groups live server-side (one JSON blob per user) so they follow
// the user across devices instead of being trapped in one browser. Stored and
// read through the same coercion as the client so a malformed payload can never
// be persisted or returned.
const friendGroupsKey = (id: string) => `user:${id}:friend-groups`;

export async function getFriendGroups(userId: string): Promise<FriendGroup[]> {
  const redis = getRedis();
  const stored = await redis.get<unknown>(friendGroupsKey(userId));
  return coerceFriendGroups(stored);
}

export async function setFriendGroups(
  userId: string,
  groups: FriendGroup[]
): Promise<void> {
  const redis = getRedis();
  await redis.set(friendGroupsKey(userId), coerceFriendGroups(groups));
}
