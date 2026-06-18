"use client";

import { useEffect, useState } from "react";

// Punchy taglines that rotate under the headline for a bit of marketing life.
// Kept short so they stay on one line in the max-w-sm auth card (no reflow).
const CATCHPHRASES = [
  "Where do you stand today?",
  "One graph. Every day.",
  "See where your friends land.",
  "Place yourself. Compare.",
];

const ROTATE_MS = 3500;

export function WelcomeHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((n) => (n + 1) % CATCHPHRASES.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        <span className="animate-gradient-text">Welcome to The Daily Graphs</span>
      </h1>
      {/* Fixed height reserves space so swapping catchphrases never shifts the
          layout below. */}
      <p className="mt-3 flex h-5 items-center justify-center text-sm text-white/70">
        <span key={index} className="animate-fade-in-up">
          {CATCHPHRASES[index]}
        </span>
      </p>
    </div>
  );
}
