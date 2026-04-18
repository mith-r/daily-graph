import type { Prompt } from "./types";
import { hashString } from "./rng";
import { todayKey } from "./date";

export const PROMPTS: Prompt[] = [
  { id: "intro-chaos", xLeft: "introvert", xRight: "extrovert", yBottom: "chaotic", yTop: "orderly" },
  { id: "morning-planner", xLeft: "morning person", xRight: "night owl", yBottom: "improviser", yTop: "planner" },
  { id: "sweet-hot", xLeft: "sweet", xRight: "savory", yBottom: "cold", yTop: "hot" },
  { id: "risk-optimism", xLeft: "risk-averse", xRight: "risk-taker", yBottom: "pessimist", yTop: "optimist" },
  { id: "thinker-feeler", xLeft: "thinker", xRight: "feeler", yBottom: "reserved", yTop: "expressive" },
  { id: "city-nature", xLeft: "city", xRight: "nature", yBottom: "homebody", yTop: "traveler" },
  { id: "book-movie", xLeft: "books", xRight: "movies", yBottom: "light/fun", yTop: "heavy/serious" },
  { id: "team-solo", xLeft: "team player", xRight: "lone wolf", yBottom: "follower", yTop: "leader" },
  { id: "logic-vibes", xLeft: "logic", xRight: "vibes", yBottom: "skeptical", yTop: "trusting" },
  { id: "saver-spender", xLeft: "saver", xRight: "spender", yBottom: "minimalist", yTop: "maximalist" },
];

export function getTodaysPrompt(dateKey: string = todayKey()): Prompt {
  const idx = hashString(dateKey) % PROMPTS.length;
  return PROMPTS[idx];
}
