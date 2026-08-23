/**
 * EXPECTED INCOME — forecast it, never post it.
 *
 * A schedule says WHEN money is expected and roughly how much: "pay, every
 * Friday, about $2,200". It does NOT create income. Nothing here adds a penny
 * to Safe to Spend.
 *
 * WHY IT WORKS THAT WAY
 * ---------------------
 * Real pay varies -- hours, overtime, deductions, a late transfer. If the app
 * quietly banked $2,200 every Friday it would eventually be telling someone
 * they can spend money that never arrived, which is the one mistake a budgeting
 * app must never make. So an expected payday appears as a QUESTION -- "did this
 * arrive, and how much?" -- and only becomes income when the person confirms it
 * and corrects the amount.
 *
 * The forecast still does its job: you can see what is coming and plan around
 * it, without it being counted as money you have.
 *
 * OCCURRENCE IDENTITY
 * -------------------
 * A confirmed payday is filed under (schedule_id, cycle_date), the same shape
 * bill_payments uses, so confirming one Friday can never mark another Friday
 * received. Unlike bills there is no legacy data here, so cycle_date is the
 * TRUE effective date -- month-end clamped to the real last day -- rather than
 * a canonical 28th kept for backwards compatibility.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { localDateString, parseLocalDate, dueDayInMonth, nextMonthlyOccurrence } from '../core/datetime';

export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly';

export interface IncomeSchedule {
  id: number;
  label: string;
  amount: number;
  frequency: IncomeFrequency;
  day_of_month?: number | null;
  weekday?: number | null;        // 0 = Sunday
  active?: number;
  /** When the schedule was set up. Nothing before this is ever asked about. */
  created_at?: string | null;
  /**
   * A real payday this schedule is measured from. Only 'biweekly' needs it:
   * "every two weeks" is meaningless without knowing WHICH two weeks, and a
   * weekday alone cannot say whether this Friday or next Friday is the one.
   */
  anchor_date?: string | null;
}

/** An expected payday: when it lands, and what the schedule says it should be. */
export interface ExpectedIncome {
  schedule: IncomeSchedule;
  cycleDate: string;              // local YYYY-MM-DD
  expectedAmount: number;
  /** Its date has arrived, so the user can be asked whether it came in. */
  due: boolean;
}

/**
 * Every date this schedule falls on within [start, end], inclusive.
 * Pure: no database, no clock.
 */
export function occurrencesBetween(s: IncomeSchedule, start: Date, end: Date): string[] {
  const out: string[] = [];
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (to < from) return out;

  if (s.frequency === 'weekly' || s.frequency === 'biweekly') {
    const stepDays = s.frequency === 'biweekly' ? 14 : 7;

    // Biweekly counts fortnights from a real payday the user gave us, so the
    // right Friday is picked rather than merely a Friday. Without an anchor it
    // degrades to the nearest matching weekday, which is wrong half the time --
    // so the anchor is required for biweekly at the point it is created.
    let cursor: Date;
    if (s.frequency === 'biweekly' && s.anchor_date) {
      const a = parseLocalDate(s.anchor_date);
      const wholeSteps = Math.ceil((from.getTime() - a.getTime()) / (stepDays * 86400000));
      cursor = new Date(a.getFullYear(), a.getMonth(), a.getDate() + Math.max(0, wholeSteps) * stepDays);
    } else {
      const want = s.weekday ?? 0;
      cursor = new Date(from);
      cursor.setDate(cursor.getDate() + ((want - cursor.getDay() + 7) % 7));
    }

    while (cursor <= to) {
      if (cursor >= from) out.push(localDateString(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + stepDays);
    }
    return out;
  }

  // Monthly: walk month by month, landing on the real day each month has.
  const day = s.day_of_month ?? 1;
  let y = from.getFullYear();
  let m = from.getMonth();
  while (true) {
    const d = new Date(y, m, dueDayInMonth(day, y, m));
    if (d > to) break;
    if (d >= from) out.push(localDateString(d));
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    if (y > to.getFullYear() + 1) break;   // safety stop
  }
  return out;
}

/** The next date this schedule falls on, on or after `from`. */
export function nextOccurrence(s: IncomeSchedule, from: Date = new Date()): string {
  if (s.frequency === 'weekly' || s.frequency === 'biweekly') {
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const far = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 70);
    const list = occurrencesBetween(s, today, far);
    return list[0] ?? localDateString(today);
  }
  return localDateString(nextMonthlyOccurrence(s.day_of_month ?? 1, from));
}

/** Schedules the user still wants forecast. */
export async function activeSchedules(db: SQLiteDatabase): Promise<IncomeSchedule[]> {
  return db.getAllAsync<IncomeSchedule>(
    `SELECT id, label, amount, frequency, day_of_month, weekday, active, created_at
       FROM income_schedules WHERE active = 1 ORDER BY id ASC`
  ).catch(() => []);
}

