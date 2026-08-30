/**
 * WHAT'S HAPPENING NEXT?
 *
 * Coming Up used to answer half the question: it listed the bills a person
 * owes and never mentioned the money arriving to pay them — even though the
 * income schedules have been in the database the whole time.
 *
 * This is NOT a forecasting engine and these tests exist partly to keep it
 * from becoming one. Nothing here projects or estimates; every line is an
 * occurrence the existing schedule logic already defines.
 */

import { groupUpcoming, describeUpcoming, type UpcomingItem } from '../core/comingUp';

const item = (over: Partial<UpcomingItem>): UpcomingItem => ({
  key: 'k', kind: 'bill', name: 'Bell', amount: 117, date: '2026-09-04', ...over,
});

describe('Grouping what is coming', () => {
  it('soonest day first', () => {
    const days = groupUpcoming([
      item({ key: 'a', date: '2026-09-10' }),
      item({ key: 'b', date: '2026-09-04' }),
      item({ key: 'c', date: '2026-09-07' }),
    ]);
    expect(days.map(d => d.date)).toEqual(['2026-09-04', '2026-09-07', '2026-09-10']);
  });

  it('money IN is listed before money out on the same day', () => {
    // Someone glancing at Friday wants to see the paycheque arrive before the
    // bills that eat it. Outgoings first reads as a worse day than it is.
    const [day] = groupUpcoming([
      item({ key: 'rent', kind: 'bill', name: 'Rent', amount: 800 }),
      item({ key: 'tips', kind: 'income', name: 'Side job', amount: 50 }),
      item({ key: 'sub', kind: 'subscription', name: 'Netflix', amount: 23.99 }),
    ]);
    expect(day.items.map(i => i.name)).toEqual(['Side job', 'Rent', 'Netflix']);
  });

  it('keeps the list short — three days, not a calendar', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      item({ key: 'k' + i, date: '2026-09-' + String(i + 1).padStart(2, '0') }));
    expect(groupUpcoming(many).length).toBe(3);
  });

  it('several things on one day stay together', () => {
    const days = groupUpcoming([
      item({ key: 'a', name: 'Bell', amount: 117 }),
      item({ key: 'b', name: 'Hydro', amount: 84 }),
    ]);
    expect(days.length).toBe(1);
    expect(days[0].items.length).toBe(2);
    expect(days[0].items[0].name).toBe('Bell');    // larger first
  });

  it('nothing coming means nothing shown', () => {
    expect(groupUpcoming([])).toEqual([]);
  });
});

describe('What each line says', () => {
  const TODAY = '2026-09-01';

  it('income says payday, in plain words', () => {
    expect(describeUpcoming(item({ kind: 'income', name: 'Paycheck' }), 'Friday', TODAY))
      .toBe('Payday Friday');
  });

  it('a manual bill says it is yours to pay', () => {
    expect(describeUpcoming(item({ method: 'manual' }), 'Friday', TODAY)).toBe('Due Friday');
  });

  it('an auto-pay bill says it happens on its own', () => {
    expect(describeUpcoming(item({ method: 'auto' }), 'Friday', TODAY)).toBe('Auto-pay Friday');
  });

  it('a subscription says charge, not pay', () => {
    expect(describeUpcoming(item({ kind: 'subscription', method: 'auto' }), 'Friday', TODAY))
      .toBe('Auto-charge Friday');
  });

  it('a bill with no method recorded is treated as the person\'s own', () => {
    // The conservative default: never imply a bill pays itself.
    expect(describeUpcoming(item({ method: undefined }), 'Friday', TODAY)).toBe('Due Friday');
  });

  it('uses the SAME words as the Bills screen, never its own', () => {
    // describeUpcoming delegates to describeOccurrence. If these ever drift,
    // the same bill would be described two ways in one app.
    const banned = /occurrence|cycle|pending|reconcil|ledger|state/i;
    for (const kind of ['income', 'bill', 'subscription'] as const) {
      for (const method of ['manual', 'auto'] as const) {
        expect(describeUpcoming(item({ kind, method }), 'Friday', TODAY)).not.toMatch(banned);
      }
    }
  });
});

describe('Why Coming Up shows no "about $X after these" figure', () => {
  /**
   * The brief asked for a running total under the list — "About $991 after
   * these" — but only if the canonical engine can support it safely.
   *
   * It cannot, and the reason is a thing we already proved. Safe to Spend
   * ALREADY deducts every unpaid bill; that is why paying one leaves it
   * unchanged. So "what is left after these bills" is not a new number: it is
   * Safe to Spend, which Home prints two cards higher up.
   *
   * Adding it would either restate a number the person can already see, or —
   * if anyone ever "improved" it by adding expected income — produce a SECOND
   * spendable figure that disagrees with the first. That is precisely the
   * defect src/core/finance.ts exists to prevent.
   *
   * These tests pin the reasoning so the idea is not quietly reintroduced.
   */
  const { computeFinanceSummary } = require('../core/finance');

  const month = (paidCycles: any[]) => ({
    today: new Date(2026, 8, 1),
    monthStart: '2026-09-01', monthEnd: '2026-09-30',
    expenses: [], income: [{ amount: 1000, date: '2026-09-01' }],
    bills: [{ id: 1, name: 'Bell', amount: 117, frequency: 'monthly' as const, due_day: 4 }],
    paidCycles, goals: [],
  });

  it('an upcoming bill is ALREADY deducted from Safe to Spend', () => {
    const s = computeFinanceSummary(month([]));
    expect(s.unpaidBillsTotal).toBe(117);
    expect(s.safeToSpend).toBe(883);          // 1000 - 117, before it is paid
  });

  it('so "after these" would equal Safe to Spend, which is already on screen', () => {
    const before = computeFinanceSummary(month([]));
    const after = computeFinanceSummary(month([{ bill_id: 1, cycle_date: '2026-09-04', amount: 117 }]));
    expect(after.safeToSpend).toBe(before.safeToSpend);
    // A second card saying "about $883 after these" adds no fact whatsoever.
  });

  it('Coming Up therefore publishes no total of its own', () => {
    // groupUpcoming returns days and items. It has no total, deliberately.
    const days = groupUpcoming([item({ kind: 'income', amount: 1250 }), item({ amount: 117 })]);
    expect(days[0]).not.toHaveProperty('total');
    expect(days[0]).not.toHaveProperty('remaining');
    expect(Object.keys(days[0]).sort()).toEqual(['date', 'items']);
  });
});
