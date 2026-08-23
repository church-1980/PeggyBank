/**
 * CANONICAL DATE HANDLING — one source of truth for "what day is it?"
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * PeggyBank is a LOCAL-FIRST app used by a person in one place. When Paul logs
 * a coffee at 8:01 PM in Toronto, that coffee belongs to TODAY, not tomorrow.
 *
 * The obvious way to get a date string is:
 *
 *     new Date() -> ISO string -> take the date part     // <-- WRONG
 *
 * toISOString() converts to UTC first. Toronto is UTC-4 (summer) / UTC-5
 * (winter), so from 8:00 PM EDT (or 7:00 PM EST) onward, UTC has already
 * rolled over to the next calendar day. Every expense entered in the evening
 * lands on the WRONG DAY -- and in the wrong MONTH on the last evening of a
 * month, which silently corrupts monthly totals and Safe to Spend.
 *
 * Every function here derives the calendar date from the LOCAL fields
 * (getFullYear / getMonth / getDate). No function in this file may call
 * toISOString(). A test enforces that.
 *
 * All functions are pure and accept an explicit `now`, so tests can pin the
 * clock instead of hoping the suite runs at a convenient hour.
 */

/** Zero-pad to 2 digits. */
function p2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/**
 * The calendar date of `d` in the device's LOCAL timezone, as YYYY-MM-DD.
 * This is the ONLY approved way to turn a Date into a stored date string.
 */
export function localDateString(d: Date = new Date()): string {
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}

/** Parse a YYYY-MM-DD string into a LOCAL-midnight Date (never UTC midnight). */
export function parseLocalDate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** First and last calendar day of `d`'s month, inclusive, as YYYY-MM-DD. */
export function localMonthRange(d: Date = new Date()): { start: string; end: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  return {
    start: localDateString(new Date(y, m, 1)),
    end: localDateString(new Date(y, m + 1, 0)), // day 0 of next month = last day of this one
  };
}

/** Number of days in `d`'s month. Handles leap years via the day-0 trick. */
export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/**
 * Days remaining in the month AFTER today. The last day of the month returns 0.
 * Used by "you have N days left to stretch this money".
 */
export function daysLeftInMonth(d: Date = new Date()): number {
  return daysInMonth(d.getFullYear(), d.getMonth()) - d.getDate();
}

/**
 * The week containing `d`, Sunday..Saturday, as local YYYY-MM-DD strings.
 * Weekly Check-In compares "this week" against "last week"; both must be built
 * from this function so the two windows can never be measured differently.
 */
export function localWeekRange(d: Date = new Date(), weeksAgo = 0): { start: string; end: string } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() - weeksAgo * 7);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start: localDateString(start), end: localDateString(end) };
}

/**
 * Clamp a user-entered due day to a day that exists in EVERY month.
 *
 * A bill due on the 31st has no 31st in February, April, June, September or
 * November. Rather than silently skipping those months (which would hide the
 * bill from Safe to Spend and from notifications), a due day above 28 is
 * clamped to 28 so the bill appears in all twelve months.
 */
export function clampDueDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.max(1, Math.min(28, Math.floor(day)));
}

/**
 * The due day as it actually falls in a GIVEN month: a bill "due on the 31st"
 * falls on Feb 28 (or Feb 29 in a leap year), not on March 3.
 * Used for display; `clampDueDay` governs cycle identity.
 */
export function dueDayInMonth(day: number, year: number, monthIndex0: number): number {
  return Math.min(Math.max(1, Math.floor(day)), daysInMonth(year, monthIndex0));
}

/**
 * The next date a MONTHLY item falls due, in local time.
 *
 * THE ONE PLACE THIS IS DECIDED. The Bills screen, the Dashboard, the Calendar
 * and the notification scheduler all call this, so a bill cannot be described
 * by two different dates in two different corners of the app.
 *
 * Why it exists: each of those had its own month-end arithmetic and they
 * disagreed. The worst was the plain, obvious-looking version:
 *
 *     new Date(year, month, dueDay)
 *
 * JavaScript does not reject an impossible date, it rolls it forward. So a bill
 * due on the 31st, viewed in February, silently became 3 March -- the Bills
 * screen announced a date in the wrong MONTH while the Calendar showed the
 * 28th. The notification scheduler had the opposite flaw: it clamped every due
 * day to the 28th, so a bill due on the 31st of May was reminded three days early.
 *
 * The rule is min(due day, days in that month): the last day of the month when
 * the requested day does not exist, and the requested day when it does.
 *
 * NOTE: this is the date the USER SEES. It is deliberately NOT the same thing as
 * clampDueDay above, which produces the canonical key identifying an occurrence
 * in bill_payments. That key must stay on the 28th or existing payment history
 * would no longer match. Presentation and identity are different jobs.
 */
export function nextMonthlyOccurrence(dueDay: number, from: Date = new Date()): Date {
  const wanted = Number.isFinite(dueDay) ? Math.max(1, Math.min(31, Math.floor(dueDay))) : 1;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  // This month, with the day pulled back to one the month actually has.
  const thisMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    dueDayInMonth(wanted, today.getFullYear(), today.getMonth())
  );
  if (thisMonth >= today) return thisMonth;

  // Already past: the same question, asked of next month. Built from the first
  // of next month so the clamp is applied to THAT month's length.
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const nextY = m > 11 ? y + 1 : y;
  const nextM = m > 11 ? 0 : m;
  return new Date(nextY, nextM, dueDayInMonth(wanted, nextY, nextM));
}

/** Whole days from `from` until a monthly item's next due date. 0 means today. */
export function daysUntilMonthlyOccurrence(dueDay: number, from: Date = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const due = nextMonthlyOccurrence(dueDay, from);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}
