import {
  currentCycleDate, nextCycleDate, setCyclePaid, isCyclePaid,
  paidCyclesFor,
} from '../lib/billCycles';

/**
 * Recurring payment state must belong to an OCCURRENCE. The old model stored
 * is_paid on the bill itself, so paying August also marked September paid —
 * the bill vanished from what was owed and stopped reminding, silently.
 */

function makeDb(seed: { bills?: any[]; subscriptions?: any[] } = {}) {
  const store: Record<string, any[]> = {
    bills: seed.bills ?? [],
    subscriptions: seed.subscriptions ?? [],
    bill_payments: [],
  };
  return {
    store,
    async getAllAsync(sql: string, params: any[] = []) {
      if (/FROM bill_payments/.test(sql)) {
        const [source] = params;
        return store.bill_payments.filter((r) => r.source === source && r.paid);
      }
      if (/FROM bills/.test(sql)) return store.bills;
      if (/FROM subscriptions/.test(sql)) return store.subscriptions;
      return [];
    },
    async getFirstAsync(sql: string, params: any[] = []) {
      if (/FROM bill_payments/.test(sql)) {
        const [source, billId, cycle] = params;
        return store.bill_payments.find(
          (r) => r.source === source && r.bill_id === billId && r.cycle_date === cycle
        ) ?? null;
      }
      return null;
    },
    async runAsync(sql: string, params: any[] = []) {
      if (/INSERT OR REPLACE INTO bill_payments/.test(sql)) {
        const [bill_id, source, cycle_date, paid_at, amount] = params;
        store.bill_payments = store.bill_payments.filter(
          (r) => !(r.source === source && r.bill_id === bill_id && r.cycle_date === cycle_date)
        );
        store.bill_payments.push({ bill_id, source, cycle_date, paid: 1, paid_at, amount });
      }
      if (/DELETE FROM bill_payments/.test(sql)) {
        const [source, billId, cycle] = params;
        store.bill_payments = store.bill_payments.filter(
          (r) => !(r.source === source && r.bill_id === billId && r.cycle_date === cycle)
        );
      }
      return { changes: 1 };
    },
  } as any;
}

const AUG = new Date(2026, 7, 20);   // 20 Aug 2026
const SEP = new Date(2026, 8, 20);   // 20 Sep 2026
const monthlyBill = { id: 1, amount: 95.42, frequency: 'monthly', due_day: 5, due_weekday: null };

describe('cycle dates', () => {
  it('gives a monthly bill one occurrence per month', () => {
    expect(currentCycleDate(monthlyBill, AUG)).toBe('2026-08-05');
    expect(currentCycleDate(monthlyBill, SEP)).toBe('2026-09-05');
  });

  it('gives a weekly bill a different occurrence each week', () => {
    const weekly = { id: 2, frequency: 'weekly', due_weekday: 1 }; // Monday
    const w1 = currentCycleDate(weekly, new Date(2026, 7, 20));
    const w2 = currentCycleDate(weekly, new Date(2026, 7, 27));
    expect(w1).not.toBe(w2);
  });

  it('clamps a day-31 bill to a date valid in every month', () => {
    const late = { id: 3, frequency: 'monthly', due_day: 31 };
    expect(() => new Date(currentCycleDate(late, new Date(2026, 1, 15)))).not.toThrow();
    expect(currentCycleDate(late, new Date(2026, 1, 15))).toMatch(/^2026-02-/);
  });

  it('advances to the following occurrence', () => {
    expect(nextCycleDate(monthlyBill, AUG)).toBe('2026-09-05');
  });
});

describe('paying one occurrence does not pay the next', () => {
  it('THE REGRESSION: August paid leaves September unpaid', async () => {
    const db = makeDb({ bills: [monthlyBill] });

    await setCyclePaid(db, 'bill', 1, currentCycleDate(monthlyBill, AUG), true, 95.42);

    expect(await isCyclePaid(db, 'bill', 1, currentCycleDate(monthlyBill, AUG))).toBe(true);
    expect(await isCyclePaid(db, 'bill', 1, currentCycleDate(monthlyBill, SEP))).toBe(false);
  });

  it('a past month stays historically paid', async () => {
    const db = makeDb({ bills: [monthlyBill] });
    await setCyclePaid(db, 'bill', 1, '2026-07-05', true);
    await setCyclePaid(db, 'bill', 1, '2026-08-05', true);
    const paid = await paidCyclesFor(db, 'bill');
    expect(paid.get(1)?.has('2026-07-05')).toBe(true);
    expect(paid.get(1)?.has('2026-08-05')).toBe(true);
  });

  it('weekly occurrences are independent', async () => {
    const weekly = { id: 2, amount: 20, frequency: 'weekly', due_weekday: 1 };
    const db = makeDb({ bills: [weekly] });
    const week1 = currentCycleDate(weekly, new Date(2026, 7, 20));
    const week2 = currentCycleDate(weekly, new Date(2026, 7, 27));
    await setCyclePaid(db, 'bill', 2, week1, true);
    expect(await isCyclePaid(db, 'bill', 2, week1)).toBe(true);
    expect(await isCyclePaid(db, 'bill', 2, week2)).toBe(false);
  });

  it('unmarking one occurrence leaves others untouched', async () => {
    const db = makeDb({ bills: [monthlyBill] });
    await setCyclePaid(db, 'bill', 1, '2026-07-05', true);
    await setCyclePaid(db, 'bill', 1, '2026-08-05', true);
    await setCyclePaid(db, 'bill', 1, '2026-08-05', false);
    expect(await isCyclePaid(db, 'bill', 1, '2026-07-05')).toBe(true);
    expect(await isCyclePaid(db, 'bill', 1, '2026-08-05')).toBe(false);
  });
});

// "Safe to Spend deducts only current unpaid occurrences" — this used to be
// tested against unpaidTotalForCurrentCycles(), a third implementation of
// "how much is still owed" that nothing in the app called (Section 12: dead
// financial code, removed). The same invariants — nothing paid, paid this
// cycle, paying one month does not touch the next, subscriptions included,
// bills/subscriptions kept in separate id namespaces — are pinned against
// the one remaining implementation, core/finance's unpaidBillsTotal, in
// unpaidBillsAgreement.test.ts.
