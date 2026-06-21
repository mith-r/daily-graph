// Saved friend-filter groups. Group *definitions* are now persisted server-side
// (see lib/friendGroupsStore) so they follow the user across devices; this
// module holds the shared types and validation/serialization helpers, plus the
// localStorage key still used for a one-time migration of groups created before
// they moved server-side. The per-device graph-filter *selection* is no longer
// persisted — the filter resets to everyone-on on every page load.

export type FriendGroup = {
  id: string;
  name: string;
  userIds: string[];
};

// Sentinel "group" meaning "no filter — show every placed friend". Not stored.
export const ALL_FRIENDS_GROUP_ID = "__all_friends__";

function friendGroupStorageKey(userId: string) {
  return `daily-graph:friend-filter-groups:${userId}`;
}

export function makeGroupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Validate an untrusted value (parsed JSON from localStorage, a client-supplied
// server-action payload, a stored Redis value) into FriendGroup[]. Drops
// anything malformed rather than throwing, so a corrupt entry can't break the
// UI or poison storage.
export function coerceFriendGroups(parsed: unknown): FriendGroup[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((group): FriendGroup | null => {
      if (
        !group ||
        typeof group !== "object" ||
        !("id" in group) ||
        !("name" in group) ||
        !("userIds" in group)
      ) {
        return null;
      }
      const candidate = group as { id: unknown; name: unknown; userIds: unknown };
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.name !== "string" ||
        !Array.isArray(candidate.userIds)
      ) {
        return null;
      }
      const userIds = candidate.userIds.filter(
        (id): id is string => typeof id === "string"
      );
      return { id: candidate.id, name: candidate.name, userIds };
    })
    .filter((group): group is FriendGroup => group !== null);
}

// Validate an untrusted localStorage string payload into FriendGroup[].
function parseFriendGroups(raw: string | null): FriendGroup[] {
  if (!raw) return [];
  try {
    return coerceFriendGroups(JSON.parse(raw));
  } catch {
    return [];
  }
}

// Read any groups left in this browser by an older build that stored them
// locally. Only used now to migrate them up to the server once.
export function loadFriendGroups(userId: string): FriendGroup[] {
  if (typeof window === "undefined") return [];
  return parseFriendGroups(localStorage.getItem(friendGroupStorageKey(userId)));
}
