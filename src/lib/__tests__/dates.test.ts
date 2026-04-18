import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  toDateStr,
  todayStr,
  todayInTz,
  parseDateStr,
  getWeekStart,
} from '../dates';

describe('toDateStr', () => {
  it('formats a date as YYYY-MM-DD using local components', () => {
    const d = new Date(2026, 3, 18); // April 18, 2026 local
    expect(toDateStr(d)).toBe('2026-04-18');
  });

  it('pads single-digit months and days with zeros', () => {
    const d = new Date(2026, 0, 5); // January 5, 2026 local
    expect(toDateStr(d)).toBe('2026-01-05');
  });

  it('does NOT shift the day when the local time is near midnight', () => {
    // Around the boundaries of midnight the previous bug (toISOString) would
    // shift to the previous/next day depending on the runtime TZ. The local-
    // component implementation must always return the local calendar date.
    const justBeforeMidnight = new Date(2026, 3, 18, 23, 59, 59);
    const justAfterMidnight = new Date(2026, 3, 19, 0, 0, 1);
    expect(toDateStr(justBeforeMidnight)).toBe('2026-04-18');
    expect(toDateStr(justAfterMidnight)).toBe('2026-04-19');
  });
});

describe('parseDateStr', () => {
  it('parses YYYY-MM-DD into a local Date at 00:00:00', () => {
    const d = parseDateStr('2026-04-18');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(3); // April
    expect(d!.getDate()).toBe(18);
    expect(d!.getHours()).toBe(0);
    expect(d!.getMinutes()).toBe(0);
  });

  it('returns null for empty / invalid input', () => {
    expect(parseDateStr(null)).toBeNull();
    expect(parseDateStr(undefined)).toBeNull();
    expect(parseDateStr('')).toBeNull();
    expect(parseDateStr('not-a-date')).toBeNull();
  });

  it('round-trips with toDateStr', () => {
    const original = '2026-12-31';
    const parsed = parseDateStr(original);
    expect(toDateStr(parsed!)).toBe(original);
  });
});

describe('todayStr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local calendar date as YYYY-MM-DD', () => {
    vi.setSystemTime(new Date(2026, 3, 18, 12, 0, 0));
    expect(todayStr()).toBe('2026-04-18');
  });
});

describe('todayInTz', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Caracas date when UTC is already on the next day', () => {
    // 2026-04-19 02:00 UTC = 2026-04-18 22:00 in America/Caracas (UTC-4).
    // The clinic in Caracas should still see "today = 2026-04-18".
    vi.setSystemTime(new Date('2026-04-19T02:00:00Z'));
    expect(todayInTz('America/Caracas')).toBe('2026-04-18');
  });

  it('returns Berlin date when UTC is still on the previous day', () => {
    // 2026-04-18 22:30 UTC = 2026-04-19 00:30 in Europe/Berlin (CEST UTC+2).
    // A clinic in Berlin should already see "today = 2026-04-19".
    vi.setSystemTime(new Date('2026-04-18T22:30:00Z'));
    expect(todayInTz('Europe/Berlin')).toBe('2026-04-19');
  });

  it('handles timezones on the same calendar day as UTC', () => {
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
    expect(todayInTz('America/Caracas')).toBe('2026-04-18');
    expect(todayInTz('Europe/Berlin')).toBe('2026-04-18');
    expect(todayInTz('UTC')).toBe('2026-04-18');
  });

  it('returns NYC date correctly across midnight UTC', () => {
    // 2026-04-19 03:00 UTC = 2026-04-18 23:00 in America/New_York (UTC-4 EDT).
    vi.setSystemTime(new Date('2026-04-19T03:00:00Z'));
    expect(todayInTz('America/New_York')).toBe('2026-04-18');
  });
});

describe('getWeekStart', () => {
  // Reference dates (April 2026):
  //   Sun 12  Mon 13  Tue 14  Wed 15  Thu 16  Fri 17  Sat 18
  //   Sun 19  Mon 20  ...
  const sunApr12 = new Date(2026, 3, 12);
  const wedApr15 = new Date(2026, 3, 15);
  const satApr18 = new Date(2026, 3, 18);
  const sunApr19 = new Date(2026, 3, 19);
  const monApr20 = new Date(2026, 3, 20);

  it('Sunday-start: Sunday is its own week start', () => {
    expect(toDateStr(getWeekStart(sunApr12, 0))).toBe('2026-04-12');
  });

  it('Sunday-start: Wednesday rolls back to the previous Sunday', () => {
    expect(toDateStr(getWeekStart(wedApr15, 0))).toBe('2026-04-12');
  });

  it('Sunday-start: Saturday rolls back to the same week\'s Sunday', () => {
    expect(toDateStr(getWeekStart(satApr18, 0))).toBe('2026-04-12');
  });

  it('Monday-start: Monday is its own week start', () => {
    expect(toDateStr(getWeekStart(monApr20, 1))).toBe('2026-04-20');
  });

  it('Monday-start: Sunday rolls back to the previous Monday', () => {
    // Sunday Apr 19 belongs to the week starting Mon Apr 13 in Monday-start mode.
    expect(toDateStr(getWeekStart(sunApr19, 1))).toBe('2026-04-13');
  });

  it('Monday-start: Wednesday rolls back to the same week\'s Monday', () => {
    expect(toDateStr(getWeekStart(wedApr15, 1))).toBe('2026-04-13');
  });

  it('does not mutate the input date', () => {
    const before = new Date(2026, 3, 15);
    const beforeTime = before.getTime();
    getWeekStart(before, 1);
    expect(before.getTime()).toBe(beforeTime);
  });

  it('normalizes the time component to 00:00:00.000', () => {
    const noon = new Date(2026, 3, 15, 12, 34, 56, 789);
    const start = getWeekStart(noon, 1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});
