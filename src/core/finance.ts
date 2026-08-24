/**
 * CANONICAL FINANCIAL ENGINE — one source of truth for PeggyBank's money math.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Before this file, "Safe to Spend" was calculated in TWO places that quietly
 * disagreed: DashboardScreen and WeeklyCheckInScreen. Same person, same money,
 * two different numbers on two different screens. That is the single most
 * corrosive bug a money app can have, because nothing crashes -- the user just
 * slowly stops trusting the app.
 *
 * RULES FOR THIS FILE
 * -------------------
 *  1. PURE ONLY. No database, no React, no Platform, no Date.now(), no I/O.
 *     Callers read the rows and pass them in; this file only does arithmetic.
 *  2. PLATFORM-FREE. Android and web must both call these functions. Neither
 *     may re-derive a number locally. An adapter may fetch rows differently;
 *     it may NOT calculate differently.
 *  3. Anything a screen displays as a number should be produced here.
 */

import { clampDueDay } from './datetime';

export interface FinanceExpense { amount: number; category?: string; date: string }
export interface FinanceIncome  { amount: number; date: string }
export interface FinanceGoal    { target_amount: number; current_amount: number }
export interface FinanceBill {
  id?: number;
  name?: string;
  amount: number;
  frequency: 'monthly' | 'weekly';
  due_day?: number;
  due_weekday?: number;
}
/** A bill occurrence the user has actually marked paid, keyed by its cycle. */
export interface PaidCycle { bill_id: number; cycle_date: string }

/** How goal saving is spread. A goal's remaining gap is saved over this many months. */
export const GOAL_SPREAD_MONTHS = 12;

/**
 * Round to whole cents. Guards against float drift like 0.1+0.2 = 0.30000000000000004.
 *
 * The trailing "+ 0" collapses negative zero. Math.round(-0.001 * 100) / 100 is
 * -0, which is a real value in JavaScript and formats as "-$0.00" -- so a line
 * of the Safe to Spend explanation with nothing in it would read "minus nothing".
 * Adding zero leaves every other value untouched.
 */
export function cents(n: number): number {
  return Math.round(n * 100) / 100 + 0;
}

/** Sum of a numeric field. Ignores non-finite values rather than producing NaN. */
export function sumAmounts(rows: { amount: number }[]): number {
  return cents(rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0));
}

/** Rows whose date falls inside [start, end] inclusive. YYYY-MM-DD compares correctly as strings. */
export function inRange<T extends { date: string }>(rows: T[], start: string, end: string): T[] {
  return rows.filter(r => r.date >= start && r.date <= end);
}

/**
 * Monthly amount to set aside for ONE goal: the remaining gap spread over
 * GOAL_SPREAD_MONTHS. A fully-funded (or over-funded) goal contributes 0 --
 * never a negative, which would otherwise inflate Safe to Spend.
 */
export function monthlyGoalContribution(target: number, current: number): number {
  return Math.max(0, target - current) / GOAL_SPREAD_MONTHS;
}

/** Total monthly savings commitment across all goals. */
export function goalsSavingsNeeded(goals: FinanceGoal[]): number {
  return cents(goals.reduce((s, g) => s + monthlyGoalContribution(g.target_amount, g.current_amount), 0));
}

/** Goal completion 0-100, clamped. A zero/invalid target returns 0, never NaN or Infinity. */
export function goalProgressPercent(target: number, current: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

/**
 * The identifying date of the cycle a bill is currently in.
 * Monthly -> the clamped due day in the current month.
 * Weekly  -> the most recent occurrence of that weekday, on or before today.
 *
 * This mirrors src/lib/billCycles.ts, which owns the DB-backed version. Kept
 * here in pure form so parity tests can run with no database at all; a test
 * asserts the two agree.
 */
export function currentCycleDateFor(bill: FinanceBill, today: Date): string {
  const p2 = (n: number) => (n < 10 ? '0' + n : String(n));
  if (bill.frequency === 'weekly') {
    const wd = bill.due_weekday ?? 0;
    const back = (today.getDay() - wd + 7) % 7;
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }
  const day = clampDueDay(bill.due_day ?? 1);
  return today.getFullYear() + '-' + p2(today.getMonth() + 1) + '-' + p2(day);
}

/**
 * Bills NOT yet paid for their current cycle.
 *
 * CRITICAL: paid-ness is per OCCURRENCE, not a permanent flag on the bill.
 * The old bills.is_paid boolean meant that paying August hydro also marked
 * September, October and every future month paid -- permanently removing a real
 * obligation from Safe to Spend and showing the user more money than they have.
 */
export function unpaidBills(bills: FinanceBill[], paid: PaidCycle[], today: Date): FinanceBill[] {
  const paidKeys = new Set(paid.map(p => p.bill_id + '|' + p.cycle_date));
  return bills.filter(b => !paidKeys.has(b.id + '|' + currentCycleDateFor(b, today)));
}

/** Total owed for bill occurrences still unpaid in their current cycle. */
export function unpaidBillsTotal(bills: FinanceBill[], paid: PaidCycle[], today: Date): number {
  return sumAmounts(unpaidBills(bills, paid, today));
}

export interface FinanceInput {
  today: Date;
  monthStart: string;
  monthEnd: string;
  expenses: FinanceExpense[];
  income: FinanceIncome[];
  bills: FinanceBill[];       // includes subscriptions -- they are the same thing
  paidCycles: PaidCycle[];
  goals: FinanceGoal[];
}

export interface FinanceSummary {
  monthIncome: number;
  monthSpending: number;
  moneyLeft: number;          // may be negative: this is the honest number
  unpaidBillsTotal: number;
  goalsSavingsNeeded: number;
  safeToSpend: number;        // clamped at 0: never show a negative "safe" amount
  daysLeftInMonth: number;
  dailyAllowance: number;     // safeToSpend spread over the days remaining
}

/**
 * THE summary. Every screen that shows any of these numbers must call this
 * function and read the field. No screen may recompute a field itself.
 *
 * safeToSpend = income - spending - unpaid bills - monthly goal savings
 *
 * moneyLeft is deliberately NOT clamped, so screens that want to warn "you are
 * over budget" have the true signed figure; only safeToSpend is clamped,
 * because "safe to spend: -$240" is not an instruction anyone can act on.
 */
export function computeFinanceSummary(input: FinanceInput): FinanceSummary {
  const monthIncome = sumAmounts(inRange(input.income, input.monthStart, input.monthEnd));
  const monthSpending = sumAmounts(inRange(input.expenses, input.monthStart, input.monthEnd));
  const unpaid = unpaidBillsTotal(input.bills, input.paidCycles, input.today);
  const goalsNeeded = goalsSavingsNeeded(input.goals);
  const moneyLeft = cents(monthIncome - monthSpending);
  const safeToSpend = cents(Math.max(0, moneyLeft - unpaid - goalsNeeded));
  const dim = new Date(input.today.getFullYear(), input.today.getMonth() + 1, 0).getDate();
  const daysLeft = dim - input.today.getDate();
  return {
    monthIncome,
    monthSpending,
    moneyLeft,
    unpaidBillsTotal: unpaid,
    goalsSavingsNeeded: goalsNeeded,
    safeToSpend,
    daysLeftInMonth: daysLeft,
    dailyAllowance: cents(safeToSpend / Math.max(1, daysLeft)),
  };
}

/** Spending grouped by category, highest first. Powers Monthly Breakdown. */
export function spendingByCategory(expenses: FinanceExpense[]): { category: string; total: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const k = e.category || 'other';
    map.set(k, (map.get(k) ?? 0) + (Number.isFinite(e.amount) ? e.amount : 0));
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total: cents(total) }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}

