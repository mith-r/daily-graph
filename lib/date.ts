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

export function addDays(dateKey: string, delta: number): string {
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(5, 7)) - 1;
  const d = Number(dateKey.slice(8, 10));
  // Construct a UTC midpoint and shift; the result is independent of TZ since
  // we only care about the resulting YYYY-MM-DD label.
  const utc = Date.UTC(y, m, d) + delta * 86400000;
  const out = new Date(utc);
  const yy = out.getUTCFullYear();
  const mm = String(out.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(out.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
