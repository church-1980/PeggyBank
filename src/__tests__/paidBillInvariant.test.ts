/**
 * PAYING A BILL YOU ALREADY OWED MUST NOT MAKE YOU RICHER.
 *
 * The defect: monthSpending counted only the expenses table. When a bill was
 * marked paid it left "still owed" and was never added to "already spent", so
 * it fell out of the arithmetic entirely:
 *
 *     Bell $425, income $1,000
 *       unpaid  ->  Safe to Spend  $575
 *       PAID    ->  Safe to Spend  $1,000     +$425
 *
 * Money physically left the account and the app said there was more to spend.
 *
 * The invariant: a bill changes STATE, from "still owed" to "money already
 * gone". It does not leave the financial picture. With nothing else changing,
 * Safe to Spend before payment must equal Safe to Spend after.
 */

process.env.TZ = 'America/Toronto';

import { computeFinanceSummary, paidBillsTotalInMonth, cents } from '../core/finance';

const AUG = { monthStart: '2026-08-01', monthEnd: '2026-08-31', today: new Date(2026, 7, 20) };
const bell = { id: 1, name: 'Bell', amount: 425, frequency: 'monthly' as const, due_day: 15 };
const hydro = { id: 2, name: 'Hydro', amount: 143, frequency: 'monthly' as const, due_day: 20 };

const scenario = (over: any = {}) => computeFinanceSummary({
  ...AUG,
  income: [{ amount: 1000, date: '2026-08-01' }],
  expenses: [], bills: [bell], paidCycles: [], goals: [],
  ...over,
});

describe('THE INVARIANT: paying an owed bill changes nothing', () => {
  const owed = scenario();
  const paid = scenario({ paidCycles: [{ bill_id: 1, cycle_date: '2026-08-15', amount: 425 }] });

  it('A. while owed, the bill is reserved', () => {
    expect(owed.unpaidBillsTotal).toBe(425);
    expect(owed.billsPaidTotal).toBe(0);
    expect(owed.safeToSpend).toBe(575);
  });

  it('B. once paid, it leaves "still owed"', () => {
    expect(paid.unpaidBillsTotal).toBe(0);
  });

  it('C. and appears exactly once in money already gone', () => {
    expect(paid.billsPaidTotal).toBe(425);
    expect(paid.monthSpending).toBe(425);
  });

  it('D. SAFE TO SPEND IS UNCHANGED', () => {
    expect(paid.safeToSpend).toBe(owed.safeToSpend);
    expect(paid.safeToSpend).toBe(575);
  });

  it('it is never counted on both sides at once', () => {
    expect(paid.unpaidBillsTotal + paid.billsPaidTotal).toBe(425);
    expect(owed.unpaidBillsTotal + owed.billsPaidTotal).toBe(425);
  });

  it('and never falls off both sides', () => {
    for (const s of [owed, paid]) {
      expect(s.unpaidBillsTotal + s.billsPaidTotal).toBeGreaterThan(0);
    }
  });

  it('it is not counted twice', () => {
    expect(paid.monthSpending).not.toBe(850);
    expect(paid.safeToSpend).not.toBe(150);
  });
});

describe('The amount actually paid is what counts', () => {
  it('a cheaper bill leaves more to spend', () => {
    const s = scenario({ paidCycles: [{ bill_id: 1, cycle_date: '2026-08-15', amount: 400 }] });
    expect(s.billsPaidTotal).toBe(400);
    expect(s.safeToSpend).toBe(600);          // 1000 - 400
  });

  it('a dearer bill leaves less', () => {
    const s = scenario({ paidCycles: [{ bill_id: 1, cycle_date: '2026-08-15', amount: 460 }] });
    expect(s.billsPaidTotal).toBe(460);
    expect(s.safeToSpend).toBe(540);
  });

  it('falls back to the planned amount when none was recorded', () => {
    const s = scenario({ paidCycles: [{ bill_id: 1, cycle_date: '2026-08-15' }] });
    expect(s.billsPaidTotal).toBe(425);
  });
});

