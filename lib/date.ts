// Single source of truth for "today". Runs server-side; uses a fixed TZ so every
// client agrees on the same date regardless of where they are.
const APP_TZ = "America/New_York";

export function todayKey(now: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
