/**
 * FINANCIAL INVARIANTS vs THE GOLDEN DATASET (audit sections 3 and 4).
 *
 * These tests do not ask "do Android and web agree?" -- they ask "is the number
 * RIGHT?", against expectations hand-computed in src/core/golden.ts.
 *
 * If one of these goes red, do not edit the expected value. The expected value
 * is the definition of correct; a red test means the app is telling someone the
 * wrong thing about their money.
 */

import {
  computeFinanceSummary, unpaidBills, currentCycleDateFor, spendingByCategory,
  goalProgressPercent, monthlyGoalContribution, goalsSavingsNeeded,
  debtPayoffMonths, debtTotalInterest, sumAmounts, inRange, cents,
} from '../core/finance';
import {
  GOLDEN_INPUT, GOLDEN_NOW, GOLDEN_BILLS, GOLDEN_GOALS, GOLDEN_EXPENSES,
  GOLDEN_MONTH_START, GOLDEN_MONTH_END, GOLDEN_PAID_CYCLES,
  GOLDEN_EXPECTED, GOLDEN_EXPECTED_UNPAID_NAMES, GOLDEN_EXPECTED_CYCLES,
  GOLDEN_EXPECTED_CATEGORIES, GOLDEN_EXPECTED_GOAL_PERCENTS, GOLDEN_DEBT_CASES,
} from '../core/golden';

describe('Golden dataset — every headline number', () => {
  const s = computeFinanceSummary(GOLDEN_INPUT);

  it('income counts only this month', () => {
    expect(s.monthIncome).toBe(GOLDEN_EXPECTED.monthIncome);
  });

  it('spending counts only this month', () => {
    expect(s.monthSpending).toBe(GOLDEN_EXPECTED.monthSpending);
  });

  it('money left is income minus spending', () => {
    expect(s.moneyLeft).toBe(GOLDEN_EXPECTED.moneyLeft);
  });

  it('unpaid bills total is correct', () => {
    expect(s.unpaidBillsTotal).toBe(GOLDEN_EXPECTED.unpaidBillsTotal);
  });

  it('goal savings needed is correct', () => {
    expect(s.goalsSavingsNeeded).toBe(GOLDEN_EXPECTED.goalsSavingsNeeded);
  });

  it('SAFE TO SPEND is correct', () => {
    expect(s.safeToSpend).toBe(GOLDEN_EXPECTED.safeToSpend);
  });

  it('days left in month is correct', () => {
    expect(s.daysLeftInMonth).toBe(GOLDEN_EXPECTED.daysLeftInMonth);
  });

  it('daily allowance is correct', () => {
    expect(s.dailyAllowance).toBe(GOLDEN_EXPECTED.dailyAllowance);
  });
});

describe('Bill cycles — paid-ness is per occurrence, not permanent', () => {
  it('assigns each bill to the right cycle date', () => {
    for (const b of GOLDEN_BILLS) {
      expect(currentCycleDateFor(b, GOLDEN_NOW)).toBe(GOLDEN_EXPECTED_CYCLES[b.name!]);
    }
  });

  it('a bill paid LAST month is still owed THIS month', () => {
    // Hydro was paid for 2026-07-15 only. It must reappear as owed in August.
    const names = unpaidBills(GOLDEN_BILLS, GOLDEN_PAID_CYCLES, GOLDEN_NOW).map(b => b.name);
    expect(names).toContain('Hydro');
  });

  it('lists exactly the bills still owed', () => {
    const names = unpaidBills(GOLDEN_BILLS, GOLDEN_PAID_CYCLES, GOLDEN_NOW).map(b => b.name).sort();
    expect(names).toEqual([...GOLDEN_EXPECTED_UNPAID_NAMES].sort());
  });

  it('a due day of 31 clamps to 28 so the bill exists in February', () => {
    const phone = GOLDEN_BILLS.find(b => b.name === 'Phone')!;
    expect(currentCycleDateFor(phone, new Date(2027, 1, 10))).toBe('2027-02-28');
  });

  it('paying this cycle removes the bill from what is owed', () => {
    const paid = [...GOLDEN_PAID_CYCLES, { bill_id: 1, cycle_date: '2026-08-15' }];
    const names = unpaidBills(GOLDEN_BILLS, paid, GOLDEN_NOW).map(b => b.name);
    expect(names).not.toContain('Hydro');
  });
});

