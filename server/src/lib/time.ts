const NAIROBI_TZ = "Africa/Nairobi";

/** Today's date in Africa/Nairobi, as YYYY-MM-DD. */
export function nairobiToday(now: Date = new Date()): string {
  return nairobiDateString(now);
}

/** Any instant formatted as YYYY-MM-DD in Africa/Nairobi. */
export function nairobiDateString(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NAIROBI_TZ }).format(at);
}

/** Days between a YYYY-MM-DD date (as a Nairobi calendar day) and today, today - date. */
export function daysBeforeToday(dateStr: string, now: Date = new Date()): number {
  const today = nairobiToday(now);
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${dateStr}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

export function hoursSince(at: Date, now: Date = new Date()): number {
  return (now.getTime() - at.getTime()) / 3_600_000;
}

/** "Nov 2026" style month label in Nairobi time. */
export function nairobiMonthLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: NAIROBI_TZ, month: "short", year: "numeric" }).format(now);
}

/** First instant of the current Nairobi calendar month, as a UTC Date usable in DB range queries. */
export function startOfNairobiMonth(now: Date = new Date()): Date {
  const today = nairobiToday(now);
  const [y, m] = today.split("-");
  return new Date(`${y}-${m}-01T00:00:00+03:00`);
}
