"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Dot } from "@/components/Dot";
import { Heatmap } from "@/components/Heatmap";
import { NudgeMarker } from "@/components/NudgeMarker";
import { NudgeLines, type NudgeLine } from "@/components/NudgeLines";
import { PromptHeader } from "@/components/PromptHeader";
import { RegressionLine } from "@/components/RegressionLine";
import { clampAvatarScale } from "@/lib/avatar";
import { assignColors, colorFor } from "@/lib/graph";
import { principalAxisLine, type Point } from "@/lib/regression";
import type { PlacementWithNudge, PublicUser, TodayResponse } from "@/lib/types";
import {
  ALL_FRIENDS_GROUP_ID,
  friendGroupStorageKey,
  friendSelectionStorageKey,
  parseFriendGroups,
  type FriendGroup,
} from "@/lib/friendGroups";

type Props = {
  me: PublicUser;
  initial: TodayResponse;
};

type Mode = "friends" | "everyone";

type Nudging = {
  targetUserId: string;
  dx: number;
  dy: number;
};

const NUDGE_REMOVE_THRESHOLD = 0.025; // |offset| under this on release → remove

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function HomeClient({ me, initial }: Props) {
  const [data, setData] = useState<TodayResponse>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("friends");
  const [nudging, setNudging] = useState<Nudging | null>(null);
  // Tap-to-focus: a friend's userId isolates that friend's lines; me.id
  // isolates all incoming nudges ("who moved me"); null shows everything.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(
    () => new Set(initial.others.map((p) => p.userId))
  );
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState(ALL_FRIENDS_GROUP_ID);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  // The filter panel is collapsed by default so it stays out of the way; the
  // user opens it when they want to narrow the graph. Groups are *applied* here
  // but created/edited over in Friends → Groups.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef(data);
  const nudgingRef = useRef(nudging);
  const friendIdsRef = useRef<Set<string>>(
    new Set(initial.others.map((p) => p.userId))
  );
  // Per-friend optimistic state for nudge POSTs/DELETEs that haven't returned
  // yet. A value means "pending save"; null means "pending delete". Lets us
  // merge server responses without clobbering other in-flight nudges.
  const inflightNudgesRef = useRef<
    Map<string, { dx: number; dy: number } | null>
  >(new Map());
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    nudgingRef.current = nudging;
  }, [nudging]);

  // Keep the filter selection in sync as friends place/unplace: drop anyone who
  // left the response, and auto-select any newly-placed friend so new dots show
  // by default.
  useEffect(() => {
    const currentIds = new Set(data.others.map((p) => p.userId));
    setSelectedFriendIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (currentIds.has(id)) next.add(id);
      }
      for (const id of currentIds) {
        if (!friendIdsRef.current.has(id)) next.add(id);
      }
      return setsEqual(prev, next) ? prev : next;
    });
    friendIdsRef.current = currentIds;
  }, [data.others]);

  // Load saved groups + selection from this browser once on mount.
  useEffect(() => {
    const currentIds = new Set(dataRef.current.others.map((p) => p.userId));
    let loadedGroups: FriendGroup[] | null = null;
    let loadedSelection: Set<string> | null = null;
    let cancelled = false;

    try {
      loadedGroups = parseFriendGroups(
        localStorage.getItem(friendGroupStorageKey(me.id))
      );

      const rawSelection = localStorage.getItem(
        friendSelectionStorageKey(me.id)
      );
      if (rawSelection) {
        const parsed = JSON.parse(rawSelection) as unknown;
        if (Array.isArray(parsed)) {
          loadedSelection = new Set(
            parsed.filter(
              (id): id is string =>
                typeof id === "string" && currentIds.has(id)
            )
          );
        }
      }
    } catch {
      // Ignore malformed browser storage and fall back to showing all friends.
    } finally {
      queueMicrotask(() => {
        if (cancelled) return;
        if (loadedGroups) setFriendGroups(loadedGroups);
        if (loadedSelection) setSelectedFriendIds(loadedSelection);
        setFiltersLoaded(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [me.id]);

  useEffect(() => {
    if (!filtersLoaded) return;
    localStorage.setItem(
      friendSelectionStorageKey(me.id),
      JSON.stringify([...selectedFriendIds])
    );
  }, [filtersLoaded, me.id, selectedFriendIds]);

  // Switching modes clears any focus so it can't leak into "everyone".
  const changeMode = useCallback((m: Mode) => {
    setMode(m);
    setFocusedId(null);
  }, []);

  // Apply any in-flight optimistic nudges on top of a server response so a
  // response that was generated before another nudge was processed doesn't
  // erase that other nudge's optimistic state.
  const withInflight = useCallback((json: TodayResponse): TodayResponse => {
    const inflight = inflightNudgesRef.current;
    if (inflight.size === 0) return json;
    return {
      ...json,
      others: json.others.map((p) => {
        if (!inflight.has(p.userId)) return p;
        const opt = inflight.get(p.userId);
        return opt ? { ...p, myNudge: opt } : { ...p, myNudge: undefined };
      }),
    };
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/today", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TodayResponse;
      setData(withInflight(json));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    }
  }, [withInflight]);

  useEffect(() => {
    if (!data.myPlacement) return;
    const id = setInterval(() => {
      // Don't refresh mid-drag; it would race with the optimistic update.
      if (
        document.visibilityState === "visible" &&
        nudgingRef.current === null
      ) {
        fetchToday();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [data.myPlacement, fetchToday]);

  async function handlePlace(coords: { x: number; y: number }) {
    if (submitting || data.myPlacement) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(coords),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TodayResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to place");
    } finally {
      setSubmitting(false);
    }
  }

  // Active drag: install global pointer listeners while nudging != null.
  // Re-runs only when targetUserId changes, so per-frame setNudging during
  // the drag doesn't tear down listeners.
  useEffect(() => {
    if (!nudging) return;
    const targetUserId = nudging.targetUserId;

    // Lock body scroll so iOS Safari can't scroll the page out from under
    // the drag — that would shift getBoundingClientRect() mid-gesture and
    // throw off the marker position.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function clampUnit(v: number) {
      return Math.max(-1, Math.min(1, v));
    }

    function onMove(e: PointerEvent) {
      // Suppress any residual scroll/zoom the browser would otherwise do.
      if (e.cancelable) e.preventDefault();
      const target = dataRef.current.others.find(
        (p) => p.userId === targetUserId
      );
      if (!target || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const x = clampUnit(px * 2 - 1);
      const y = clampUnit(1 - py * 2);
      setNudging({
        targetUserId,
        dx: x - target.x,
        dy: y - target.y,
      });
    }

    async function onUp() {
      const current = nudgingRef.current;
      setNudging(null);
      if (!current) return;
      const target = dataRef.current.others.find(
        (p) => p.userId === targetUserId
      );
      if (!target) return;

      const isRemove =
        Math.hypot(current.dx, current.dy) < NUDGE_REMOVE_THRESHOLD;

      // Optimistic update so the marker doesn't flicker. Also stash the
      // optimistic state in inflightNudgesRef so any server response that
      // races with this in-flight POST (another POST returning, or polling)
      // doesn't overwrite it.
      const optimistic = isRemove ? null : { dx: current.dx, dy: current.dy };
      inflightNudgesRef.current.set(targetUserId, optimistic);
      setData((prev) => ({
        ...prev,
        others: prev.others.map((p) =>
          p.userId === targetUserId
            ? optimistic
              ? { ...p, myNudge: optimistic }
              : { ...p, myNudge: undefined }
            : p
        ),
      }));

      try {
        const res = isRemove
          ? await fetch(
              `/api/nudges?targetUserId=${encodeURIComponent(targetUserId)}`,
              { method: "DELETE" }
            )
          : await fetch("/api/nudges", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                targetUserId,
                dx: current.dx,
                dy: current.dy,
              }),
            });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as TodayResponse;
        // Drop our entry before merging so the response is authoritative for
        // this target; other still-pending entries get preserved by withInflight.
        inflightNudgesRef.current.delete(targetUserId);
        setData(withInflight(json));
        setError(null);
      } catch (e) {
        // On failure, drop the optimistic entry and refetch to revert.
        inflightNudgesRef.current.delete(targetUserId);
        setError(e instanceof Error ? e.message : "nudge failed");
        fetchToday();
      }
    }

    // passive: false is required so e.preventDefault() in onMove works.
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.overflow = prevOverflow;
    };
    // Intentionally only depend on targetUserId — the drag's per-frame state
    // updates flow through dataRef and nudgingRef so they don't reinstall
    // listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudging?.targetUserId]);

  const handleLongPress = useCallback(
    (targetUserId: string, clientX: number, clientY: number) => {
      // A nudge is "where I moved others" — clear any focus so the live drag
      // renders in the default view instead of fighting the focused set.
      setFocusedId(null);
      // Compute initial dx/dy from the long-press location relative to the
      // target's actual position, so the drag starts at the finger.
      if (!canvasRef.current) {
        setNudging({ targetUserId, dx: 0, dy: 0 });
        return;
      }
      const target = dataRef.current.others.find(
        (p) => p.userId === targetUserId
      );
      if (!target) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const x = Math.max(-1, Math.min(1, px * 2 - 1));
      const y = Math.max(-1, Math.min(1, 1 - py * 2));
      setNudging({
        targetUserId,
        dx: x - target.x,
        dy: y - target.y,
      });
    },
    []
  );

  const placed = !!data.myPlacement;

  // My chosen graph density, applied to every dot in my view.
  const avatarScale = clampAvatarScale(me.avatarScale);

  // Assign colors across the whole visible peer set (friend dots + anyone who
  // nudged me) so they're spread apart and two friends never read as the same
  // color. A given user keeps one consistent color across their dot, line, and
  // marker. Falls back to colorFor() for ids not in the set (e.g. "me").
  const colorMap = useMemo(
    () =>
      assignColors([
        ...data.others.map((p) => p.userId),
        ...data.nudgesOnMe.map((n) => n.nudgerUserId),
      ]),
    [data.others, data.nudgesOnMe]
  );
  const colorOf = useCallback(
    (userId: string) => colorMap.get(userId) ?? colorFor(userId),
    [colorMap]
  );

  // The roster the filter panel works within: a selected group narrows it to
  // that group's members (intersected with who's placed today); "All friends"
  // is everyone. Non-members never appear here — group membership is edited
  // only in Friends → Groups, never on this page.
  const groupRoster = useMemo(() => {
    if (activeGroupId === ALL_FRIENDS_GROUP_ID) return data.others;
    const group = friendGroups.find((g) => g.id === activeGroupId);
    if (!group) return data.others;
    const memberIds = new Set(group.userIds);
    return data.others.filter((p) => memberIds.has(p.userId));
  }, [activeGroupId, friendGroups, data.others]);

  // The visible friend set: group roster, narrowed by search + checkbox
  // selection. This is the set every downstream view (dots, focus lines,
  // regression) operates on, so filtering a friend out removes them from the
  // graph entirely.
  const normalizedFriendQuery = friendQuery.trim().toLowerCase();
  const searchedFriends = useMemo(() => {
    if (!normalizedFriendQuery) return groupRoster;
    return groupRoster.filter((p) =>
      p.displayName.toLowerCase().includes(normalizedFriendQuery)
    );
  }, [groupRoster, normalizedFriendQuery]);
  const visibleFriends = useMemo(
    () => searchedFriends.filter((p) => selectedFriendIds.has(p.userId)),
    [searchedFriends, selectedFriendIds]
  );
  const visibleFriendIds = useMemo(
    () => new Set(visibleFriends.map((p) => p.userId)),
    [visibleFriends]
  );

  // Effective focus, derived rather than stored: if the focused friend drops
  // out of the visible set (filtered out, or gone across a poll) the focus
  // reads as cleared without a setState-in-effect. Focusing my own dot (me.id)
  // always persists.
  const effectiveFocusedId = useMemo(() => {
    if (focusedId == null || focusedId === me.id) return focusedId;
    return visibleFriendIds.has(focusedId) ? focusedId : null;
  }, [focusedId, visibleFriendIds, me.id]);

  const selectFriends = useCallback((userIds: string[]) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      for (const id of userIds) next.add(id);
      return setsEqual(prev, next) ? prev : next;
    });
  }, []);

  const deselectFriends = useCallback((userIds: string[]) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      for (const id of userIds) next.delete(id);
      return setsEqual(prev, next) ? prev : next;
    });
  }, []);

  const toggleFriend = useCallback((userId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const applyGroup = useCallback(
    (groupId: string) => {
      setActiveGroupId(groupId);
      if (groupId === ALL_FRIENDS_GROUP_ID) {
        setSelectedFriendIds(new Set(data.others.map((p) => p.userId)));
        return;
      }
      const group = friendGroups.find((g) => g.id === groupId);
      if (!group) return;
      const currentIds = new Set(data.others.map((p) => p.userId));
      setSelectedFriendIds(
        new Set(group.userIds.filter((id) => currentIds.has(id)))
      );
    },
    [data.others, friendGroups]
  );

  // Compute effective nudges (saved myNudge OR live drag) for rendering, over
  // the visible set only.
  const myNudgeMarkers = useMemo(() => {
    return visibleFriends
      .map((p) => {
        const live =
          nudging?.targetUserId === p.userId
            ? { dx: nudging.dx, dy: nudging.dy }
            : null;
        const eff = live ?? p.myNudge ?? null;
        if (!eff) return null;
        return { friendId: p.userId, baseX: p.x, baseY: p.y, ...eff };
      })
      .filter(<T,>(n: T | null): n is T => n !== null);
  }, [visibleFriends, nudging]);

  const friendById = useMemo(
    () => new Map(visibleFriends.map((p) => [p.userId, p])),
    [visibleFriends]
  );

  // The nudge lines + endpoint markers to draw, as an exact set chosen by the
  // current focus state — restricted throughout to the visible friend set:
  //   no focus  → where I moved others (my outgoing nudges)
  //   focus me  → who moved me (incoming nudges from visible friends)
  //   focus X   → who moved X (mine + visible friends' nudges targeting X)
  const { lines, markers } = useMemo(() => {
    const lines: NudgeLine[] = [];
    // My own nudge markers are white to match my white outgoing lines; markers
    // for other nudgers carry that nudger's set-aware color.
    const markers: {
      key: string;
      x: number;
      y: number;
      nudgerUserId: string;
      color?: string;
      focused?: boolean;
    }[] = [];
    const focus = effectiveFocusedId;

    if (focus == null) {
      // Default: where I moved others (saved nudges + any live drag).
      for (const n of myNudgeMarkers) {
        const isLive = nudging?.targetUserId === n.friendId;
        lines.push({
          id: `out-${n.friendId}`,
          fromX: n.baseX,
          fromY: n.baseY,
          toX: n.baseX + n.dx,
          toY: n.baseY + n.dy,
          color: "white",
          opacity: isLive ? 0.7 : 0.4,
        });
        markers.push({
          key: `mine-${n.friendId}`,
          x: n.baseX + n.dx,
          y: n.baseY + n.dy,
          nudgerUserId: me.id,
          color: "white",
        });
      }
    } else if (focus === me.id) {
      // Who moved me — only nudges from currently-visible friends.
      if (data.myPlacement) {
        for (const nudge of data.nudgesOnMe) {
          if (!visibleFriendIds.has(nudge.nudgerUserId)) continue;
          lines.push({
            id: `in-${nudge.nudgerUserId}`,
            fromX: data.myPlacement.x,
            fromY: data.myPlacement.y,
            toX: data.myPlacement.x + nudge.dx,
            toY: data.myPlacement.y + nudge.dy,
            color: colorOf(nudge.nudgerUserId),
            opacity: 0.4,
            focused: true,
          });
          markers.push({
            key: `onme-${nudge.nudgerUserId}`,
            x: data.myPlacement.x + nudge.dx,
            y: data.myPlacement.y + nudge.dy,
            nudgerUserId: nudge.nudgerUserId,
            color: colorOf(nudge.nudgerUserId),
            focused: true,
          });
        }
      }
    } else {
      // Who moved friend X: every nudge targeting X, drawn from X's position.
      // Mine always counts; friends' nudges only if that friend is visible.
      const x = friendById.get(focus);
      if (x) {
        const targeting: { nudgerUserId: string; dx: number; dy: number }[] = [];
        if (x.myNudge) {
          targeting.push({ nudgerUserId: me.id, ...x.myNudge });
        }
        for (const n of x.nudgesFromFriends ?? []) {
          if (!visibleFriendIds.has(n.nudgerUserId)) continue;
          targeting.push({ nudgerUserId: n.nudgerUserId, dx: n.dx, dy: n.dy });
        }
        for (const n of targeting) {
          const isMine = n.nudgerUserId === me.id;
          lines.push({
            id: `to-${x.userId}-${n.nudgerUserId}`,
            fromX: x.x,
            fromY: x.y,
            toX: x.x + n.dx,
            toY: x.y + n.dy,
            color: isMine ? "white" : colorOf(n.nudgerUserId),
            opacity: 0.4,
            focused: true,
          });
          markers.push({
            key: `to-${x.userId}-${n.nudgerUserId}`,
            x: x.x + n.dx,
            y: x.y + n.dy,
            nudgerUserId: n.nudgerUserId,
            color: isMine ? "white" : colorOf(n.nudgerUserId),
            focused: true,
          });
        }
      }
    }

    return { lines, markers };
  }, [
    effectiveFocusedId,
    myNudgeMarkers,
    nudging,
    data.myPlacement,
    data.nudgesOnMe,
    friendById,
    visibleFriendIds,
    colorOf,
    me.id,
  ]);

  const regression = useMemo(() => {
    if (!placed) return null;
    if (mode === "friends") {
      const points: Point[] = visibleFriends.map((p) => ({ x: p.x, y: p.y }));
      if (data.myPlacement) {
        points.push({ x: data.myPlacement.x, y: data.myPlacement.y });
      }
      return principalAxisLine(points);
    }
    const { cols, rows, grid } = data.heatmap;
    const points: Point[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const count = grid[row * cols + col];
        if (!count) continue;
        points.push({
          x: ((col + 0.5) / cols) * 2 - 1,
          y: 1 - ((row + 0.5) / rows) * 2,
          weight: count,
        });
      }
    }
    return principalAxisLine(points);
  }, [placed, mode, data, visibleFriends]);

  return (
    <>
      <PromptHeader date={data.date} placed={placed} />

      {placed && (
        <div
          className={`flex items-center justify-center gap-2 ${
            filtersOpen ? "mb-6" : "mb-10"
          }`}
        >
          <ModeToggle mode={mode} onChange={changeMode} />
          {mode === "friends" && data.others.length > 0 && (
            <FilterToggle
              open={filtersOpen}
              filtering={visibleFriends.length !== data.others.length}
              count={visibleFriends.length}
              total={data.others.length}
              onToggle={() => setFiltersOpen((v) => !v)}
            />
          )}
        </div>
      )}

      {placed && mode === "friends" && data.others.length > 0 && filtersOpen && (
        <FriendFilters
          friends={groupRoster}
          searchedFriends={searchedFriends}
          visibleFriends={visibleFriends}
          selectedFriendIds={selectedFriendIds}
          query={friendQuery}
          groups={friendGroups}
          activeGroupId={activeGroupId}
          colorOf={colorOf}
          onQueryChange={setFriendQuery}
          onSelect={selectFriends}
          onDeselect={deselectFriends}
          onToggleFriend={toggleFriend}
          onGroupChange={applyGroup}
        />
      )}

      {error && (
        <div className="text-center text-red-400 mt-6 text-sm">{error}</div>
      )}

      <GraphCanvas
        prompt={data.prompt}
        onPlace={handlePlace}
        disabled={placed || submitting}
        canvasRef={canvasRef}
        onBackgroundTap={() => setFocusedId(null)}
      >
        {placed && mode === "everyone" && <Heatmap data={data.heatmap} />}

        {regression && <RegressionLine segment={regression} />}

        {placed && mode === "friends" && <NudgeLines lines={lines} />}

        {placed &&
          mode === "friends" &&
          visibleFriends.map((p) => (
            <Dot
              key={p.userId}
              x={p.x}
              y={p.y}
              label={p.displayName}
              userId={p.userId}
              color={colorOf(p.userId)}
              avatar={p.avatar}
              scale={avatarScale}
              onLongPressStart={(cx, cy) => handleLongPress(p.userId, cx, cy)}
              onTap={() =>
                setFocusedId((cur) => (cur === p.userId ? null : p.userId))
              }
              beingNudged={nudging?.targetUserId === p.userId}
              dimmed={
                effectiveFocusedId != null && effectiveFocusedId !== p.userId
              }
              focused={effectiveFocusedId === p.userId}
            />
          ))}

        {placed &&
          mode === "friends" &&
          markers.map((m) => (
            <NudgeMarker
              key={m.key}
              x={m.x}
              y={m.y}
              nudgerUserId={m.nudgerUserId}
              color={m.color}
              focused={m.focused}
            />
          ))}

        {placed &&
          mode === "everyone" &&
          data.celebrities.map((c) => (
            <Dot
              key={c.userId}
              x={c.x}
              y={c.y}
              label={c.displayName}
              userId={c.userId}
              scale={avatarScale}
              isCelebrity
            />
          ))}

        {placed && data.myPlacement && (
          <Dot
            x={data.myPlacement.x}
            y={data.myPlacement.y}
            label={data.myPlacement.displayName}
            userId={me.id}
            avatar={data.myPlacement.avatar}
            scale={avatarScale}
            isMe
            onTap={
              mode === "friends"
                ? () => setFocusedId((cur) => (cur === me.id ? null : me.id))
                : undefined
            }
            dimmed={effectiveFocusedId != null && effectiveFocusedId !== me.id}
            focused={effectiveFocusedId === me.id}
          />
        )}
      </GraphCanvas>

      {placed && mode === "friends" && data.others.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/50">
          You&apos;re the only one of your friends who&apos;s placed so far.{" "}
          <a href="/friends" className="underline hover:text-white/80">
            Add friends →
          </a>
        </p>
      )}

      {placed && mode === "friends" && data.others.length > 0 && (
        <p className="mt-6 text-center text-xs text-white/40">
          {visibleFriends.length === 0
            ? "No friends match the current filters."
            : "Hold a friend's dot and drag to nudge them. Tap any dot to see who moved it — tap yourself to see who moved you."}
        </p>
      )}

      {placed && mode === "everyone" && (
        <p className="mt-10 text-center text-xs text-white/40">
          {data.heatmap.total === 0
            ? "You're the first one today."
            : `${data.heatmap.total + 1} people have placed.`}
          {data.celebrities.length > 0 && (
            <>
              {" "}
              <span className="text-amber-200/70">
                ✨ are today&apos;s celebrities.
              </span>
            </>
          )}
        </p>
      )}

      {placed && (
        <p className="mt-6 text-center text-sm">
          <a
            href="/vote"
            className="text-white/60 hover:text-white transition"
          >
            Vote on tomorrow&apos;s prompt →
          </a>
        </p>
      )}
    </>
  );
}