/**
 * Months to clear a debt by paying `payment` each month at `apr` annual interest.
 * Returns null when the payment cannot even cover the monthly interest -- the
 * balance would never fall, and showing a number would imply it eventually does.
 */
export function debtPayoffMonths(balance: number, apr: number, payment: number): number | null {
  if (balance <= 0) return 0;
  const r = apr / 100 / 12;
  if (payment <= balance * r) return null; // payment never touches principal
  if (r === 0) return Math.ceil(balance / payment);
  return Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r));
}

/** Total interest paid over the life of a debt. null when it never pays off. */
export function debtTotalInterest(balance: number, apr: number, payment: number): number | null {
  const months = debtPayoffMonths(balance, apr, payment);
  if (months === null) return null;
  const r = apr / 100 / 12;
  let bal = balance, interest = 0;
  for (let i = 0; i < months && bal > 0; i++) {
    const int = bal * r;
    interest += int;
    bal = bal + int - payment;
  }
  return cents(Math.max(0, interest));
}

/**
 * WHY IS THAT MY NUMBER?
 *
 * One line of the explanation shown when someone taps Safe to Spend.
 * `amount` is signed: what you have is positive, what is set aside is negative.
 */
export interface SafeToSpendLine {
  key: string;
  label: string;
  amount: number;
  /** Optional breakdown, so "Bills you still owe" can name Bell and Hydro. */
  detail?: { label: string; amount: number }[];
}

export interface SafeToSpendExplanation {
  summary: FinanceSummary;
  lines: SafeToSpendLine[];
  /** What the lines add up to before clamping. Negative means a shortfall. */
  rawTotal: number;
  /** The figure actually shown, never below zero. */
  safeToSpend: number;
  /** True when the lines add up to less than zero and the total was clamped. */
  shortfall: boolean;
}

/**
 * Explain Safe to Spend using the SAME calculation that produced it.
 *
 * This deliberately calls computeFinanceSummary and reads its fields rather
 * than working anything out again. If the explanation did its own arithmetic it
 * would eventually disagree with the headline figure -- the app would show
 * $1,143 and then explain $1,129, and neither number could be trusted again.
 *
 * A test asserts the lines reconcile exactly to the total.
 */
export function explainSafeToSpend(input: FinanceInput): SafeToSpendExplanation {
  const summary = computeFinanceSummary(input);

  const owed = unpaidBills(input.bills, input.paidCycles, input.today);
  const billDetail = owed
    .map(b => ({ label: b.name || 'Bill', amount: cents(b.amount) }))
    .sort((a, b) => b.amount - a.amount);

  const goalDetail = input.goals
    .map(g => ({ label: 'Goal', amount: cents(monthlyGoalContribution(g.target_amount, g.current_amount)) }))
    .filter(d => d.amount > 0);

  const lines: SafeToSpendLine[] = [
    { key: 'income', label: 'Money in this month', amount: summary.monthIncome },
    { key: 'spending', label: 'Already spent', amount: cents(-summary.monthSpending) },
    {
      key: 'bills',
      label: 'Bills you still owe',
      amount: cents(-summary.unpaidBillsTotal),
      detail: billDetail.length ? billDetail : undefined,
    },
    {
      key: 'goals',
      label: 'Saving towards goals',
      amount: cents(-summary.goalsSavingsNeeded),
      detail: goalDetail.length ? goalDetail : undefined,
    },
  ];

  // Read off the summary, never recomputed from the lines.
  const rawTotal = cents(
    summary.monthIncome - summary.monthSpending - summary.unpaidBillsTotal - summary.goalsSavingsNeeded
  );

  return {
    summary,
    lines,
    rawTotal,
    safeToSpend: summary.safeToSpend,
    shortfall: rawTotal < 0,
  };
}
