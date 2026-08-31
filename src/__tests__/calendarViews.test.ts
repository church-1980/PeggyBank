/**
 * MONTH, WEEK AND DAY MUST NOT DISAGREE.
 *
 * They may show different amounts of DETAIL — a month cell has room for two
 * lines, a day has room for a card. They may not differ about FACTS. If the
 * month says Bell was paid early, the week and the day cannot say it is due.
 *
 * The guarantee is structural rather than careful: all three read one map
 * built by buildMonth, and the rule for "what fits" is one shared function.
 * These tests pin that, so a future change that gives one view its own
 * derivation fails here rather than on someone's phone.
 */

process.env.TZ = 'America/Toronto';

import { buildMonth, cellEntries, type CalendarEntry } from '../core/calendarMonth';

const BELL = { id: 1, name: 'Bell', amount: 117, due_day: 15, frequency: 'monthly', payment_method: 'manual' };
const NETFLIX = { id: 1, name: 'Netflix', amount: 23.99, billing_day: 20, payment_method: 'auto' };

const septemberWith = (over: any = {}) => buildMonth({
  year: 2026, month: 8, today: '2026-09-15',
  bills: [BELL], subscriptions: [NETFLIX], payments: [],
  expenses: [], income: [], paydays: [], ...over,
});

/** What each view would render for one day, from the one shared map. */
const monthCell = (m: Map<string, CalendarEntry[]>, d: string) => cellEntries(m.get(d) ?? [], 2);
const weekCell  = (m: Map<string, CalendarEntry[]>, d: string) => cellEntries(m.get(d) ?? [], 1);
const dayList   = (m: Map<string, CalendarEntry[]>, d: string) => m.get(d) ?? [];

describe('The three views read the same facts', () => {
  it('a due bill is due in all three', () => {
    const m = septemberWith();
    expect(monthCell(m, '2026-09-15').shown[0].state).toBe('due');
    expect(weekCell(m, '2026-09-15').shown[0].state).toBe('due');
    expect(dayList(m, '2026-09-15')[0].state).toBe('due');
  });

  it('an auto-pay subscription is auto in all three', () => {
    const m = septemberWith();
    expect(monthCell(m, '2026-09-20').shown[0].state).toBe('auto');
    expect(weekCell(m, '2026-09-20').shown[0].state).toBe('auto');
    expect(dayList(m, '2026-09-20')[0].state).toBe('auto');
  });

  it('a bill PAID EARLY reads paidEarly in all three, on its due date', () => {
    const m = septemberWith({
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 8, 3, 10, 0).toISOString(),
        amount: 117, status: 'confirmed',
      }],
    });
    for (const got of [monthCell(m, '2026-09-15').shown[0], weekCell(m, '2026-09-15').shown[0], dayList(m, '2026-09-15')[0]]) {
      expect(got.state).toBe('paidEarly');
      expect(got.amount).toBeUndefined();     // the money is on the 3rd, not here
    }
  });

  it('and the money sits on the 3rd in all three', () => {
    const m = septemberWith({
      payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-09-15', paid: 1,
        paid_at: new Date(2026, 8, 3, 10, 0).toISOString(),
        amount: 117, status: 'confirmed',
      }],
    });
    expect(monthCell(m, '2026-09-03').shown[0].amount).toBe(117);
    expect(weekCell(m, '2026-09-03').shown[0].amount).toBe(117);
    expect(dayList(m, '2026-09-03')[0].amount).toBe(117);
  });

  it('a payday is the same event in all three', () => {
    const m = septemberWith({ paydays: [{ date: '2026-09-25', label: 'Paycheck', amount: 1250 }] });
    for (const got of [monthCell(m, '2026-09-25').shown[0], weekCell(m, '2026-09-25').shown[0], dayList(m, '2026-09-25')[0]]) {
      expect(got.kind).toBe('payday');
      expect(got.label).toBe('Paycheck');
    }
  });

  it('every day of the month agrees across the three views', () => {
    // Not a spot check: walk the whole month and compare what each view would
    // take from the same day.
    const m = septemberWith({
      paydays: [{ date: '2026-09-25', label: 'Paycheck', amount: 1250 }],
      expenses: [
        { id: 1, amount: 11.60, note: 'Tim Hortons', date: '2026-09-15' },
        { id: 2, amount: 42.50, note: 'Maxi', date: '2026-09-15' },
      ],
      payments: [{
        source: 'subscription', bill_id: 1, cycle_date: '2026-09-20', paid: 1,
        paid_at: new Date(2026, 8, 20, 9, 0).toISOString(), amount: 23.99, status: 'confirmed',
      }],
    });

    for (let d = 1; d <= 30; d++) {
      const iso = '2026-09-' + String(d).padStart(2, '0');
      const all = dayList(m, iso);
      const inMonth = monthCell(m, iso);
      const inWeek = weekCell(m, iso);

      // Nothing is invented, and nothing is lost.
      expect(inMonth.shown.length + inMonth.more).toBe(all.length);
      expect(inWeek.shown.length + inWeek.more).toBe(all.length);

      // Whatever each view DOES show is the same fact the day view shows.
      for (const view of [inMonth.shown, inWeek.shown]) {
        view.forEach((e, i) => {
          expect(e.key).toBe(all[i].key);
          expect(e.state).toBe(all[i].state);
          expect(e.amount).toBe(all[i].amount);
        });
      }
    }
  });
});

