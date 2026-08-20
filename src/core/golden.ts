/**
 * THE GOLDEN DATASET — deterministic fake data with KNOWN CORRECT ANSWERS.
 *
 * WHY EXPECTED VALUES ARE HAND-COMPUTED
 * -------------------------------------
 * It is not enough to check that Android and web agree. They could agree and
 * both be wrong -- they run the same buggy line of code. So this file states,
 * independently of any app code, what the right answers ARE. The expectations
 * below were worked out by hand and checked with raw arithmetic; nothing here
 * was produced by calling the functions under test.
 *
 * IF YOU CHANGE A NUMBER IN THIS FILE, YOU ARE CHANGING WHAT "CORRECT" MEANS.
 * Do not adjust an expected value to make a red test go green. A red test here
 * means the app computes the wrong number for a real person's money.
 *
 * THE SCENARIO
 * ------------
 * A person in Toronto on Wednesday 19 August 2026. Paid twice a month. Some
 * bills paid, some not. Some goals funded, one over-funded. The dataset
 * deliberately includes rows OUTSIDE August so that any function which forgets
 * to filter by month is caught.
 */

import type { FinanceInput, FinanceExpense, FinanceIncome, FinanceBill, FinanceGoal, PaidCycle } from './finance';

/** Pinned clock: Wednesday 19 August 2026, 8:01 PM local. */
export const GOLDEN_NOW = new Date(2026, 7, 19, 20, 1, 0);
export const GOLDEN_MONTH_START = '2026-08-01';
export const GOLDEN_MONTH_END = '2026-08-31';

/** Two paychecks in August. The July row MUST be excluded by month filtering. */
export const GOLDEN_INCOME: FinanceIncome[] = [
  { amount: 2200.00, date: '2026-07-24' }, // OUT OF RANGE - must not count
  { amount: 2200.00, date: '2026-08-07' },
  { amount: 2200.00, date: '2026-08-21' }, // later this month, still counts
];

/** August spending, plus one row before and one after the month. */
export const GOLDEN_EXPENSES: FinanceExpense[] = [
  { amount: 200.00, category: 'shopping',   date: '2026-07-30' }, // OUT OF RANGE
  { amount: 142.75, category: 'groceries',  date: '2026-08-01' }, // first day, boundary
  { amount:  68.40, category: 'gas',        date: '2026-08-03' },
  { amount:  55.20, category: 'restaurant', date: '2026-08-08' },
  { amount:  98.65, category: 'groceries',  date: '2026-08-12' },
  { amount:  42.00, category: 'fun',        date: '2026-08-15' },
  { amount:  71.30, category: 'gas',        date: '2026-08-19' }, // today
  { amount:  50.00, category: 'groceries',  date: '2026-09-01' }, // OUT OF RANGE
];

/**
 * Bills and subscriptions -- ONE list, because they are the same thing.
 * Phone is due on the 31st, which does not exist in February; it must clamp to
 * 28 rather than vanishing from short months.
 */
export const GOLDEN_BILLS: FinanceBill[] = [
  { id: 1, name: 'Hydro',    amount: 145.00, frequency: 'monthly', due_day: 15 },
  { id: 2, name: 'Internet', amount:  89.99, frequency: 'monthly', due_day: 1  },
  { id: 3, name: 'Netflix',  amount:  20.99, frequency: 'monthly', due_day: 22 },
  { id: 4, name: 'Phone',    amount:  75.00, frequency: 'monthly', due_day: 31 }, // clamps to 28
  { id: 5, name: 'Cleaner',  amount:  60.00, frequency: 'weekly',  due_weekday: 5 }, // Friday
];

/**
 * Paid occurrences. Note the Hydro row is JULY's cycle: it proves that paying a
 * bill last month does not mark it paid this month. Under the old is_paid
 * boolean this row would have wrongly removed $145 from what the user owes.
 */
export const GOLDEN_PAID_CYCLES: PaidCycle[] = [
  { bill_id: 2, cycle_date: '2026-08-01' }, // Internet, this month - PAID
  { bill_id: 1, cycle_date: '2026-07-15' }, // Hydro, LAST month - still owed now
  { bill_id: 5, cycle_date: '2026-08-14' }, // Cleaner, this week - PAID
];

