/**
 * ONE BILL, ONE DATE, EVERYWHERE (audit-style cross-system invariant).
 *
 * A bill must never be described by two different dates in two corners of the
 * app. Before this test existed, a bill due on the 31st, viewed in February,
 * was announced as:
 *
 *     Bills screen   "due in 21 days"   -> 3 March      (JavaScript overflow)
 *     Calendar        28 February                        (correct)
 *     Notification    28 February                        (right by luck)
 *
 * and in May the same bill was:
 *
 *     Bills screen    31 May            (correct)
 *     Calendar        31 May            (correct)
 *     Notification    28 May            (three days early, every month)
 *
 * Nothing crashed and no total was wrong. The user was simply told different
 * things by the same app about the same bill.
 *
 * THE EXPECTED DATES BELOW ARE WRITTEN OUT BY HAND, from a calendar, not
 * produced by any of the code under test. Checking only that the systems agree
 * with EACH OTHER would pass happily if they were all wrong in the same way.
 */

process.env.TZ = 'America/Toronto';

import { getDaysUntil } from '../utils/helpers';
import { nextMonthlyDue } from '../lib/notifications';
import { nextMonthlyOccurrence, dueDayInMonth } from '../core/datetime';

/** Hand-written from a calendar. Each row: due day, the month viewed, the date the user should see. */
const EXPECTED: { dueDay: number; year: number; month: number; label: string; expect: string }[] = [
  // February 2026 has 28 days
  { dueDay: 28, year: 2026, month: 1, label: 'Feb 2026', expect: 'Feb 28 2026' },
  { dueDay: 29, year: 2026, month: 1, label: 'Feb 2026', expect: 'Feb 28 2026' },
  { dueDay: 30, year: 2026, month: 1, label: 'Feb 2026', expect: 'Feb 28 2026' },
  { dueDay: 31, year: 2026, month: 1, label: 'Feb 2026', expect: 'Feb 28 2026' },
  // February 2028 is a leap year: 29 days
  { dueDay: 29, year: 2028, month: 1, label: 'Feb 2028', expect: 'Feb 29 2028' },
  { dueDay: 30, year: 2028, month: 1, label: 'Feb 2028', expect: 'Feb 29 2028' },
  { dueDay: 31, year: 2028, month: 1, label: 'Feb 2028', expect: 'Feb 29 2028' },
  // April 2026 has 30 days
  { dueDay: 29, year: 2026, month: 3, label: 'Apr 2026', expect: 'Apr 29 2026' },
  { dueDay: 30, year: 2026, month: 3, label: 'Apr 2026', expect: 'Apr 30 2026' },
  { dueDay: 31, year: 2026, month: 3, label: 'Apr 2026', expect: 'Apr 30 2026' },
  // May 2026 has 31 days
  { dueDay: 29, year: 2026, month: 4, label: 'May 2026', expect: 'May 29 2026' },
  { dueDay: 30, year: 2026, month: 4, label: 'May 2026', expect: 'May 30 2026' },
  { dueDay: 31, year: 2026, month: 4, label: 'May 2026', expect: 'May 31 2026' },
  // January 2026 has 31 days
  { dueDay: 31, year: 2026, month: 0, label: 'Jan 2026', expect: 'Jan 31 2026' },
];

/** Looking at the month from its 10th, which is before every due day tested. */
const viewedFrom = (r: { year: number; month: number }) => new Date(r.year, r.month, 10, 9, 0, 0);
const asDate = (d: Date) => d.toDateString().slice(4);

describe('Every system reports the same effective due date', () => {
  it.each(EXPECTED.map(r => [r.label, r.dueDay, r.expect, r] as const))(
    '%s, bill due the %sth -> %s',
    (_label, _dueDay, expected, row) => {
      const from = viewedFrom(row);

      // 1. the shared helper
      expect(asDate(nextMonthlyOccurrence(row.dueDay, from))).toBe(expected);

      // 2. the Bills screen and Dashboard, via getDaysUntil
      const days = getDaysUntil(row.dueDay, from);
      const midnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      const billsDate = new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() + days);
      expect(asDate(billsDate)).toBe(expected);

      // 3. the Calendar, which places a bill on dueDayInMonth
      const calDay = dueDayInMonth(row.dueDay, row.year, row.month);
      expect(asDate(new Date(row.year, row.month, calDay))).toBe(expected);

      // 4. the notification the user actually receives
      expect(asDate(nextMonthlyDue(row.dueDay, from))).toBe(expected);
    }
  );

  it('no system ever names a day the month does not have', () => {
    for (let m = 0; m < 12; m++) {
      for (let day = 1; day <= 31; day++) {
        const from = new Date(2026, m, 1, 9, 0);
        const shared = nextMonthlyOccurrence(day, from);
        const notif = nextMonthlyDue(day, from);
        const lastDay = new Date(shared.getFullYear(), shared.getMonth() + 1, 0).getDate();
        expect(shared.getDate()).toBeLessThanOrEqual(lastDay);
        expect(notif.getDate()).toBeLessThanOrEqual(
          new Date(notif.getFullYear(), notif.getMonth() + 1, 0).getDate()
        );
      }
    }
  });

  it('the reminder never arrives in a different month from the Calendar entry', () => {
    // This is the failure that destroys trust: two screens, two months.
    for (const row of EXPECTED) {
      const from = viewedFrom(row);
      const notif = nextMonthlyDue(row.dueDay, from);
      const cal = new Date(row.year, row.month, dueDayInMonth(row.dueDay, row.year, row.month));
      expect(notif.getMonth()).toBe(cal.getMonth());
      expect(notif.getFullYear()).toBe(cal.getFullYear());
    }
  });
});
