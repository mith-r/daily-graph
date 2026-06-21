"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadFriendGroups, makeGroupId, type FriendGroup } from "@/lib/friendGroups";
import { saveFriendGroupsAction } from "@/app/actions/groups";
import { colorFor } from "@/lib/graph";

// Only non-sensitive fields cross to the client — never the user's email.
type Person = { id: string; username: string; displayName: string };

// Create / rename / delete friend groups and choose their members over the full
// friends list. Group definitions are persisted server-side (so they follow the
// user across devices); the home graph reads the same server copy to *apply*
// them as a filter — see lib/friendGroupsStore.
export function FriendGroupsManager({
  meId,
  friends,
  initialGroups,
}: {
  meId: string;
  friends: Person[];
  initialGroups: FriendGroup[];
}) {
  const [groups, setGroups] = useState<FriendGroup[]>(initialGroups);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");

  // One-time migration: if the server has no groups yet but this browser still
  // holds some from before groups moved server-side, adopt them. The debounced
  // save effect below then persists them up to the server.
  const migrated = useRef(false);
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    if (initialGroups.length > 0) return;
    const local = loadFriendGroups(meId);
    if (local.length === 0) return;
    // Defer the write out of the effect body so it doesn't cascade-render.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setGroups(local);
    });
    return () => {
      cancelled = true;
    };
  }, [initialGroups, meId]);

  // Persist to the server shortly after edits settle. Skips the initial mount so
  // we don't immediately re-write the groups we were just handed.
  const skipSave = useRef(true);
  // Latest groups + whether a debounced save is still pending, so we can flush on
  // unmount instead of dropping an edit made within the 400ms window when the
  // user navigates away.
  const latestGroupsRef = useRef(groups);
  const pendingSaveRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    latestGroupsRef.current = groups;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    pendingSaveRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      pendingSaveRef.current = false;
      void saveFriendGroupsAction(groups);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [groups]);

  // On unmount (e.g. a soft navigation to another page), flush any pending
  // debounced save so an edit made just before leaving isn't lost. Also flush
  // when the tab is hidden as a best effort for hard unloads. flush() cancels
  // the still-armed debounce timer so it can't fire a second, redundant save.
  useEffect(() => {
    function flush() {
      if (!pendingSaveRef.current) return;
      pendingSaveRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void saveFriendGroupsAction(latestGroupsRef.current);
    }
    function onHide() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, []);

  // Live friend ids, used to count only still-current members of a group.
  const friendIdSet = useMemo(
    () => new Set(friends.map((f) => f.id)),
    [friends]
  );

  const q = query.trim().toLowerCase();
  const shownFriends = useMemo(() => {
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    );
  }, [friends, q]);

  function createGroup() {
    const name = newName.trim();
    if (!name) return;
    const group: FriendGroup = { id: makeGroupId(), name, userIds: [] };
    setGroups((prev) => [...prev, group]);
    setNewName("");
    setEditingId(group.id);
    setQuery("");
  }

  function renameGroup(id: string, name: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  }

  function deleteGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function toggleMember(groupId: string, userId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const has = g.userIds.includes(userId);
        return {
          ...g,
          userIds: has
            ? g.userIds.filter((id) => id !== userId)
            : [...g.userIds, userId],
        };
      })
    );
  }

  function toggleEditing(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
    setQuery("");
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm uppercase tracking-widest text-white/60">
          Groups
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Save sets of friends, then filter your daily graph by a group from the
          home page. Groups sync across your devices.
        </p>
      </section>

      {friends.length === 0 ? (
        <p className="text-sm text-white/50">
          Add some friends first — then you can group them here.
        </p>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createGroup();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New group name"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={newName.trim() === ""}
              className="shrink-0 rounded-md border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create
            </button>
          </form>

          {groups.length === 0 ? (
            <p className="text-sm text-white/50">No groups yet.</p>
          ) : (
            <ul className="space-y-2">
              {groups.map((group) => {
                const isEditing = group.id === editingId;
                // Count only ids that are still current friends, so a stale
                // member left behind by an old build can't overstate the count.
                const memberCount = group.userIds.filter((id) =>
                  friendIdSet.has(id)
                ).length;
                return (
                  <li
                    key={group.id}
                    className="rounded-md border border-white/10 bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm">{group.name}</div>
                        <div className="text-xs text-white/50">
                          {memberCount}{" "}
                          {memberCount === 1 ? "friend" : "friends"}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <GroupButton onClick={() => toggleEditing(group.id)}>
                          {isEditing ? "Done" : "Edit"}
                        </GroupButton>
                        <GroupButton onClick={() => deleteGroup(group.id)}>
                          Delete
                        </GroupButton>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t border-white/10 p-3">
                        <label className="block text-xs uppercase tracking-widest text-white/50">
                          Name
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) =>
                              renameGroup(group.id, e.target.value)
                            }
                            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
                          />
                        </label>

                        <input
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          autoComplete="off"
                          placeholder="Search friends to add"
                          className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
                        />

                        <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-white/10">
                          {shownFriends.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-white/50">
                              No friends match this search.
                            </div>
                          ) : (
                            <ul className="divide-y divide-white/10">
                              {shownFriends.map((friend) => {
                                const checked = group.userIds.includes(
                                  friend.id
                                );
                                return (
                                  <li key={friend.id}>
                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-white/[0.04]">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          toggleMember(group.id, friend.id)
                                        }
                                        className="h-4 w-4 accent-white"
                                      />
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{
                                          backgroundColor: colorFor(friend.id),
                                          boxShadow: `0 0 10px ${colorFor(
                                            friend.id
                                          )}`,
                                        }}
                                      />
                                      <span className="min-w-0 truncate">
                                        <span
                                          className={
                                            checked
                                              ? "text-white"
                                              : "text-white/60"
                                          }
                                        >
                                          {friend.displayName}
                                        </span>{" "}
                                        <span className="text-white/40">
                                          @{friend.username}
                                        </span>
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function GroupButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
    >
      {children}
    </button>
  );
}
