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
  createdAt: number; // ms since epoch
};

export type TodayResponse = {
  date: string; // YYYY-MM-DD
  prompt: Prompt;
  myPlacement: Placement | null;
  others: Placement[]; // empty until the caller has placed
};
