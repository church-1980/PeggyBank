/**
 * DATE & TIMEZONE TORTURE (audit section 5).
 *
 * PeggyBank is used by a person in Toronto. Every one of these tests is a real
 * moment in that person's life -- logging a coffee at 8:01 PM, checking the app
 * on New Year's Eve, paying a bill on the 29th of February.
 *
 * The bug these tests exist to catch: using toISOString() to get "today".
 * toISOString() converts to UTC first, and Toronto is UTC-4/-5, so from 8:00 PM
 * (EDT) or 7:00 PM (EST) onward UTC has already moved to the next calendar day.
 * On the last evening of a month it moves to the next MONTH, which silently
 * drops the expense out of this month's spending and Safe to Spend.
 */

process.env.TZ = 'America/Toronto';

import {
  localDateString, parseLocalDate, localMonthRange, localWeekRange,
  daysInMonth, daysLeftInMonth, clampDueDay, dueDayInMonth,
} from '../core/datetime';
import * as fs from 'fs';
import * as path from 'path';

describe('Toronto clock — the calendar day never shifts', () => {
  // Times chosen around the UTC rollover: in EDT (UTC-4) the day flips at 8 PM.
  const times: [string, number, number][] = [
    ['12:01 AM', 0, 1],
    ['noon', 12, 0],
    ['7:59 PM (just before UTC rolls over)', 19, 59],
    ['8:01 PM (just after UTC rolls over)', 20, 1],
    ['11:59 PM', 23, 59],
  ];

  it.each(times)('19 Aug 2026 at %s is still 2026-08-19', (_label, h, m) => {
    expect(localDateString(new Date(2026, 7, 19, h, m))).toBe('2026-08-19');
  });

  it.each(times)('31 Aug 2026 at %s is still in AUGUST', (_label, h, m) => {
    const d = new Date(2026, 7, 31, h, m);
    expect(localDateString(d)).toBe('2026-08-31');
    expect(localMonthRange(d)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('an expense logged at 11:59 PM on the last day of the month stays in that month', () => {
    const d = new Date(2026, 7, 31, 23, 59);
    const { start, end } = localMonthRange(d);
    const stored = localDateString(d);
    expect(stored >= start && stored <= end).toBe(true);
  });

  it('New Year: 31 Dec 2026 at 8:01 PM is not yet 2027', () => {
    expect(localDateString(new Date(2026, 11, 31, 20, 1))).toBe('2026-12-31');
    expect(localDateString(new Date(2027, 0, 1, 0, 1))).toBe('2027-01-01');
  });
});

describe('Leap years and short months', () => {
  it('February has 29 days in 2028 and 28 in 2027', () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2027, 1)).toBe(28);
  });

  it('2100 is not a leap year', () => {
    expect(daysInMonth(2100, 1)).toBe(28);
  });

  it('month range ends on the real last day of February', () => {
    expect(localMonthRange(new Date(2028, 1, 10)).end).toBe('2028-02-29');
    expect(localMonthRange(new Date(2027, 1, 10)).end).toBe('2027-02-28');
  });

  it('29 Feb 2028 round-trips exactly', () => {
    expect(localDateString(parseLocalDate('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('Daylight saving transitions', () => {
  // Toronto: clocks spring forward 8 Mar 2026, fall back 1 Nov 2026.
  it('the day the clocks spring forward is still one calendar day', () => {
    expect(localDateString(new Date(2026, 2, 8, 1, 0))).toBe('2026-03-08');
    expect(localDateString(new Date(2026, 2, 8, 23, 0))).toBe('2026-03-08');
  });

  it('the day the clocks fall back is still one calendar day', () => {
    expect(localDateString(new Date(2026, 10, 1, 1, 0))).toBe('2026-11-01');
    expect(localDateString(new Date(2026, 10, 1, 23, 0))).toBe('2026-11-01');
  });

  it('the UTC rollover hour changes with DST but the local date does not', () => {
    // In EST (UTC-5) the rollover is 7 PM; 7:01 PM in January must still be that day.
    expect(localDateString(new Date(2026, 0, 15, 19, 1))).toBe('2026-01-15');
  });
});

describe('Due days that do not exist in every month', () => {
  it('clamps 29, 30 and 31 to 28 so the bill appears in February too', () => {
    expect(clampDueDay(29)).toBe(28);
    expect(clampDueDay(30)).toBe(28);
    expect(clampDueDay(31)).toBe(28);
  });

  it('leaves ordinary due days alone', () => {
    expect(clampDueDay(1)).toBe(1);
    expect(clampDueDay(15)).toBe(15);
    expect(clampDueDay(28)).toBe(28);
  });

  it('never produces day 0 or a negative day from nonsense input', () => {
    expect(clampDueDay(0)).toBe(1);
    expect(clampDueDay(-5)).toBe(1);
    expect(clampDueDay(NaN)).toBe(1);
  });

  it('shows a 31st bill on the real last day when displaying a short month', () => {
    expect(dueDayInMonth(31, 2026, 1)).toBe(28);  // Feb 2026
    expect(dueDayInMonth(31, 2028, 1)).toBe(29);  // Feb 2028, leap
    expect(dueDayInMonth(31, 2026, 3)).toBe(30);  // April
    expect(dueDayInMonth(31, 2026, 0)).toBe(31);  // January
  });
});

describe('Week boundaries', () => {
  it('the week runs Sunday to Saturday', () => {
    // Wed 19 Aug 2026 -> Sun 16 Aug .. Sat 22 Aug
    expect(localWeekRange(new Date(2026, 7, 19))).toEqual({ start: '2026-08-16', end: '2026-08-22' });
  });

  it('Sunday belongs to the week it starts', () => {
    expect(localWeekRange(new Date(2026, 7, 16))).toEqual({ start: '2026-08-16', end: '2026-08-22' });
  });

  it('Saturday belongs to the week it ends', () => {
    expect(localWeekRange(new Date(2026, 7, 22))).toEqual({ start: '2026-08-16', end: '2026-08-22' });
  });

  it('last week never overlaps this week', () => {
    const now = new Date(2026, 7, 19);
    const thisWeek = localWeekRange(now, 0);
    const lastWeek = localWeekRange(now, 1);
    expect(lastWeek.end < thisWeek.start).toBe(true);
  });

  it('a week may span a month boundary without losing days', () => {
    // Tue 1 Sep 2026 -> week starts Sun 30 Aug
    expect(localWeekRange(new Date(2026, 8, 1))).toEqual({ start: '2026-08-30', end: '2026-09-05' });
  });

  it('a week may span a year boundary', () => {
    // Fri 1 Jan 2027 -> week starts Sun 27 Dec 2026
    expect(localWeekRange(new Date(2027, 0, 1))).toEqual({ start: '2026-12-27', end: '2027-01-02' });
  });
});

describe('Days left in the month', () => {
  it('is 0 on the last day, never negative', () => {
    expect(daysLeftInMonth(new Date(2026, 7, 31))).toBe(0);
    expect(daysLeftInMonth(new Date(2027, 1, 28))).toBe(0);
  });

  it('counts the remaining days correctly', () => {
    expect(daysLeftInMonth(new Date(2026, 7, 19))).toBe(12);
    expect(daysLeftInMonth(new Date(2028, 1, 1))).toBe(28); // leap February
  });
});

/**
 * STATIC GUARD.
 *
 * The tests above prove the canonical helpers are right. This one proves nobody
 * quietly reintroduces the bug somewhere else: no file in src/ may derive a
 * calendar date from toISOString(), because that reads the date in UTC.
 *
 * If this fails, the fix is to use localDateString() from src/core/datetime.ts.
 * The fix is NOT to add the offending file to the allow-list.
 */
describe('No file derives a calendar date from UTC', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) {
        if (name !== '__tests__' && name !== 'node_modules') walk(p, out);
      } else if (/\.(ts|tsx)$/.test(name)) {
        out.push(p);
      }
    }
    return out;
  }

  it('src/ contains no toISOString()-derived date strings', () => {
    const offenders: string[] = [];
    for (const file of walk(path.join(__dirname, '..'))) {
      const text = fs.readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (/toISOString\(\)\s*\.\s*split/.test(line) || /toISOString\(\)\s*\.\s*slice/.test(line)) {
          offenders.push(path.relative(path.join(__dirname, '..', '..'), file) + ':' + (i + 1));
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