/** One partly funded, one exactly funded, one barely started, one over-funded. */
export const GOLDEN_GOALS: FinanceGoal[] = [
  { target_amount: 3000, current_amount: 1200 }, // gap 1800 -> 150.00/mo
  { target_amount: 1500, current_amount: 1500 }, // funded  -> 0
  { target_amount: 2400, current_amount:  600 }, // gap 1800 -> 150.00/mo
  { target_amount:  500, current_amount:  800 }, // OVER-funded -> 0, never negative
];

export const GOLDEN_INPUT: FinanceInput = {
  today: GOLDEN_NOW,
  monthStart: GOLDEN_MONTH_START,
  monthEnd: GOLDEN_MONTH_END,
  expenses: GOLDEN_EXPENSES,
  income: GOLDEN_INCOME,
  bills: GOLDEN_BILLS,
  paidCycles: GOLDEN_PAID_CYCLES,
  goals: GOLDEN_GOALS,
};

/**
 * THE KNOWN CORRECT ANSWERS.
 *
 * Worked out by hand from GOLDEN_* above:
 *
 *   monthIncome        2200.00 + 2200.00                     = 4400.00
 *                      (the 2026-07-24 paycheck is excluded)
 *   monthSpending      142.75 + 68.40 + 55.20 + 98.65
 *                      + 42.00 + 71.30                       =  478.30
 *                      (2026-07-30 and 2026-09-01 excluded)
 *   moneyLeft          4400.00 - 478.30                      = 3921.70
 *
 *   cycle dates on Wed 2026-08-19:
 *     Hydro     due 15  -> 2026-08-15   NOT paid (only July was paid)
 *     Internet  due  1  -> 2026-08-01   PAID
 *     Netflix   due 22  -> 2026-08-22   NOT paid
 *     Phone     due 31  -> clamps to 28 -> 2026-08-28  NOT paid
 *     Cleaner   Friday  -> 2026-08-14   PAID
 *   unpaidBillsTotal   145.00 + 20.99 + 75.00                =  240.99
 *
 *   goalsSavingsNeeded 1800/12 + 0 + 1800/12 + 0             =  300.00
 *
 *   safeToSpend        3921.70 - 240.99 - 300.00             = 3380.71
 *   daysLeftInMonth    31 - 19                               =   12
 *   dailyAllowance     3380.71 / 12                          =  281.73
 */
export const GOLDEN_EXPECTED = {
  monthIncome: 4400.00,
  monthSpending: 478.30,
  moneyLeft: 3921.70,
  unpaidBillsTotal: 240.99,
  goalsSavingsNeeded: 300.00,
  safeToSpend: 3380.71,
  daysLeftInMonth: 12,
  dailyAllowance: 281.73,
} as const;

/** Which bills are still owed, by name, on the golden date. */
export const GOLDEN_EXPECTED_UNPAID_NAMES = ['Hydro', 'Netflix', 'Phone'] as const;

/** Cycle date each bill belongs to on the golden date. */
export const GOLDEN_EXPECTED_CYCLES: Record<string, string> = {
  Hydro: '2026-08-15',
  Internet: '2026-08-01',
  Netflix: '2026-08-22',
  Phone: '2026-08-28',   // due_day 31 clamped to 28
  Cleaner: '2026-08-14', // most recent Friday on/before Wed Aug 19
};

/** August spending by category, highest first. Must total monthSpending. */
export const GOLDEN_EXPECTED_CATEGORIES = [
  { category: 'groceries',  total: 241.40 }, // 142.75 + 98.65
  { category: 'gas',        total: 139.70 }, //  68.40 + 71.30
  { category: 'restaurant', total:  55.20 },
  { category: 'fun',        total:  42.00 },
] as const;

/** Goal completion percentages, in GOLDEN_GOALS order. Over-funded clamps to 100. */
export const GOLDEN_EXPECTED_GOAL_PERCENTS = [40, 100, 25, 100] as const;

/**
 * Debt payoff cases, hand-checked against the standard amortisation formula.
 * The third case is the important one: a payment that only covers the monthly
 * interest never reduces the balance, so the honest answer is "never", not a number.
 */
export const GOLDEN_DEBT_CASES = [
  { balance: 2000, apr: 0,     payment: 250, expectedMonths: 8 },
  { balance: 5000, apr: 19.99, payment: 200, expectedMonths: 33 },
  { balance: 5000, apr: 24,    payment: 100, expectedMonths: null }, // never pays off
] as const;
