import type { Prompt } from "./types";
import { hashString } from "./rng";
import { todayKey } from "./date";

export const PROMPTS: Prompt[] = [
  { id: "body-count", xLeft: "still a virgin", xRight: "lost count at 30", yBottom: "cries after", yTop: "ghosts in the morning" },
  { id: "stamina", xLeft: "2-pump chump", xRight: "goes all night", yBottom: "missionary only", yTop: "full freak" },
  { id: "rizz", xLeft: "zero rizz", xRight: "unspoken rizz", yBottom: "texts first", yTop: "waits 3 days" },
  { id: "loyalty", xLeft: "wifed up", xRight: "different girl every weekend", yBottom: "hopeless romantic", yTop: "emotionally unavailable" },
  { id: "screen-time", xLeft: "monk mode", xRight: "screen time: NSFW", yBottom: "vanilla", yTop: "on a watchlist" },
  { id: "pullout-game", xLeft: "pullout king", xRight: "raw dog enjoyer", yBottom: "Plan B on deck", yTop: "fingers crossed" },
  { id: "frat-star", xLeft: "GDI energy", xRight: "frat star", yBottom: "still hasn't pulled", yTop: "pulled at semi" },
  { id: "tolerance", xLeft: "yaks by 9pm", xRight: "last one standing", yBottom: "lightweight bitch", yTop: "borderline problem" },
  { id: "weekend-mode", xLeft: "studies Saturday night", xRight: "shotguns at 9am", yBottom: "blue-balled monk", yTop: "horny 24/7" },
  { id: "discretion", xLeft: "walk of shame", xRight: "walk of pride", yBottom: "never tells the boys", yTop: "live-texts mid-hookup" },
];

export function getTodaysPrompt(dateKey: string = todayKey()): Prompt {
  const idx = hashString(dateKey) % PROMPTS.length;
  return PROMPTS[idx];
}