describe('Density is rationed, never lost', () => {
  const crowded = () => buildMonth({
    year: 2026, month: 8, today: '2026-09-15',
    bills: [BELL], subscriptions: [], payments: [],
    paydays: [{ date: '2026-09-15', label: 'Paycheck', amount: 1250 }],
    income: [],
    expenses: [
      { id: 1, amount: 4.50, note: 'Coffee', date: '2026-09-15' },
      { id: 2, amount: 240, note: 'Tyres', date: '2026-09-15' },
      { id: 3, amount: 12, note: 'Lunch', date: '2026-09-15' },
    ],
  });

  it('the week strip shows one thing, the month two, the day everything', () => {
    const m = crowded();
    const all = m.get('2026-09-15')!;
    expect(all.length).toBe(5);
    expect(cellEntries(all, 1).shown.length).toBe(1);
    expect(cellEntries(all, 2).shown.length).toBe(2);
    expect(cellEntries(all, 99).shown.length).toBe(5);
  });

  it('each view counts what it could not fit', () => {
    const all = crowded().get('2026-09-15')!;
    expect(cellEntries(all, 1).more).toBe(4);
    expect(cellEntries(all, 2).more).toBe(3);
    expect(cellEntries(all, 99).more).toBe(0);
  });

  it('the one thing a week shows is the most important one', () => {
    // Money in leads, so a crowded Friday does not read as a bad day.
    expect(cellEntries(crowded().get('2026-09-15')!, 1).shown[0].kind).toBe('payday');
  });

  it('nothing is dropped at any width', () => {
    const all = crowded().get('2026-09-15')!;
    for (const max of [0, 1, 2, 3, 5, 20]) {
      const { shown, more } = cellEntries(all, max);
      expect(shown.length + more).toBe(all.length);
    }
  });
});

describe('Boundaries behave the same in every view', () => {
  it('a bill due on the 31st appears in months that have no 31st', () => {
    const feb = buildMonth({
      year: 2026, month: 1, today: '2026-02-15',
      bills: [{ ...BELL, due_day: 31 }], subscriptions: [], payments: [],
      expenses: [], income: [], paydays: [],
    });
    expect((feb.get('2026-02-28') ?? []).length).toBe(1);
    expect(feb.get('2026-02-31')).toBeUndefined();     // never invented
  });

  it('across a year boundary in both directions', () => {
    const dec = buildMonth({
      year: 2025, month: 11, today: '2026-09-15',
      bills: [BELL], subscriptions: [], payments: [], expenses: [], income: [], paydays: [],
    });
    const jan = buildMonth({
      year: 2027, month: 0, today: '2026-09-15',
      bills: [BELL], subscriptions: [], payments: [], expenses: [], income: [], paydays: [],
    });
    expect((dec.get('2025-12-15') ?? []).length).toBe(1);
    expect((jan.get('2027-01-15') ?? []).length).toBe(1);
  });

  it('an evening payment does not slide into the next week or month', () => {
    // 31 August, 8:30pm local. Stored UTC, that reads as 1 September.
    const aug = buildMonth({
      year: 2026, month: 7, today: '2026-08-31',
      bills: [{ ...BELL, due_day: 20 }], subscriptions: [], payments: [{
        source: 'bill', bill_id: 1, cycle_date: '2026-08-20', paid: 1,
        paid_at: new Date(2026, 7, 31, 20, 30).toISOString(),
        amount: 117, status: 'confirmed',
      }],
      expenses: [], income: [], paydays: [],
    });
    expect((aug.get('2026-08-31') ?? []).length).toBe(1);       // the money, right day
    expect(aug.get('2026-09-01')).toBeUndefined();              // not next month
    expect((aug.get('2026-08-20') ?? [])[0].state).toBe('paidLate');
  });
});