/** Has this particular payday already been confirmed? */
export async function isConfirmed(db: SQLiteDatabase, scheduleId: number, cycleDate: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM income WHERE schedule_id = ? AND cycle_date = ?`,
    [scheduleId, cycleDate]
  ).catch(() => null);
  return !!row && row.n > 0;
}

/**
 * Paydays worth showing: recent ones still unanswered, and the near future.
 *
 * `lookBackDays` decides how far back the app keeps asking. It is deliberately
 * finite -- being nagged about a payday from four months ago helps nobody.
 */
export async function pendingIncome(
  db: SQLiteDatabase,
  now: Date = new Date(),
  lookBackDays = 45,
  lookAheadDays = 14
): Promise<ExpectedIncome[]> {
  const schedules = await activeSchedules(db);
  if (!schedules.length) return [];

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - lookBackDays);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + lookAheadDays);
  const todayIso = localDateString(today);

  const confirmed = await db.getAllAsync<{ schedule_id: number; cycle_date: string }>(
    `SELECT schedule_id, cycle_date FROM income WHERE schedule_id IS NOT NULL AND cycle_date IS NOT NULL`
  ).catch(() => []);
  const seen = new Set(confirmed.map(r => r.schedule_id + '|' + r.cycle_date));

  const out: ExpectedIncome[] = [];
  for (const s of schedules) {
    // Never ask about paydays from BEFORE the schedule was set up. Someone who
    // says today "my pay comes every Friday" is describing what happens next,
    // not volunteering to account for every Friday of the past six weeks. The
    // first run of this offered four paydays from the previous month, which
    // read as the app inventing history it was never told about.
    const bornOn = (s.created_at || '').slice(0, 10);
    const from = bornOn && bornOn > localDateString(start) ? parseLocalDate(bornOn) : start;

    for (const cycleDate of occurrencesBetween(s, from, end)) {
      if (seen.has(s.id + '|' + cycleDate)) continue;
      out.push({ schedule: s, cycleDate, expectedAmount: s.amount, due: cycleDate <= todayIso });
    }
  }
  return out.sort((a, b) => a.cycleDate.localeCompare(b.cycleDate));
}

/**
 * Record that an expected payday actually arrived.
 *
 * `actualAmount` is what the person says they were really paid, which is the
 * whole point: the schedule's figure is only ever an estimate. This is the only
 * function here that creates income, and it runs only when someone confirms.
 */
export async function confirmIncome(
  db: SQLiteDatabase,
  schedule: IncomeSchedule,
  cycleDate: string,
  actualAmount: number
): Promise<void> {
  if (!Number.isFinite(actualAmount) || actualAmount <= 0) {
    throw new Error('An amount is needed before this payday can be recorded.');
  }
  if (await isConfirmed(db, schedule.id, cycleDate)) return;   // never file it twice
  await db.runAsync(
    `INSERT INTO income (amount, label, date, schedule_id, cycle_date) VALUES (?, ?, ?, ?, ?)`,
    [actualAmount, schedule.label, cycleDate, schedule.id, cycleDate]
  );
}

/** Stop forecasting a schedule without destroying the income already confirmed from it. */
export async function deactivateSchedule(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`UPDATE income_schedules SET active = 0 WHERE id = ?`, [id]);
}

/**
 * Change what a schedule EXPECTS from here on.
 *
 * This is the "and future pays" half of the product. Correcting one paycheck is
 * a different act entirely: that edits the income row for that occurrence and
 * touches nothing else. Someone whose pay was $792.43 this week because they
 * worked fewer hours has not had a pay cut, and their normal figure must not
 * quietly become $792.43 because they recorded one short week.
 *
 * Only the fields passed are changed; everything else is left exactly as it
 * was. PeggyBank has been bitten before by an edit that silently dropped the
 * fields it was not thinking about.
 *
 * Already-confirmed paydays are NOT rewritten. What was actually received is a
 * fact about the past and stays as recorded.
 */
export async function updateSchedule(
  db: SQLiteDatabase,
  id: number,
  changes: Partial<Pick<IncomeSchedule, 'label' | 'amount' | 'frequency' | 'day_of_month' | 'weekday' | 'anchor_date'>>
): Promise<void> {
  const allowed = ['label', 'amount', 'frequency', 'day_of_month', 'weekday', 'anchor_date'] as const;
  const sets: string[] = [];
  const args: any[] = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      sets.push(key + ' = ?');
      args.push((changes as any)[key]);
    }
  }
  if (!sets.length) return;                    // nothing asked for, nothing touched
  args.push(id);
  await db.runAsync(`UPDATE income_schedules SET ${sets.join(', ')} WHERE id = ?`, args);
}

/** One schedule, or null. */
export async function getSchedule(db: SQLiteDatabase, id: number): Promise<IncomeSchedule | null> {
  return db.getFirstAsync<IncomeSchedule>(
    `SELECT id, label, amount, frequency, day_of_month, weekday, active, created_at, anchor_date
       FROM income_schedules WHERE id = ?`, [id]
  ).catch(() => null);
}

/**
 * How a schedule reads in plain language: "Every second Friday", "On the 15th".
 * Used wherever the user is shown what they set up, so the wording cannot drift
 * between screens.
 */
export function describeSchedule(s: IncomeSchedule): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (s.frequency === 'weekly') return 'Every ' + days[s.weekday ?? 0];
  if (s.frequency === 'biweekly') return 'Every second ' + days[s.weekday ?? 0];
  const d = s.day_of_month ?? 1;
  const suffix = d % 100 >= 11 && d % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][d % 10] ?? 'th');
  return 'On the ' + d + suffix;
}
