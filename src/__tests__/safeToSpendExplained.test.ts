/**
 * "WHY CAN I SPEND $1,143?"
 *
 * The explanation shown when someone taps Safe to Spend must be produced by the
 * SAME calculation as the headline figure. If it did its own arithmetic the two
 * would eventually disagree -- the app would show one number and then explain a
 * different one, and neither could be trusted again.
 *
 * So these tests do not check wording. They check the MATHEMATICS: that the
 * lines reconcile exactly to the total, in ordinary months and awkward ones.
 */

process.env.TZ = 'America/Toronto';

import { explainSafeToSpend, computeFinanceSummary, cents } from '../core/finance';
import { GOLDEN_INPUT, GOLDEN_EXPECTED } from '../core/golden';

/** What the explanation adds up to. */
const sumLines = (lines: { amount: number }[]) => cents(lines.reduce((s, l) => s + l.amount, 0));

describe('The explanation reconciles to the number on screen', () => {
  it('the golden month adds up exactly', () => {
    const e = explainSafeToSpend(GOLDEN_INPUT);
    expect(e.safeToSpend).toBe(GOLDEN_EXPECTED.safeToSpend);
    expect(sumLines(e.lines)).toBe(GOLDEN_EXPECTED.safeToSpend);
  });

  it('every line matches the canonical engine, not a second calculation', () => {
    const e = explainSafeToSpend(GOLDEN_INPUT);
    const s = computeFinanceSummary(GOLDEN_INPUT);
    const by = Object.fromEntries(e.lines.map(l => [l.key, l.amount]));
    expect(by.income).toBe(s.monthIncome);
    expect(by.spending).toBe(cents(-s.monthSpending));
    expect(by.bills).toBe(cents(-s.unpaidBillsTotal));
    expect(by.goals).toBe(cents(-s.goalsSavingsNeeded));
  });

  it('the headline it explains IS the headline the app shows', () => {
    const e = explainSafeToSpend(GOLDEN_INPUT);
    expect(e.safeToSpend).toBe(e.summary.safeToSpend);
  });

  it('names the bills behind the total, so it can be inspected further', () => {
    const e = explainSafeToSpend(GOLDEN_INPUT);
    const bills = e.lines.find(l => l.key === 'bills')!;
    expect(bills.detail!.map(d => d.label).sort()).toEqual(['Hydro', 'Netflix', 'Phone']);
    expect(cents(bills.detail!.reduce((s, d) => s + d.amount, 0))).toBe(GOLDEN_EXPECTED.unpaidBillsTotal);
  });

  it('the goal lines add up to the goal total', () => {
    const e = explainSafeToSpend(GOLDEN_INPUT);
    const goals = e.lines.find(l => l.key === 'goals')!;
    expect(cents(goals.detail!.reduce((s, d) => s + d.amount, 0))).toBe(GOLDEN_EXPECTED.goalsSavingsNeeded);
  });
});

describe('Awkward months still reconcile', () => {
  const base = GOLDEN_INPUT;

  it('with more than three goals, every one is counted', () => {
    const five = {
      ...base,
      goals: [
        { target_amount: 1200, current_amount: 0 },
        { target_amount: 2400, current_amount: 0 },
        { target_amount: 3600, current_amount: 0 },
        { target_amount: 4800, current_amount: 0 },
        { target_amount: 6000, current_amount: 0 },
      ],
    };
    const e = explainSafeToSpend(five);
    const goals = e.lines.find(l => l.key === 'goals')!;
    expect(goals.detail).toHaveLength(5);                 // not 3
    expect(goals.amount).toBe(cents(-(1200 + 2400 + 3600 + 4800 + 6000) / 12));
    expect(sumLines(e.lines)).toBe(e.rawTotal);
  });

  it('with no bills, no goals and no spending it is just the income', () => {
    const e = explainSafeToSpend({ ...base, bills: [], paidCycles: [], goals: [], expenses: [] });
    expect(e.safeToSpend).toBe(GOLDEN_EXPECTED.monthIncome);
    expect(sumLines(e.lines)).toBe(GOLDEN_EXPECTED.monthIncome);
  });

  it('an empty month explains zero without inventing anything', () => {
    const e = explainSafeToSpend({
      ...base, income: [], expenses: [], bills: [], paidCycles: [], goals: [],
    });
    expect(e.safeToSpend).toBe(0);
    expect(sumLines(e.lines)).toBe(0);
    expect(e.shortfall).toBe(false);
  });

  it('SHORTFALL: when the lines go below zero it says so and still shows zero', () => {
    const broke = {
      ...base,
      income: [{ amount: 100, date: '2026-08-01' }],
      expenses: [{ amount: 900, category: 'other', date: '2026-08-02' }],
    };
    const e = explainSafeToSpend(broke);
    expect(e.safeToSpend).toBe(0);              // never a negative "safe" figure
    expect(e.rawTotal).toBeLessThan(0);         // but the truth is not hidden
    expect(e.shortfall).toBe(true);
    expect(sumLines(e.lines)).toBe(e.rawTotal); // the lines still reconcile
  });

  it('a bill already paid is not still being deducted', () => {
    const paidAll = {
      ...base,
      paidCycles: [
        { bill_id: 1, cycle_date: '2026-08-15' },
        { bill_id: 2, cycle_date: '2026-08-01' },
        { bill_id: 3, cycle_date: '2026-08-22' },
        { bill_id: 4, cycle_date: '2026-08-28' },
        { bill_id: 5, cycle_date: '2026-08-14' },
      ],
    };
    const e = explainSafeToSpend(paidAll);
    expect(e.lines.find(l => l.key === 'bills')!.amount).toBe(0);
    expect(e.lines.find(l => l.key === 'bills')!.detail).toBeUndefined();
    expect(sumLines(e.lines)).toBe(e.safeToSpend);
  });

  it('reconciles across every month of the year, not just this one', () => {
    for (let m = 0; m < 12; m++) {
      const mm = String(m + 1).padStart(2, '0');
      const e = explainSafeToSpend({
        ...base,
        today: new Date(2026, m, 10),
        monthStart: '2026-' + mm + '-01',
        monthEnd: '2026-' + mm + '-28',
      });
      expect(sumLines(e.lines)).toBe(e.rawTotal);
      if (!e.shortfall) expect(sumLines(e.lines)).toBe(e.safeToSpend);
    }
  });
});
