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

// Bounds so a crafted server-action / localStorage payload can't store an
// unbounded blob under user:<id>:friend-groups (mirrors the report/photo caps).
const MAX_GROUPS = 50;
const MAX_GROUP_NAME = 40;
const MAX_GROUP_ID = 128;
const MAX_GROUP_MEMBERS = 1000;

// Validate an untrusted value (parsed JSON from localStorage, a client-supplied
// server-action payload, a stored Redis value) into FriendGroup[]. Drops
// anything malformed rather than throwing, so a corrupt entry can't break the
// UI or poison storage. Also enforces size caps and a non-empty name (the UI
// requires one; a crafted payload must not bypass that).
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
      // Reject a blank id — the UI keys groups by id (and matches the editing
      // group by id), so two empty-id groups would collide (dup React keys,
      // edit-the-wrong-group). Real groups always have a UUID.
      const id = candidate.id.trim().slice(0, MAX_GROUP_ID);
      if (!id) return null;
      // Never DROP a group for an empty name — that would lose the group AND its
      // members when a user transiently clears the name field to retype it (the
      // debounced save / unmount flush could persist the blank mid-edit). Fall
      // back to a placeholder so the data survives; a real name overwrites it on
      // the next keystroke. (This still prevents a truly blank label.)
      const name =
        candidate.name.trim().slice(0, MAX_GROUP_NAME) || "Untitled group";
      // Dedupe members and cap their count.
      const userIds = [
        ...new Set(
          candidate.userIds.filter((id): id is string => typeof id === "string")
        ),
      ].slice(0, MAX_GROUP_MEMBERS);
      return { id, name, userIds };
    })
    .filter((group): group is FriendGroup => group !== null)
    .slice(0, MAX_GROUPS);
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
