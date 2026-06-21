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

export function tomorrowKey(now: Date = new Date()): string {
  return addDays(todayKey(now), 1);
}

// Parse a YYYY-MM-DD key into the UTC-midnight epoch millis for that date. The
// shared way to compare or shift date keys without timezone drift.
export function dateKeyToUTC(dateKey: string): number {
  return Date.UTC(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10))
  );
}

export function addDays(dateKey: string, delta: number): string {
  // Shift a UTC midpoint; the result is independent of TZ since we only care
  // about the resulting YYYY-MM-DD label.
  const out = new Date(dateKeyToUTC(dateKey) + delta * 86400000);
  const yy = out.getUTCFullYear();
  const mm = String(out.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(out.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Format a YYYY-MM-DD key as a long human label, e.g. "Monday, June 30". Uses
// UTC so the label matches the stored date regardless of the viewer's timezone.
export function prettyDateLong(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(key + "T00:00:00Z"));
}
