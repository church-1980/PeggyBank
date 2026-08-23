/**
 * MONTH-END BILL DUE DATES — one trustworthy date everywhere.
 *
 * THE DEFECT THESE TESTS EXIST TO CATCH
 * -------------------------------------
 * The day picker offers 1..31, so a bill really can be configured for the 31st.
 * February has no 31st. JavaScript does not refuse an impossible date -- it
 * rolls it forward silently:
 *
 *     new Date(2026, 1, 31)  ->  3 March 2026
 *
 * So the Bills screen and the Dashboard told the user a February bill was due in
 * MARCH, while the Calendar showed the 28th. Same bill, same app, two different
 * answers, and nothing crashed.
 *
 * Notifications had a different flaw: they clamped every due day to the 28th, so
 * a bill due on the 31st of May was reminded on 28 May -- three days early,
 * every month.
 *
 * THE RULE
 * --------
 * The date a user sees and plans around is:
 *
 *     effective day = min(configured due day, days in that month)
 *
 * WHAT THIS DELIBERATELY DOES NOT TOUCH
 * -------------------------------------
 * Internal OCCURRENCE IDENTITY still clamps to the 28th (clampDueDay). That is
 * the key used by bill_payments to remember which month was paid, it is written
 * into existing user databases and backups, and changing it would orphan payment
 * history. Identity and presentation are different jobs; only presentation was wrong.
 */

process.env.TZ = 'America/Toronto';

import { nextMonthlyOccurrence, dueDayInMonth, clampDueDay, daysInMonth } from '../core/datetime';

/** Readable "Mon DD YYYY" for failure messages. */
const d = (date: Date) => date.toDateString().slice(4);

describe('The effective due date in a given month', () => {
  it('NON-LEAP FEBRUARY: 29, 30 and 31 all fall on the 28th', () => {
    expect(dueDayInMonth(29, 2026, 1)).toBe(28);
    expect(dueDayInMonth(30, 2026, 1)).toBe(28);
    expect(dueDayInMonth(31, 2026, 1)).toBe(28);
  });

  it('LEAP FEBRUARY: 29 falls on the 29th, 30 and 31 also on the 29th', () => {
    expect(dueDayInMonth(29, 2028, 1)).toBe(29);
    expect(dueDayInMonth(30, 2028, 1)).toBe(29);
    expect(dueDayInMonth(31, 2028, 1)).toBe(29);
  });

  it('30-DAY MONTH (April): 30 stays, 31 falls back to the 30th', () => {
    expect(dueDayInMonth(30, 2026, 3)).toBe(30);
    expect(dueDayInMonth(31, 2026, 3)).toBe(30);
  });

  it('31-DAY MONTH (May): 31 really is the 31st', () => {
    expect(dueDayInMonth(31, 2026, 4)).toBe(31);
  });

  it('never returns a day the month does not have, for any day in any month', () => {
    for (let m = 0; m < 12; m++) {
      for (let day = 1; day <= 31; day++) {
        const eff = dueDayInMonth(day, 2026, m);
        expect(eff).toBeGreaterThanOrEqual(1);
        expect(eff).toBeLessThanOrEqual(daysInMonth(2026, m));
      }
    }
  });
});

