/**
 * Date helpers that work with calendar dates (no time component).
 *
 * THE RULES:
 *
 * 1. Never use `Date#toISOString().split('T')[0]` to derive a YYYY-MM-DD
 *    string — `toISOString` always converts to UTC, which produces an
 *    off-by-one day whenever the runtime's timezone differs from UTC (e.g.
 *    on a UTC server at 22:00 in a UTC-4 region it returns the next day's
 *    date). Use {@link toDateStr} instead.
 *
 * 2. Never compute "today" with `new Date()` on the server. The dev
 *    machine, production server, and the clinic's users may all live in
 *    different timezones. Always derive "today" from the clinic's
 *    timezone via {@link todayInTz} (using `clinics.timezone`) and pass
 *    the resulting `YYYY-MM-DD` string down as a prop.
 *
 * 3. Never assume the week starts on Sunday. Use {@link getWeekStart}
 *    with the clinic's `weekStartsOn` setting (0 = Sunday, 1 = Monday).
 */

export type WeekStartsOn = 0 | 1;

export function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Local-clock "today". Only safe to call on the browser (where the user's
 * own clock is the authoritative source). On the server, prefer
 * {@link todayInTz} keyed off the clinic's timezone.
 */
export function todayStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(str: string | null | undefined): Date | null {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns the current calendar date (YYYY-MM-DD) in the given IANA timezone.
 *
 * Uses the `en-CA` locale because it formats dates natively as YYYY-MM-DD.
 */
export function todayInTz(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns the first day of the calendar week that contains `date`,
 * with time normalized to 00:00:00 in the local clock.
 *
 * `weekStartsOn`: 0 = Sunday, 1 = Monday.
 */
export function getWeekStart(date: Date, weekStartsOn: WeekStartsOn): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}