describe('Goals — never negative, never over 100%', () => {
  it('computes each goal percentage, clamping an over-funded goal to 100', () => {
    const pcts = GOLDEN_GOALS.map(g => goalProgressPercent(g.target_amount, g.current_amount));
    expect(pcts).toEqual([...GOLDEN_EXPECTED_GOAL_PERCENTS]);
  });

  it('a fully funded goal needs no more monthly saving', () => {
    expect(monthlyGoalContribution(1500, 1500)).toBe(0);
  });

  it('an over-funded goal contributes 0, never a negative that inflates Safe to Spend', () => {
    expect(monthlyGoalContribution(500, 800)).toBe(0);
    expect(goalsSavingsNeeded([{ target_amount: 500, current_amount: 800 }])).toBe(0);
  });

  it('a zero target shows 0%, not NaN or Infinity', () => {
    expect(goalProgressPercent(0, 100)).toBe(0);
    expect(Number.isFinite(goalProgressPercent(0, 100))).toBe(true);
  });
});

describe('Spending breakdown', () => {
  const cats = spendingByCategory(inRange(GOLDEN_EXPENSES, GOLDEN_MONTH_START, GOLDEN_MONTH_END));

  it('groups by category, highest first', () => {
    expect(cats).toEqual([...GOLDEN_EXPECTED_CATEGORIES]);
  });

  it('category totals add up to EVERYDAY spending — no money invented or lost', () => {
    // Categories describe everyday expenses: groceries, gas, restaurants.
    // A paid bill has no such category, and inventing one for Bell so a chart
    // balanced would be a lie about what kind of spending it was. So this
    // reconciles to everydaySpending, and the bills half is checked separately.
    const total = cents(cats.reduce((s, c) => s + c.total, 0));
    expect(total).toBe(GOLDEN_EXPECTED.everydaySpending);
  });

  it('and the two halves of money out add up to the whole', () => {
    // everyday spending + bills actually paid = all money out.
    expect(cents(GOLDEN_EXPECTED.everydaySpending + GOLDEN_EXPECTED.billsPaidTotal))
      .toBe(GOLDEN_EXPECTED.monthSpending);
  });
});

describe('Debt payoff', () => {
  it.each(GOLDEN_DEBT_CASES.map(c => [c.balance, c.apr, c.payment, c.expectedMonths] as const))(
    '$%s at %s%% paying $%s/mo pays off in %s months',
    (balance, apr, payment, expected) => {
      expect(debtPayoffMonths(balance, apr, payment)).toBe(expected);
    }
  );

  it('says "never" rather than a number when the payment only covers interest', () => {
    // $5000 at 24% accrues exactly $100/month. Paying $100 never reduces the balance.
    expect(debtPayoffMonths(5000, 24, 100)).toBeNull();
    expect(debtTotalInterest(5000, 24, 100)).toBeNull();
  });

  it('an already-cleared debt takes 0 months', () => {
    expect(debtPayoffMonths(0, 19.99, 100)).toBe(0);
  });

  it('charges no interest at 0% APR', () => {
    expect(debtTotalInterest(2000, 0, 250)).toBe(0);
  });
});

describe('Arithmetic safety', () => {
  it('does not leak floating-point dust into displayed money', () => {
    // 0.1 + 0.2 must be 0.30, not 0.30000000000000004
    expect(sumAmounts([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });

  it('ignores corrupt amounts instead of turning the whole total into NaN', () => {
    expect(sumAmounts([{ amount: 10 }, { amount: NaN as number }, { amount: 5 }])).toBe(15);
  });

  it('includes rows on the first and last day of the month', () => {
    const rows = [{ amount: 1, date: '2026-08-01' }, { amount: 2, date: '2026-08-31' }];
    expect(inRange(rows, '2026-08-01', '2026-08-31')).toHaveLength(2);
  });

  it('never reports a negative Safe to Spend', () => {
    const broke = computeFinanceSummary({
      ...GOLDEN_INPUT,
      income: [{ amount: 100, date: '2026-08-01' }],
      expenses: [{ amount: 9000, category: 'other', date: '2026-08-02' }],
    });
    expect(broke.safeToSpend).toBe(0);
    expect(broke.moneyLeft).toBeLessThan(0); // but the true figure stays honest
  });

  it('handles an empty database without crashing or showing NaN', () => {
    const empty = computeFinanceSummary({
      today: GOLDEN_NOW, monthStart: GOLDEN_MONTH_START, monthEnd: GOLDEN_MONTH_END,
      expenses: [], income: [], bills: [], paidCycles: [], goals: [],
    });
    for (const [k, v] of Object.entries(empty)) {
      expect(Number.isFinite(v as number)).toBe(true);
    }
    expect(empty.safeToSpend).toBe(0);
  });
});
