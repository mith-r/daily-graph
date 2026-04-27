export type Prompt = {
  id: string;
  xLeft: string;
  xRight: string;
  yBottom: string;
  yTop: string;
};

export type Placement = {
  userId: string;
  displayName: string;
  x: number; // -1..1
  y: number; // -1..1
  createdAt: number;
};

export type Nudge = {
  nudgerUserId: string;
  dx: number; // offset from target's actual placement, in -2..2 (clamped server-side so target.x+dx stays in -1..1)
  dy: number;
  createdAt: number;
};

// A friend's placement plus my nudge of them (if I've made one today).
export type PlacementWithNudge = Placement & {
  myNudge?: { dx: number; dy: number };
};

export type HeatmapData = {
  cols: number;
  rows: number;
  grid: number[]; // row-major; length = cols * rows
  total: number;
  max: number;
};

export type TodayResponse = {
  date: string;
  prompt: Prompt;
  myPlacement: Placement | null;
  others: PlacementWithNudge[]; // only friends, only after caller has placed
  nudgesOnMe: Nudge[];          // nudges friends have placed on me today
  heatmap: HeatmapData;         // global aggregate over everyone
};

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
};

// Shape exposed to clients — strips secrets.
export type PublicUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

export type FriendSummary = {
  id: string;
  username: string;
  displayName: string;
  email: string;
};

export type FriendsState = {
  me: PublicUser;
  friends: FriendSummary[];
  incoming: FriendSummary[]; // requests others sent to me
  outgoing: FriendSummary[]; // requests I sent
};

export type SessionPayload = {
  userId: string;
  expiresAt: number;
};

export type PromptSuggestion = {
  id: string;
  targetDate: string;
  authorId: string;
  authorDisplayName: string;
  xLeft: string;
  xRight: string;
  yBottom: string;
  yTop: string;
  createdAt: number;
};

export type PromptSuggestionWithVotes = PromptSuggestion & {
  voteCount: number;
};

export type VoteState = {
  targetDate: string;
  suggestions: PromptSuggestionWithVotes[];
  myVote: string | null;
};
