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

export type TodayResponse = {
  date: string;
  prompt: Prompt;
  myPlacement: Placement | null;
  others: Placement[]; // only friends, only after caller has placed
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
