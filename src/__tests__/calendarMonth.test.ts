/**
 * DOES THE CALENDAR UNDERSTAND PAST, PRESENT AND FUTURE?
 *
 * The old Calendar drew coloured dots from four tables and never read
 * bill_payments at all, so it could not tell a paid bill from an owed one. A
 * past month showed every bill as still due, and a bill paid early looked
 * unpaid right up to its due date.
 *
 * These prove the two rules that make a financial calendar honest:
 *
 *   PLANS PROJECT. A bill exists in March whether or not any row says March.
 *   MONEY DOES NOT. Real spending sits on the day it happened, and nothing is
 *   invented forwards.
 */

process.env.TZ = 'America/Toronto';

import {
  buildMonth, cellEntries, displayDay, occurrenceKey, paymentDay,
  type MonthInput,
} from '../core/calendarMonth';

const BELL = { id: 1, name: 'Bell', amount: 117, due_day: 15, frequency: 'monthly', payment_method: 'manual' };
const NETFLIX = { id: 1, name: 'Netflix', amount: 23.99, billing_day: 20, payment_method: 'auto' };

const month = (over: Partial<MonthInput> = {}): MonthInput => ({
  year: 2026, month: 8, today: '2026-09-15',        // September 2026
  bills: [BELL], subscriptions: [], payments: [],
  expenses: [], income: [], paydays: [],
  ...over,
});

const on = (m: Map<string, any[]>, date: string) => m.get(date) ?? [];

describe('Plans project through time', () => {
  it('a bill appears in a month no record mentions', () => {
    const march = buildMonth(month({ year: 2027, month: 2, today: '2026-09-15' }));
    expect(on(march, '2027-03-15').length).toBe(1);
    expect(on(march, '2027-03-15')[0].label).toBe('Bell');
  });

  it('and in a month that has already gone', () => {
    const january = buildMonth(month({ year: 2026, month: 0 }));
    expect(on(january, '2026-01-15').length).toBe(1);
  });

  it('across a year boundary', () => {
    const dec = buildMonth(month({ year: 2025, month: 11 }));
    const jan = buildMonth(month({ year: 2027, month: 0 }));
    expect(on(dec, '2025-12-15').length).toBe(1);
    expect(on(jan, '2027-01-15').length).toBe(1);
  });

  it('a subscription projects too', () => {
    const m = buildMonth(month({ bills: [], subscriptions: [NETFLIX] }));
    expect(on(m, '2026-09-20')[0].label).toBe('Netflix');
    expect(on(m, '2026-09-20')[0].state).toBe('auto');   // it charges itself
  });
});

describe('Real money never moves and is never invented', () => {
  it('an expense sits on the day it happened', () => {
    const m = buildMonth(month({
      expenses: [{ id: 7, amount: 11.60, note: 'Tim Hortons', category: 'restaurant', date: '2026-09-03' }],
    }));
    expect(on(m, '2026-09-03')[0].label).toBe('Tim Hortons');
    expect(on(m, '2026-09-03')[0].state).toBe('actual');
  });

  it('a future month contains no spending, because none has happened', () => {
    const future = buildMonth(month({
      year: 2027, month: 5,
      expenses: [],                                   // the caller queries the month; there is none
    }));
    for (const list of future.values()) {
      expect(list.every(e => e.kind !== 'expense')).toBe(true);
    }
  });

  it('a payday in the future is EXPECTED, not claimed as received', () => {
    const m = buildMonth(month({
      today: '2026-09-01',
      paydays: [{ date: '2026-09-25', label: 'Paycheck', amount: 1250 }],
    }));
    expect(on(m, '2026-09-25')[0].state).toBe('expected');
  });

  it('a payday already passed reads as actual', () => {
    const m = buildMonth(month({
      today: '2026-09-30',
      paydays: [{ date: '2026-09-25', label: 'Paycheck', amount: 1250 }],
    }));
    expect(on(m, '2026-09-25')[0].state).toBe('actual');
  });
});

describe('Paid, and paid when', () => {
  const payment = (over: any = {}) => ({
    source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
    paid_at: '2026-09-15T14:00:00.000Z', amount: 117, status: 'confirmed', ...over,
  });

  it('a bill paid on its due date simply reads Paid', () => {
    const m = buildMonth(month({ payments: [payment()] }));
    const e = on(m, '2026-09-15')[0];
    expect(e.state).toBe('paid');
    expect(e.amount).toBe(117);
  });

  it('an unpaid bill reads due, and carries its amount', () => {
    const m = buildMonth(month());
    expect(on(m, '2026-09-15')[0].state).toBe('due');
    expect(on(m, '2026-09-15')[0].amount).toBe(117);
  });

  it('an auto-pay bill nobody has confirmed reads auto, not paid', () => {
    const m = buildMonth(month({
      bills: [{ ...BELL, payment_method: 'auto' }],
    }));
    expect(on(m, '2026-09-15')[0].state).toBe('auto');
  });

  it('a FAILED payment is owed again, not settled', () => {
    const m = buildMonth(month({
      payments: [payment({ paid: 0, status: 'failed' })],
    }));
    expect(on(m, '2026-09-15')[0].state).toBe('due');
  });
});

