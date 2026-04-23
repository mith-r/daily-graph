"use client";

import { useCallback, useEffect, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Dot } from "@/components/Dot";
import { Heatmap } from "@/components/Heatmap";
import { PromptHeader } from "@/components/PromptHeader";
import type { PublicUser, TodayResponse } from "@/lib/types";

type Props = {
  me: PublicUser;
  initial: TodayResponse;
};

type Mode = "friends" | "everyone";

export function HomeClient({ me, initial }: Props) {
  const [data, setData] = useState<TodayResponse>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("friends");

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/today", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TodayResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    }
  }, []);

  useEffect(() => {
    if (!data.myPlacement) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
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

  const placed = !!data.myPlacement;

  return (
    <>
      <PromptHeader date={data.date} placed={placed} />

      {placed && (
        <div className="flex justify-center mb-6">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      )}

      {error && (
        <div className="text-center text-red-400 mt-6 text-sm">{error}</div>
      )}

      <GraphCanvas
        prompt={data.prompt}
        onPlace={handlePlace}
        disabled={placed || submitting}
      >
        {placed && mode === "everyone" && <Heatmap data={data.heatmap} />}

        {placed && mode === "friends" &&
          data.others.map((p) => (
            <Dot
              key={p.userId}
              x={p.x}
              y={p.y}
              label={p.displayName}
              userId={p.userId}
            />
          ))}

        {placed && data.myPlacement && (
          <Dot
            x={data.myPlacement.x}
            y={data.myPlacement.y}
            label={data.myPlacement.displayName}
            userId={me.id}
            isMe
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

      {placed && mode === "everyone" && (
        <p className="mt-10 text-center text-xs text-white/40">
          {data.heatmap.total === 1
            ? "You're the first one today."
            : `${data.heatmap.total} people have placed.`}
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