describe('The next date a monthly bill falls due', () => {
  it('THE BUG: a bill due the 31st, seen in February, must NOT land in March', () => {
    // new Date(2026, 1, 31) silently becomes 3 March. This is the exact defect.
    const next = nextMonthlyOccurrence(31, new Date(2026, 1, 10));
    expect(next.getMonth()).toBe(1);          // still February
    expect(next.getDate()).toBe(28);
    expect(d(next)).toBe('Feb 28 2026');
  });

  it('due 29 and 30 in a non-leap February also stay in February', () => {
    expect(d(nextMonthlyOccurrence(29, new Date(2026, 1, 10)))).toBe('Feb 28 2026');
    expect(d(nextMonthlyOccurrence(30, new Date(2026, 1, 10)))).toBe('Feb 28 2026');
  });

  it('a leap February gives back the 29th, not the 28th', () => {
    expect(d(nextMonthlyOccurrence(29, new Date(2028, 1, 10)))).toBe('Feb 29 2028');
    expect(d(nextMonthlyOccurrence(31, new Date(2028, 1, 10)))).toBe('Feb 29 2028');
  });

  it('a bill due the 31st in April falls on the 30th, not 1 May', () => {
    expect(d(nextMonthlyOccurrence(31, new Date(2026, 3, 10)))).toBe('Apr 30 2026');
  });

  it('a bill due the 31st in May really is the 31st, not the 28th', () => {
    // The notification path used to clamp to 28 here, reminding three days early.
    expect(d(nextMonthlyOccurrence(31, new Date(2026, 4, 10)))).toBe('May 31 2026');
  });

  it('a bill due TODAY returns today, so the app can say "Due today"', () => {
    expect(d(nextMonthlyOccurrence(31, new Date(2026, 0, 31, 23, 0)))).toBe('Jan 31 2026');
    expect(d(nextMonthlyOccurrence(15, new Date(2026, 4, 15, 8, 0)))).toBe('May 15 2026');
  });

  it('rolls to the next month once the due day has passed, still clamped', () => {
    // 30 Jan, bill due the 31st: this month still has a 31st.
    expect(d(nextMonthlyOccurrence(31, new Date(2026, 0, 30)))).toBe('Jan 31 2026');
    // 1 Feb, bill due the 31st: February has no 31st, so the 28th.
    expect(d(nextMonthlyOccurrence(31, new Date(2026, 1, 1)))).toBe('Feb 28 2026');
    // 5 Feb, bill due the 3rd: already gone, so March 3rd.
    expect(d(nextMonthlyOccurrence(3, new Date(2026, 1, 5)))).toBe('Mar 03 2026');
  });

  it('rolls across a year boundary correctly, clamping in the NEW year', () => {
    expect(d(nextMonthlyOccurrence(5, new Date(2026, 11, 31)))).toBe('Jan 05 2027');
    // Due the 31st, asked on 31 Dec -> today. Asked on 1 Jan -> 31 Jan.
    expect(d(nextMonthlyOccurrence(31, new Date(2027, 0, 1)))).toBe('Jan 31 2027');
    // And February of a non-leap year still clamps.
    expect(d(nextMonthlyOccurrence(31, new Date(2027, 1, 1)))).toBe('Feb 28 2027');
  });

  it('never returns a date in the past', () => {
    const from = new Date(2026, 1, 15, 12, 0);
    for (let day = 1; day <= 31; day++) {
      expect(nextMonthlyOccurrence(day, from).getTime()).toBeGreaterThanOrEqual(
        new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
      );
    }
  });
});

describe('Occurrence identity is deliberately NOT the display date', () => {
  it('still clamps to the 28th, because bill_payments rows depend on it', () => {
    // Changing this would orphan every payment already recorded against the 28th
    // in existing databases and backups.
    expect(clampDueDay(31)).toBe(28);
    expect(clampDueDay(29)).toBe(28);
  });

  it('identity and display are allowed to differ, and here they do', () => {
    // May has a 31st: the user sees 31 May, the payment is filed under the 28th.
    expect(dueDayInMonth(31, 2026, 4)).toBe(31);
    expect(clampDueDay(31)).toBe(28);
  });
});

/**
 * The production helper the Bills screen and the Dashboard actually call.
 *
 * These are written against getDaysUntil itself rather than the new shared
 * function, so they fail on the REAL defect rather than on a missing import.
 */
describe('getDaysUntil, as the Bills screen and Dashboard use it', () => {
  const { getDaysUntil } = require('../utils/helpers');

  /** The date getDaysUntil is implicitly pointing at, given a pinned today. */
  function resolvedDate(dueDay: number, today: Date): Date {
    const days = getDaysUntil(dueDay, today);
    const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() + days);
  }

  it('THE BUG: due 31 in February points at February, not March', () => {
    expect(resolvedDate(31, new Date(2026, 1, 10, 9, 0)).toDateString().slice(4)).toBe('Feb 28 2026');
  });

  it('due 31 in April points at 30 April, not 1 May', () => {
    expect(resolvedDate(31, new Date(2026, 3, 10, 9, 0)).toDateString().slice(4)).toBe('Apr 30 2026');
  });

  it('due 31 in May points at 31 May', () => {
    expect(resolvedDate(31, new Date(2026, 4, 10, 9, 0)).toDateString().slice(4)).toBe('May 31 2026');
  });

  it('due 30 in a leap February points at 29 February', () => {
    expect(resolvedDate(30, new Date(2028, 1, 10, 9, 0)).toDateString().slice(4)).toBe('Feb 29 2028');
  });

  it('an ordinary mid-month due day is unaffected', () => {
    expect(getDaysUntil(15, new Date(2026, 4, 10, 9, 0))).toBe(5);
  });

  it('never reports more days than the longest month', () => {
    for (let m = 0; m < 12; m++) {
      for (let day = 1; day <= 31; day++) {
        expect(getDaysUntil(day, new Date(2026, m, 15, 9, 0))).toBeLessThanOrEqual(31);
      }
    }
  });
});
