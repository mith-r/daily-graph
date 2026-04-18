import type { Prompt } from "./types";
import { hashString } from "./rng";
import { todayKey } from "./date";

export const PROMPTS: Prompt[] = [
  { id: "fader-puller", xLeft: "#1 cleans fader", xRight: "pulls up every time", yBottom: "'my fault' energy", yTop: "calls for buckets" },
  { id: "bucket-tier", xLeft: "bucket-bound", xRight: "bucket-proof", yBottom: "takes the L", yTop: "deflects the blame" },
  { id: "text-style", xLeft: "one-word 'boys'", xRight: "full essay text", yBottom: "all lowercase", yTop: "ALL CAPS" },
  { id: "sheet-vibes", xLeft: "spreadsheet brain", xRight: "pure vibes", yBottom: "retired", yTop: "third-most hours" },
  { id: "meniscus-jomo", xLeft: "running meniscus", xRight: "asleep by 10", yBottom: "FOMO king", yTop: "JOMO monk" },
  { id: "talk-act", xLeft: "talks the most shit", xRight: "silent workhorse", yBottom: "still at practice", yTop: "always otw" },
  { id: "rizz-check", xLeft: "no rizz (self-reported)", xRight: "locked in", yBottom: "texts first", yTop: "waits 3 days" },
  { id: "main-quiet", xLeft: "main character", xRight: "quiet architect", yBottom: "ghoster", yTop: "texts back" },
  { id: "yak-brick", xLeft: "yakking at 8:30am", xRight: "holds it down", yBottom: "bricked at foco", yTop: "godspeed boys" },
  { id: "axa-leech", xLeft: "AXA energy", xRight: "Leech energy", yBottom: "Sanborn gremlin", yTop: "foco regular" },
];

export function getTodaysPrompt(dateKey: string = todayKey()): Prompt {
  const idx = hashString(dateKey) % PROMPTS.length;
  return PROMPTS[idx];
}