function FilterToggle({
  open,
  filtering,
  count,
  total,
  onToggle,
}: {
  open: boolean;
  filtering: boolean;
  count: number;
  total: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label="Filter friend dots"
      title="Filter friend dots"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
        open
          ? "border-white/30 bg-white/10 text-white"
          : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/25 hover:text-white/80"
      }`}
    >
      <FilterIcon />
      {filtering && (
        <span className={open ? "text-white" : "text-white/75"}>
          {count}/{total}
        </span>
      )}
    </button>
  );
}

function FriendFilters({
  friends,
  searchedFriends,
  visibleFriends,
  selectedFriendIds,
  query,
  groups,
  activeGroupId,
  colorOf,
  onQueryChange,
  onSelect,
  onDeselect,
  onToggleFriend,
  onGroupChange,
}: {
  friends: PlacementWithNudge[];
  searchedFriends: PlacementWithNudge[];
  visibleFriends: PlacementWithNudge[];
  selectedFriendIds: Set<string>;
  query: string;
  groups: FriendGroup[];
  activeGroupId: string;
  colorOf: (userId: string) => string;
  onQueryChange: (query: string) => void;
  onSelect: (userIds: string[]) => void;
  onDeselect: (userIds: string[]) => void;
  onToggleFriend: (userId: string) => void;
  onGroupChange: (groupId: string) => void;
}) {
  const searchedIds = searchedFriends.map((p) => p.userId);

  return (
    <section className="mb-10 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs uppercase tracking-widest text-white/50">
          Search dots
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoComplete="off"
            placeholder="Filter by friend name"
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder-white/30 outline-none focus:border-white/40"
          />
        </label>

        <label className="sm:w-44 text-xs uppercase tracking-widest text-white/50">
          Group
          <select
            value={activeGroupId}
            onChange={(e) => onGroupChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
          >
            <option value={ALL_FRIENDS_GROUP_ID}>All friends</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {visibleFriends.length} of {friends.length} placed friends
          {query.trim() !== "" && ` (${searchedFriends.length} match search)`}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            onClick={() => onSelect(searchedIds)}
            disabled={searchedIds.length === 0}
          >
            Select shown
          </FilterButton>
          <FilterButton
            onClick={() => onDeselect(searchedIds)}
            disabled={searchedIds.length === 0}
          >
            Deselect shown
          </FilterButton>
          {query.trim() !== "" && (
            <FilterButton onClick={() => onQueryChange("")}>
              Clear search
            </FilterButton>
          )}
        </div>
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-white/10">
        {searchedFriends.length === 0 ? (
          <div className="px-3 py-3 text-sm text-white/50">
            {query.trim() !== ""
              ? "No placed friends match this search."
              : "No one in this group has placed today."}
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {searchedFriends.map((friend) => {
              const checked = selectedFriendIds.has(friend.userId);
              return (
                <li key={friend.userId}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-white/[0.04]">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleFriend(friend.userId)}
                      className="h-4 w-4 accent-white"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: colorOf(friend.userId),
                        boxShadow: `0 0 10px ${colorOf(friend.userId)}`,
                      }}
                    />
                    <span className={checked ? "text-white" : "text-white/45"}>
                      {friend.displayName}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-white/40">
        Create and edit groups in{" "}
        <a
          href="/friends"
          className="underline underline-offset-2 hover:text-white/70"
        >
          Friends → Groups
        </a>
        .
      </p>
    </section>
  );
}

function FilterIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

function FilterButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.02] p-0.5 text-xs">
      <ToggleButton active={mode === "friends"} onClick={() => onChange("friends")}>
        Friends
      </ToggleButton>
      <ToggleButton
        active={mode === "everyone"}
        onClick={() => onChange("everyone")}
      >
        Everyone
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full transition ${
        active
          ? "bg-white text-neutral-900 font-medium"
          : "text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
