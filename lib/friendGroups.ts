// Saved friend-filter groups, persisted per user in the browser's localStorage.
// Shared by the home graph (which *applies* a group to filter dots) and the
// Friends → Groups tab (which *edits* them). Keep all the storage-key and
// (de)serialization logic here so the two callers can't drift apart.

export type FriendGroup = {
  id: string;
  name: string;
  userIds: string[];
};

// Sentinel "group" meaning "no filter — show every placed friend". Not stored.
export const ALL_FRIENDS_GROUP_ID = "__all_friends__";

export function friendGroupStorageKey(userId: string) {
  return `daily-graph:friend-filter-groups:${userId}`;
}

export function friendSelectionStorageKey(userId: string) {
  return `daily-graph:friend-filter-selection:${userId}`;
}

export function makeGroupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Validate an untrusted localStorage payload into FriendGroup[]. Drops anything
// malformed rather than throwing, so a corrupt entry can't break the UI.
export function parseFriendGroups(raw: string | null): FriendGroup[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
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

export function loadFriendGroups(userId: string): FriendGroup[] {
  if (typeof window === "undefined") return [];
  return parseFriendGroups(localStorage.getItem(friendGroupStorageKey(userId)));
}

export function saveFriendGroups(userId: string, groups: FriendGroup[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(friendGroupStorageKey(userId), JSON.stringify(groups));
}
