"use client";

import { useCallback, useEffect, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Dot } from "@/components/Dot";
import { PromptHeader } from "@/components/PromptHeader";
import type { PublicUser, TodayResponse } from "@/lib/types";

type Props = {
  me: PublicUser;
  initial: TodayResponse;
};

export function HomeClient({ me, initial }: Props) {
  const [data, setData] = useState<TodayResponse>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Poll for friend placements after I've placed.
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

      {error && (
        <div className="text-center text-red-400 mt-6 text-sm">{error}</div>
      )}

      <GraphCanvas
        prompt={data.prompt}
        onPlace={handlePlace}
        disabled={placed || submitting}
      >
        {placed && data.myPlacement && (
          <Dot
            x={data.myPlacement.x}
            y={data.myPlacement.y}
            label={data.myPlacement.displayName}
            userId={me.id}
            isMe
          />
        )}
        {placed &&
          data.others.map((p) => (
            <Dot
              key={p.userId}
              x={p.x}
              y={p.y}
              label={p.displayName}
              userId={p.userId}
            />
          ))}
      </GraphCanvas>

      {placed && data.others.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/50">
          You&apos;re the only one of your friends who&apos;s placed so far.{" "}
          <a href="/friends" className="underline hover:text-white/80">
            Add friends →
          </a>
        </p>
      )}
    </>
  );
}
