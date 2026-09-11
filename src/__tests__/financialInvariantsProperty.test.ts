/**
 * PROPERTY-BASED FINANCIAL INVARIANTS (diagnostic section 6).
 *
 * The existing suite checks hand-picked scenarios (golden data, specific
 * edge cases). This generates MANY random-but-deterministic scenarios —
 * random income, expenses, bills, paid/unpaid cycles, goals and debt
 * payments — and checks invariants that must hold for EVERY combination,
 * not just the ones someone thought to write by hand.
 *
 * No new dependency: a small seeded PRNG (mulberry32) instead of pulling in
 * a property-testing library, so this stays inside the project's existing
 * "no huge framework" preference. The seed is fixed, so a failure is always
 * reproducible — printed on failure so it can be pinned as a new named
 * scenario if it ever finds something real.
 */
import { computeFinanceSummary, cents, type FinanceInput } from '../core/finance';

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomScenario(rand: () => number): FinanceInput {
  const monthStart = '2026-08-01';
  const monthEnd = '2026-08-31';
  const randDate = () => `2026-08-${String(1 + Math.floor(rand() * 31)).padStart(2, '0')}`;
  const randAmount = () => cents(rand() * 5000);

  const n = (max: number) => Math.floor(rand() * max);

  const expenses = Array.from({ length: n(8) }, () => ({ amount: randAmount(), date: randDate() }));
  const income = Array.from({ length: n(4) }, () => ({ amount: randAmount(), date: randDate() }));
  const bills = Array.from({ length: n(6) }, (_, i) => ({
    id: i + 1, amount: randAmount(),
    frequency: (rand() > 0.5 ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    due_day: 1 + n(31), due_weekday: n(7),
  }));
  // Some bills randomly marked paid this cycle.
  const paidCycles = bills
    .filter(() => rand() > 0.5)
    .map(b => ({
      bill_id: b.id,
      cycle_date: b.frequency === 'weekly' ? randDate() : `2026-08-${String(Math.min(b.due_day, 28)).padStart(2, '0')}`,
      amount: rand() > 0.3 ? randAmount() : undefined,
    }));
  const goals = Array.from({ length: n(5) }, () => {
    const target = randAmount() + 1;
    return { target_amount: target, current_amount: rand() * target * 1.5 }; // sometimes over-funded
  });
  const debtPayments = Array.from({ length: n(4) }, () => ({ amount: randAmount(), date: randDate() }));

  return {
    today: new Date(2026, 7, 1 + n(31)),
    monthStart, monthEnd, expenses, income, bills, paidCycles, goals, debtPayments,
  };
}

const SEED = 20260911;
const RUNS = 500;

describe(`Financial invariants hold across ${RUNS} random scenarios (seed ${SEED})`, () => {
  const rand = mulberry32(SEED);

  for (let i = 0; i < RUNS; i++) {
    const input = randomScenario(rand);

    it(`run ${i}`, () => {
      const s = computeFinanceSummary(input);
      // On failure, jest prints the `it` name ("run N") and the actual vs
      // expected values below — with SEED fixed, re-running this file
      // reproduces the exact same 500 scenarios, so a failing run number is
      // enough to reproduce and pin as a named scenario.

      // Never NaN or Infinity anywhere in the summary.
      for (const value of Object.values(s)) {
        expect(Number.isFinite(value)).toBe(true);
      }

      // Safe to Spend is never negative (floored), and never exceeds the
      // signed moneyLeft it was derived from (subtracting non-negative
      // unpaid bills and goal needs can only ever reduce it).
      expect(s.safeToSpend).toBeGreaterThanOrEqual(0);
      expect(s.safeToSpend).toBeLessThanOrEqual(Math.max(0, s.moneyLeft));

      // Money out is exactly the sum of its three declared parts — the
      // arithmetic this whole repair pass exists to keep true.
      expect(cents(s.everydaySpending + s.billsPaidTotal + s.debtPaymentsTotal))
        .toBe(s.monthSpending);

      // moneyLeft is exactly income minus spending — never independently
      // adjusted.
      expect(cents(s.monthIncome - s.monthSpending)).toBe(s.moneyLeft);

      // Never negative, by construction of the underlying sums.
      expect(s.unpaidBillsTotal).toBeGreaterThanOrEqual(0);
      expect(s.goalsSavingsNeeded).toBeGreaterThanOrEqual(0);
      expect(s.everydaySpending).toBeGreaterThanOrEqual(0);
      expect(s.billsPaidTotal).toBeGreaterThanOrEqual(0);
      expect(s.debtPaymentsTotal).toBeGreaterThanOrEqual(0);
      expect(s.monthIncome).toBeGreaterThanOrEqual(0);

      // Days left is always a real day count within the month.
      expect(s.daysLeftInMonth).toBeGreaterThanOrEqual(0);
      expect(s.daysLeftInMonth).toBeLessThanOrEqual(31);
    });
  }

  it('an all-bills-paid scenario always has zero unpaid, deterministically', () => {
    const input = randomScenario(rand);
    const allPaid: FinanceInput = {
      ...input,
      paidCycles: input.bills.map(b => ({
        bill_id: b.id as number,
        cycle_date: b.frequency === 'weekly'
          ? '2026-08-01' // not exact, only checked below via the bill's own logic
          : `2026-08-${String(Math.min(b.due_day ?? 1, 28)).padStart(2, '0')}`,
      })),
    };
    // Monthly bills are exactly matched by cycle date above; weekly bills
    // are not (their true current cycle depends on `today`), so only assert
    // on the monthly subset to keep this property meaningful rather than
    // re-deriving billCycles' own weekday math here.
    const monthlyOnly: FinanceInput = { ...allPaid, bills: allPaid.bills.filter(b => b.frequency === 'monthly') };
    const s = computeFinanceSummary(monthlyOnly);
    expect(s.unpaidBillsTotal).toBe(0);
  });
});