describe('Months do not contaminate each other', () => {
  it('LAST MONTH: a July payment is not August spending', () => {
    const s = scenario({ paidCycles: [{ bill_id: 1, cycle_date: '2026-07-15', amount: 425 }] });
    expect(s.billsPaidTotal).toBe(0);
    // Still owed for August, because July's payment settled a different occurrence.
    expect(s.unpaidBillsTotal).toBe(425);
    expect(s.safeToSpend).toBe(575);
  });

  it('NEXT MONTH: a September payment is not August spending', () => {
    const s = scenario({ paidCycles: [{ bill_id: 1, cycle_date: '2026-09-15', amount: 425 }] });
    expect(s.billsPaidTotal).toBe(0);
  });

  it('YEAR BOUNDARY: December does not leak into January', () => {
    const jan = computeFinanceSummary({
      today: new Date(2027, 0, 20), monthStart: '2027-01-01', monthEnd: '2027-01-31',
      income: [{ amount: 1000, date: '2027-01-02' }], expenses: [], bills: [bell],
      paidCycles: [{ bill_id: 1, cycle_date: '2026-12-15', amount: 425 }], goals: [],
    });
    expect(jan.billsPaidTotal).toBe(0);
  });

  it('the month edges are inclusive', () => {
    for (const d of ['2026-08-01', '2026-08-31']) {
      const s = scenario({ paidCycles: [{ bill_id: 1, cycle_date: d, amount: 425 }] });
      expect(s.billsPaidTotal).toBe(425);
    }
  });
});

describe('Several bills, and mixtures', () => {
  const two = [bell, hydro];

  it('several unpaid bills stay reserved', () => {
    const s = scenario({ bills: two });
    expect(s.unpaidBillsTotal).toBe(568);       // 425 + 143
    expect(s.safeToSpend).toBe(432);            // 1000 - 568
  });

  it('several paid bills are summed', () => {
    const s = scenario({
      bills: two,
      paidCycles: [
        { bill_id: 1, cycle_date: '2026-08-15', amount: 425 },
        { bill_id: 2, cycle_date: '2026-08-20', amount: 143 },
      ],
    });
    expect(s.billsPaidTotal).toBe(568);
    expect(s.safeToSpend).toBe(432);            // identical to all-unpaid
  });

  it('paid and unpaid together still reconcile', () => {
    const s = scenario({
      bills: two,
      paidCycles: [{ bill_id: 1, cycle_date: '2026-08-15', amount: 425 }],
    });
    expect(s.billsPaidTotal).toBe(425);
    expect(s.unpaidBillsTotal).toBe(143);
    expect(s.safeToSpend).toBe(432);            // still 1000 - 568
  });

  it('EVERYTHING TOGETHER reconciles', () => {
    const s = scenario({
      bills: two,
      expenses: [{ amount: 86.21, category: 'groceries', date: '2026-08-10' }],
      paidCycles: [{ bill_id: 1, cycle_date: '2026-08-15', amount: 425 }],
      goals: [{ target_amount: 1200, current_amount: 0 }],   // 100/month
    });
    expect(s.everydaySpending).toBe(86.21);
    expect(s.billsPaidTotal).toBe(425);
    expect(s.monthSpending).toBe(511.21);
    expect(s.unpaidBillsTotal).toBe(143);
    expect(s.goalsSavingsNeeded).toBe(100);
    expect(s.safeToSpend).toBe(cents(1000 - 511.21 - 143 - 100));   // 245.79
    expect(s.safeToSpend).toBe(245.79);
  });
});

describe('Empty cases stay sane', () => {
  it('no bills', () => {
    const s = scenario({ bills: [] });
    expect(s.billsPaidTotal).toBe(0);
    expect(s.safeToSpend).toBe(1000);
  });
  it('no income', () => {
    const s = scenario({ income: [] });
    expect(s.safeToSpend).toBe(0);
  });
  it('nothing at all', () => {
    const s = scenario({ income: [], bills: [], expenses: [], goals: [], paidCycles: [] });
    expect(s.monthSpending).toBe(0);
    expect(s.billsPaidTotal).toBe(0);
    expect(s.safeToSpend).toBe(0);
  });
  it('the helper ignores payments outside the window', () => {
    expect(paidBillsTotalInMonth({
      ...AUG, income: [], expenses: [], bills: [bell], goals: [],
      paidCycles: [{ bill_id: 1, cycle_date: '2026-07-31', amount: 425 }],
    })).toBe(0);
  });
});