describe('Paid early, paid late — two dates, one payment', () => {
  /**
   * A bill occurrence has a date it BELONGS to. A payment has a date the money
   * MOVED. Both are true at once, and the calendar has to show both without
   * ever implying the money left twice.
   */

  it('September\'s bill paid on 3 September: money on the 3rd, occurrence satisfied', () => {
    const m = buildMonth(month({
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 8, 3, 10, 0).toISOString(),   // 3 Sep, local morning
        amount: 117, status: 'confirmed',
      }],
    }));

    const moved = on(m, '2026-09-03');
    const occurrence = on(m, '2026-09-15');

    expect(moved.length).toBe(1);
    expect(moved[0].amount).toBe(117);            // the money, where it moved
    expect(occurrence[0].state).toBe('paidEarly');
    expect(occurrence[0].amount).toBeUndefined(); // NOT counted a second time
  });

  it('the future occurrence does not read unpaid once it is settled early', () => {
    const m = buildMonth(month({
      today: '2026-09-01',
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 7, 28, 10, 0).toISOString(),  // paid last month
        amount: 117, status: 'confirmed',
      }],
    }));
    const occurrence = on(m, '2026-09-15')[0];
    expect(occurrence.state).toBe('paidEarly');
    expect(occurrence.state).not.toBe('due');
  });

  it('paid in a DIFFERENT month, the money is not drawn in this one', () => {
    // The payment belongs to August's grid, not September's. Showing it here
    // would put the same $117 on two months.
    const m = buildMonth(month({
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 7, 28, 10, 0).toISOString(),
        amount: 117, status: 'confirmed',
      }],
    }));
    let withAmount = 0;
    for (const list of m.values()) for (const e of list) if (e.amount != null) withAmount++;
    expect(withAmount).toBe(0);
  });

  it('paid LATE: money on the later day, occurrence marked late', () => {
    const m = buildMonth(month({
      today: '2026-09-30',
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 8, 22, 10, 0).toISOString(),  // 22 Sep
        amount: 117, status: 'confirmed',
      }],
    }));
    expect(on(m, '2026-09-22')[0].amount).toBe(117);
    expect(on(m, '2026-09-15')[0].state).toBe('paidLate');
  });

  it('the amount appears exactly once, whenever it was paid', () => {
    for (const day of [3, 15, 22]) {
      const m = buildMonth(month({
        payments: [{
          source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
          paid_at: new Date(2026, 8, day, 10, 0).toISOString(),
          amount: 117, status: 'confirmed',
        }],
      }));
      let total = 0;
      for (const list of m.values()) for (const e of list) total += e.amount ?? 0;
      expect(total).toBe(117);              // never 234
    }
  });

  it('an amount that differed from the plan shows what was actually paid', () => {
    const m = buildMonth(month({
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 8, 15, 10, 0).toISOString(),
        amount: 121.36, status: 'confirmed',
      }],
    }));
    expect(on(m, '2026-09-15')[0].amount).toBe(121.36);
  });
});

describe('The UTC timestamp trap', () => {
  it('a payment tapped late on the 31st stays on the 31st', () => {
    // paid_at is stored as UTC. Slicing it would move an 8:30pm payment to the
    // next day — and here, into the next MONTH.
    const tapped = new Date(2026, 7, 31, 20, 30);          // 31 Aug, 8:30pm
    expect(tapped.toISOString().slice(0, 10)).toBe('2026-09-01');   // the trap
    expect(paymentDay(tapped.toISOString(), 'fallback')).toBe('2026-08-31');
  });

  it('a missing timestamp falls back rather than guessing', () => {
    expect(paymentDay(null, '2026-09-15')).toBe('2026-09-15');
    expect(paymentDay('nonsense', '2026-09-15')).toBe('2026-09-15');
  });
});

