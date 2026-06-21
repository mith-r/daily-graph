export type Prompt = {
  id: string;
  xLeft: string;
  xRight: string;
  yBottom: string;
  yTop: string;
};

// A user's hand-designed "bitmoji"-style face. Each facial feature is a preset
// id (validated against the catalog in lib/avatar.ts); skin/bg/hair carry hex
// colors. Stored as a small JSON blob on the user's Redis record.
export type AvatarConfig = {
  skin: string; // hex #rrggbb
  bg: string; // hex #rrggbb (circle background)
  hair: string; // style id, e.g. "short" | "bun" | "none"
  hairColor: string; // hex #rrggbb
  brows: string; // id
  eyes: string; // id
  mouth: string; // id
  facialHair: string; // id (incl. "none")
  glasses: string; // id (incl. "none")
  hat: string; // id (incl. "none")
};

export type Placement = {
  userId: string;
  displayName: string;
  x: number; // -1..1
  y: number; // -1..1
  createdAt: number;
  // Populated at response-build time (lib/today.ts) so the graph can render a
  // face in place of the dot. NOT persisted into the placements hash — the
  // stored Placement never carries it; it's joined in from the user record.
  avatar?: AvatarConfig | null;
  // The owner's uploaded photo version, if they have one. When set, the graph
  // renders their photo (via /api/avatar?id=…&v=…) in place of the bitmoji.
  // Also joined in at read time — never persisted into the placements hash.
  photoVersion?: number | null;
};

export type Nudge = {
  nudgerUserId: string;
  dx: number; // offset from target's actual placement, in -2..2 (clamped server-side so target.x+dx stays in -1..1)
  dy: number;
  createdAt: number;
};

// A friend's placement plus my nudge of them (if I've made one today), and the
// nudges my other friends have placed on them — surfaced when you focus this
// friend to show "who moved them".
export type PlacementWithNudge = Placement & {
  myNudge?: { dx: number; dy: number };
  nudgesFromFriends?: Nudge[]; // nudges on this friend from my other placed friends
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
  celebrities: Placement[];     // parody celebrity dots shown over the heatmap
};

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
  // When the user proved ownership of their email (6-digit code). Absent =
  // unverified — which also gates accounts created before this feature shipped.
  emailVerifiedAt?: number;
  // Set on password reset. Sessions issued before this moment are rejected
  // (see lib/dal.ts), revoking stolen/old sessions after a reset.
  passwordChangedAt?: number;
  avatar?: AvatarConfig; // the user's designed face, if they've made one
  // Bumped each time the user uploads a profile photo; cleared when they remove
  // it (absent = no photo). The image bytes live under a separate Redis key
  // (user:<id>:photo) so they stay out of the hot /api/today MGET; this counter
  // rides along on the user record and doubles as the URL cache-buster.
  photoVersion?: number;
  // How big faces render on THIS user's view of the graph — a multiplier on the
  // dot's base size (see lib/avatar.ts). A personal display preference, not how
  // others see them. Absent → the default size.
  avatarScale?: number;
  // Moderation: set when a mod bans the account. A banned user is locked out
  // everywhere (see lib/dal.ts). Server-only — never copied onto PublicUser.
  bannedAt?: number;
  bannedReason?: string;
  bannedBy?: string; // id of the admin who applied the ban
};

// Shape exposed to clients — strips secrets.
export type PublicUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  // The current user's graph-density preference (a size multiplier), carried so
  // the graph can scale every dot to their chosen size. PublicUser is only ever
  // the viewer themselves in this app, so this is always "my" setting.
  avatarScale?: number;
  // Mirrors User.emailVerifiedAt so guards can gate unverified accounts.
  emailVerifiedAt?: number;
};

export type FriendSummary = {
  id: string;
  username: string;
  displayName: string;
  email: string;
};

export type SessionPayload = {
  userId: string;
  expiresAt: number;
  // JWT `iat` in SECONDS (set by .setIssuedAt() at signing). Used to reject
  // sessions minted before the user's last password change.
  issuedAt?: number;
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
  // True when this suggestion was carried over from a previous round's
  // un-chosen prompts. Used to show a "held over" tag and to ensure a prompt
  // only ever rolls over once.
  rolledOver?: boolean;
};

export type PromptSuggestionWithVotes = PromptSuggestion & {
  voteCount: number;
};

export type VoteState = {
  targetDate: string;
  suggestions: PromptSuggestionWithVotes[];
  myVote: string | null;
};

// --- Moderation ---

// Why a user was reported. Mirrored by ReportSchema in lib/validation.ts.
export type ReportReason =
  | "inappropriate_suggestion"
  | "impersonation"
  | "harassment"
  | "spam"
  | "other";

export type ReportStatus = "open" | "actioned" | "dismissed";

export type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string; // free-text from the reporter
  context?: string; // what was reported, e.g. the suggestion's text
  createdAt: number;
  status: ReportStatus;
  resolvedBy?: string; // id of the admin who actioned/dismissed it
  resolvedAt?: number;
};
