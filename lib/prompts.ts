import { cache } from "react";
import type { Prompt } from "./types";
import { hashString } from "./rng";
import { todayKey } from "./date";
import { closeRound, getWinnerPrompt } from "./voting";

export const PROMPTS: Prompt[] = [
  { id: "body-count", xLeft: "saving myself", xRight: "lost count", yBottom: "catches feelings", yTop: "ghosts by morning" },
  { id: "stamina", xLeft: "fades fast", xRight: "goes all night", yBottom: "keeps it vanilla", yTop: "down for anything" },
  { id: "rizz", xLeft: "zero rizz", xRight: "unspoken rizz", yBottom: "texts first", yTop: "waits 3 days" },
  { id: "loyalty", xLeft: "wifed up", xRight: "new crush every weekend", yBottom: "hopeless romantic", yTop: "emotionally unavailable" },
  { id: "screen-time", xLeft: "monk mode", xRight: "screen time: questionable", yBottom: "vanilla", yTop: "chronically online" },
  { id: "pullout-game", xLeft: "always careful", xRight: "lives dangerously", yBottom: "plays it safe", yTop: "fingers crossed" },
  { id: "frat-star", xLeft: "GDI energy", xRight: "frat star", yBottom: "flying solo", yTop: "left with a number" },
  { id: "tolerance", xLeft: "tapping out by 9", xRight: "last one standing", yBottom: "lightweight", yTop: "borderline problem" },
  { id: "weekend-mode", xLeft: "studies Saturday night", xRight: "shotguns at 9am", yBottom: "saintly", yTop: "always down" },
  { id: "discretion", xLeft: "walk of shame", xRight: "walk of pride", yBottom: "never tells the boys", yTop: "live-texts everything" },
];

const OVERRIDES: Record<string, Prompt> = {
  "2026-04-22": { id: "lust-romance", xLeft: "lustful", xRight: "romantic", yBottom: "all talk", yTop: "backs it up" },
};

export const getTodaysPrompt = cache(
  async (dateKey: string = todayKey()): Promise<Prompt> => {
    const winner =
      dateKey === todayKey()
        ? await closeRound(dateKey)
        : await getWinnerPrompt(dateKey);
    if (winner) return winner;
    if (OVERRIDES[dateKey]) return OVERRIDES[dateKey];
    const idx = hashString(dateKey) % PROMPTS.length;
    return PROMPTS[idx];
  }
);
