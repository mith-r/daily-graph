"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Dot } from "@/components/Dot";
import { Heatmap } from "@/components/Heatmap";
import { NudgeMarker } from "@/components/NudgeMarker";
import { NudgeLines, type NudgeLine } from "@/components/NudgeLines";
import { PromptHeader } from "@/components/PromptHeader";
import { RegressionLine } from "@/components/RegressionLine";
import { assignColors, colorFor } from "@/lib/graph";
import { principalAxisLine, type Point } from "@/lib/regression";
import type { PublicUser, TodayResponse } from "@/lib/types";

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

export function HomeClient({ me, initial }: Props) {
  const [data, setData] = useState<TodayResponse>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("friends");
  const [nudging, setNudging] = useState<Nudging | null>(null);
  // Tap-to-focus: a friend's userId isolates that friend's lines; me.id
  // isolates all incoming nudges ("who moved me"); null shows everything.
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef(data);
  const nudgingRef = useRef(nudging);
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

  // Effective focus, derived rather than stored: if the focused friend drops
  // out of the response (e.g. across a poll) the focus reads as cleared without
  // a setState-in-effect. Focusing my own dot (me.id) always persists.
  const effectiveFocusedId = useMemo(() => {
    if (focusedId == null || focusedId === me.id) return focusedId;
    return data.others.some((p) => p.userId === focusedId) ? focusedId : null;
  }, [focusedId, data.others, me.id]);

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

  // Compute effective nudges (saved myNudge OR live drag) for rendering.
  const myNudgeMarkers = useMemo(() => {
    return data.others
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
  }, [data.others, nudging]);

  const friendById = useMemo(
    () => new Map(data.others.map((p) => [p.userId, p])),
    [data.others]
  );

  // The nudge lines + endpoint markers to draw, as an exact set chosen by the
  // current focus state:
  //   no focus  → where I moved others (my outgoing nudges)
  //   focus me  → who moved me (incoming nudges on me)
  //   focus X   → who moved X (every nudge targeting friend X: mine + friends')
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
      // Who moved me.
      if (data.myPlacement) {
        for (const nudge of data.nudgesOnMe) {
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
      const x = friendById.get(focus);
      if (x) {
        const targeting: { nudgerUserId: string; dx: number; dy: number }[] = [];
        if (x.myNudge) {
          targeting.push({ nudgerUserId: me.id, ...x.myNudge });
        }
        for (const n of x.nudgesFromFriends ?? []) {
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
    colorOf,
    me.id,
  ]);

  const regression = useMemo(() => {
    if (!placed) return null;
    if (mode === "friends") {
      const points: Point[] = data.others.map((p) => ({ x: p.x, y: p.y }));
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
  }, [placed, mode, data]);

  return (
    <>
      <PromptHeader date={data.date} placed={placed} />

      {placed && (
        <div className="flex justify-center mb-6">
          <ModeToggle mode={mode} onChange={changeMode} />
        </div>
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
          data.others.map((p) => (
            <Dot
              key={p.userId}
              x={p.x}
              y={p.y}
              label={p.displayName}
              userId={p.userId}
              color={colorOf(p.userId)}
              avatar={p.avatar}
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
          Hold a friend&apos;s dot and drag to nudge them. Tap any dot to see who
          moved it — tap yourself to see who moved you.
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
