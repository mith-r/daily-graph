import type { Prompt } from "./types";
import { hashString } from "./rng";
import { todayKey } from "./date";

export const PROMPTS: Prompt[] = [
  { id: "frat-gdi", xLeft: "frat star", xRight: "GDI", yBottom: "pledge energy", yTop: "senior composure" },
  { id: "lightweight-legend", xLeft: "lightweight", xRight: "seasoned drinker", yBottom: "first to puke", yTop: "last one standing" },
  { id: "hookup-situationship", xLeft: "hookup", xRight: "situationship", yBottom: "ghoster", yTop: "texts back" },
  { id: "rager-kickback", xLeft: "rager", xRight: "kickback", yBottom: "dance floor", yTop: "smoke circle" },
  { id: "gym-grub", xLeft: "gym rat", xRight: "couch gremlin", yBottom: "protein shake", yTop: "late-night pizza" },
  { id: "wing-lone", xLeft: "wingman", xRight: "lone wolf", yBottom: "strikes out", yTop: "closes the deal" },
  { id: "simp-player", xLeft: "simp", xRight: "player", yBottom: "texts first", yTop: "waits 3 days" },
  { id: "beer-shots", xLeft: "beer pong champ", xRight: "shot taker", yBottom: "sipper", yTop: "shotgunner" },
  { id: "fomo-jomo", xLeft: "FOMO king", xRight: "JOMO monk", yBottom: "pregame MVP", yTop: "afterparty legend" },
  { id: "clout-lowkey", xLeft: "clout chaser", xRight: "low-key", yBottom: "finsta poster", yTop: "main character" },
];

export function getTodaysPrompt(dateKey: string = todayKey()): Prompt {
  const idx = hashString(dateKey) % PROMPTS.length;
  return PROMPTS[idx];
}
