/**
 * THE ONE PLACE A SCREEN ASKS "how is this person doing this month?"
 *
 * WHY THIS EXISTS
 * ---------------
 * Dashboard and Weekly Check-In both showed a "Safe to Spend" figure, and they
 * each worked it out themselves. They disagreed in three ways:
 *
 *   - Dashboard counted bills by OCCURRENCE; Weekly Check-In used the old
 *     bills.is_paid flag, so paying August's hydro made September look paid too.
 *   - Dashboard subtracted monthly goal savings; Weekly Check-In ignored goals.
 *   - Dashboard included subscriptions; Weekly Check-In did not.
 *
 * The same person, on two screens, was told two different amounts were safe to
 * spend. Nothing crashed, so nothing got caught -- the user just gradually stops
 * believing the app.
 *
 * This module reads the rows and hands them to the pure engine in
 * src/core/finance.ts. Screens render what comes back. No screen does the maths.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import {
  computeFinanceSummary, explainSafeToSpend,
  type FinanceSummary, type FinanceInput, type FinanceBill, type PaidCycle,
  type SafeToSpendExplanation,
} from '../core/finance';
import { localMonthRange } from '../core/datetime';

export type { FinanceSummary, SafeToSpendExplanation };

/**
 * Everything the month looks like, straight from the database.
 *
 * Bills and subscriptions are read as ONE list because they are the same thing
 * to the person paying them; the split is a leftover of how the tables grew.
 */
export async function buildFinanceInput(db: SQLiteDatabase, now: Date = new Date()): Promise<FinanceInput> {
  const { start, end } = localMonthRange(now);

  const [expenses, income, bills, subs, paid, goals] = await Promise.all([
    db.getAllAsync<{ amount: number; category: string; date: string }>(
      `SELECT amount, category, date FROM expenses WHERE date >= ? AND date <= ?`, [start, end]),
    db.getAllAsync<{ amount: number; date: string }>(
      `SELECT amount, date FROM income WHERE date >= ? AND date <= ?`, [start, end]),
    db.getAllAsync<any>(`SELECT * FROM bills`),
    db.getAllAsync<any>(`SELECT * FROM subscriptions`).catch(() => []),
    db.getAllAsync<{ source: string; bill_id: number; cycle_date: string; paid: number }>(
      `SELECT source, bill_id, cycle_date, paid FROM bill_payments WHERE paid = 1`).catch(() => []),
    db.getAllAsync<{ target_amount: number; current_amount: number }>(
      `SELECT target_amount, current_amount FROM savings_goals`),
  ]);

  // bill ids and subscription ids live in separate namespaces; keep them apart
  // so subscription 3 is never mistaken for bill 3 when checking what is paid.
  const allBills: FinanceBill[] = [
    ...bills.map(b => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      frequency: (b.frequency === 'weekly' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
      due_day: b.due_day,
      due_weekday: b.due_weekday,
    })),
    ...subs.map((s: any) => ({
      id: -Math.abs(s.id),                 // negative ids mark the subscription namespace
      name: s.name,
      amount: s.amount,
      frequency: 'monthly' as const,
      due_day: s.billing_day ?? 1,
    })),
  ];

  const paidCycles: PaidCycle[] = paid.map(p => ({
    bill_id: p.source === 'subscription' ? -Math.abs(p.bill_id) : p.bill_id,
    cycle_date: p.cycle_date,
  }));

  return {
    today: now,
    monthStart: start,
    monthEnd: end,
    expenses,
    income,
    bills: allBills,
    paidCycles,
    goals,
  };
}

/** The month's headline figures. */
export async function loadFinanceSummary(db: SQLiteDatabase, now: Date = new Date()): Promise<FinanceSummary> {
  return computeFinanceSummary(await buildFinanceInput(db, now));
}

/**
 * The same figures, plus the lines that explain Safe to Spend.
 *
 * Reads the same rows through the same loader and hands them to the same
 * engine, so "why is that my number?" can never answer with a different number.
 */
export async function loadSafeToSpendExplanation(
  db: SQLiteDatabase, now: Date = new Date()
): Promise<SafeToSpendExplanation> {
  return explainSafeToSpend(await buildFinanceInput(db, now));
}