describe('Months are not all the same length', () => {
  it('a bill due on the 31st lands on the last day of shorter months', () => {
    expect(displayDay(31, 2026, 0)).toBe('2026-01-31');   // January
    expect(displayDay(31, 2026, 3)).toBe('2026-04-30');   // April has 30
    expect(displayDay(31, 2026, 1)).toBe('2026-02-28');   // February
    expect(displayDay(31, 2028, 1)).toBe('2028-02-29');   // leap February
  });

  it('the 29th and 30th behave the same way', () => {
    expect(displayDay(29, 2026, 1)).toBe('2026-02-28');
    expect(displayDay(29, 2028, 1)).toBe('2028-02-29');   // exists in a leap year
    expect(displayDay(30, 2026, 1)).toBe('2026-02-28');
    expect(displayDay(30, 2026, 8)).toBe('2026-09-30');
  });

  it('never produces a day that does not exist', () => {
    for (let y = 2024; y <= 2028; y++) {
      for (let m = 0; m < 12; m++) {
        for (const due of [28, 29, 30, 31]) {
          const iso = displayDay(due, y, m);
          const d = new Date(iso + 'T12:00:00');
          expect(d.getMonth()).toBe(m);           // did not roll into next month
          expect(iso.slice(0, 7)).toBe(`${y}-${String(m + 1).padStart(2, '0')}`);
        }
      }
    }
  });
});

describe('Displaying on the real day while keying by the canonical occurrence', () => {
  /**
   * These are deliberately NOT the same function.
   *
   * billCycles clamps an occurrence to the 28th so its identity is stable in
   * every month — that key is what bill_payments, Safe to Spend and the Bills
   * screen all agree on. The calendar draws a bill due on the 31st on the
   * 31st, because that is when it is due.
   *
   * Look payment state up by the DRAWN date and it never matches, and every
   * bill due after the 28th reads as unpaid for ever. That is the bug this
   * split exists to prevent.
   */

  it('the two answers differ for a bill due after the 28th', () => {
    expect(displayDay(31, 2026, 0)).toBe('2026-01-31');
    expect(occurrenceKey(31, 2026, 0)).toBe('2026-01-28');
  });

  it('and agree for a bill due on or before it', () => {
    expect(displayDay(15, 2026, 0)).toBe(occurrenceKey(15, 2026, 0));
  });

  it('a bill due on the 31st, paid, still reads PAID on the calendar', () => {
    const m = buildMonth(month({
      year: 2026, month: 0, today: '2026-01-31',
      bills: [{ ...BELL, due_day: 31 }],
      payments: [{
        source: 'bill', bill_id: 1,
        cycle_date: '2026-01-28',                 // how billCycles filed it
        paid: 1, paid_at: new Date(2026, 0, 31, 10, 0).toISOString(),
        amount: 117, status: 'confirmed',
      }],
    }));
    // Drawn on the 31st, and correctly settled.
    expect(on(m, '2026-01-31')[0].state).toBe('paid');
    expect(on(m, '2026-01-31')[0].amount).toBe(117);
  });
});

describe('A day with a lot on it stays readable', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => ({
    key: 'k' + i, kind: 'expense' as const, label: 'Thing ' + i,
    amount: 10 + i, state: 'actual' as const, rank: 5,
  }));

  it('two entries show as they are', () => {
    const { shown, more } = cellEntries(many(2));
    expect(shown.length).toBe(2);
    expect(more).toBe(0);
  });

  it('five entries show two and count the rest', () => {
    const { shown, more } = cellEntries(many(5));
    expect(shown.length).toBe(2);
    expect(more).toBe(3);
  });

  it('nothing is silently dropped — shown plus more is the whole day', () => {
    for (const n of [0, 1, 3, 9, 20]) {
      const { shown, more } = cellEntries(many(n));
      expect(shown.length + more).toBe(n);
    }
  });

  it('money in is shown before money out on a crowded day', () => {
    const m = buildMonth(month({
      paydays: [{ date: '2026-09-15', label: 'Paycheck', amount: 1250 }],
      expenses: [{ id: 1, amount: 200, note: 'Big shop', date: '2026-09-15' }],
    }));
    const { shown } = cellEntries(on(m, '2026-09-15'));
    expect(shown[0].kind).toBe('payday');
  });

  it('the biggest thing of a kind wins the space', () => {
    const m = buildMonth(month({
      bills: [],
      expenses: [
        { id: 1, amount: 4.50, note: 'Coffee', date: '2026-09-15' },
        { id: 2, amount: 240, note: 'Tyres', date: '2026-09-15' },
        { id: 3, amount: 12, note: 'Lunch', date: '2026-09-15' },
      ],
    }));
    const { shown, more } = cellEntries(on(m, '2026-09-15'));
    expect(shown[0].label).toBe('Tyres');
    expect(more).toBe(1);
  });
});
