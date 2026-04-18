"use client";

import { useCallback, useEffect, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Dot } from "@/components/Dot";
import { PromptHeader } from "@/components/PromptHeader";
import { NameModal } from "@/components/NameModal";
import type { TodayResponse } from "@/lib/types";

const USER_ID_KEY = "userId";
const DISPLAY_NAME_KEY = "displayName";

function ensureUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [data, setData] = useState<TodayResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap identity on mount.
  useEffect(() => {
    const id = ensureUserId();
    setUserId(id);
    const name = localStorage.getItem(DISPLAY_NAME_KEY);
    if (name) setDisplayName(name);
  }, []);

  const fetchToday = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/today?userId=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as TodayResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    }
  }, []);

  // Initial fetch.
  useEffect(() => {
    if (!userId) return;
    fetchToday(userId);
  }, [userId, fetchToday]);

  // Poll for others' placements after we've placed.
  useEffect(() => {
    if (!userId || !data?.myPlacement) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchToday(userId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [userId, data?.myPlacement, fetchToday]);

  async function handlePlace(coords: { x: number; y: number }) {
    if (!userId || !displayName || submitting || data?.myPlacement) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, displayName, ...coords }),
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

  function handleNameSubmit(name: string) {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
    setDisplayName(name);
  }

  function handleChangeName() {
    setDisplayName(null);
  }

  const placed = !!data?.myPlacement;

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-12">
        {data && <PromptHeader date={data.date} placed={placed} />}

        {!data && !error && (
          <div className="text-center text-white/50 mt-24">Loading…</div>
        )}

        {error && (
          <div className="text-center text-red-400 mt-24 text-sm">
            {error}. Check that the server is configured.
          </div>
        )}

        {data && (
          <GraphCanvas
            prompt={data.prompt}
            onPlace={handlePlace}
            disabled={placed || submitting || !displayName}
          >
            {placed && userId && data.myPlacement && (
              <Dot
                x={data.myPlacement.x}
                y={data.myPlacement.y}
                label={data.myPlacement.displayName}
                userId={userId}
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
        )}

        {displayName && (
          <div className="mt-16 text-center text-xs text-white/40">
            signed in as <span className="text-white/70">{displayName}</span>
            {" · "}
            <button
              onClick={handleChangeName}
              className="underline hover:text-white/70"
            >
              change name
            </button>
          </div>
        )}
      </div>

      {userId && !displayName && <NameModal onSubmit={handleNameSubmit} />}
    </main>
  );
}
