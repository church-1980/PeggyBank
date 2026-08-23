/**
 * EXPECTED INCOME — forecast, never posted.
 *
 * The rule these tests defend: a schedule tells you money is COMING. It never
 * tells you the money is HERE. Real pay varies, so an expected payday appears
 * as a question -- "did this arrive, and how much?" -- and only becomes income
 * when someone confirms it with the amount they were actually paid.
 *
 * If any of these go red, the app is at risk of telling someone they can spend
 * money that never arrived.
 */

process.env.TZ = 'America/Toronto';

import {
  occurrencesBetween, nextOccurrence, pendingIncome, confirmIncome, isConfirmed,
  type IncomeSchedule,
  updateSchedule, describeSchedule,
} from '../lib/incomeSchedules';

const weeklyFriday: IncomeSchedule = { id: 1, label: 'Pay', amount: 2200, frequency: 'weekly', weekday: 5 };
const monthly15: IncomeSchedule = { id: 2, label: 'Salary', amount: 3000, frequency: 'monthly', day_of_month: 15 };
const monthly31: IncomeSchedule = { id: 3, label: 'Rent from lodger', amount: 800, frequency: 'monthly', day_of_month: 31 };

describe('When a schedule falls due', () => {
  it('a weekly Friday schedule lands on every Friday, and nothing else', () => {
    const days = occurrencesBetween(weeklyFriday, new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(days).toEqual(['2026-08-07', '2026-08-14', '2026-08-21', '2026-08-28']);
    for (const d of days) expect(new Date(d + 'T00:00:00').getDay()).toBe(5);
  });

  it('a monthly schedule lands once a month', () => {
    expect(occurrencesBetween(monthly15, new Date(2026, 6, 1), new Date(2026, 8, 30)))
      .toEqual(['2026-07-15', '2026-08-15', '2026-09-15']);
  });

  it('MONTH END: a 31st schedule uses the real last day of short months', () => {
    // Not 3 March, and not "skip February entirely".
    expect(occurrencesBetween(monthly31, new Date(2026, 0, 1), new Date(2026, 3, 30)))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('a leap February gets the 29th', () => {
    expect(occurrencesBetween(monthly31, new Date(2028, 1, 1), new Date(2028, 1, 29)))
      .toEqual(['2028-02-29']);
  });

  it('never invents a day the month does not have', () => {
    const days = occurrencesBetween(monthly31, new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(days).toHaveLength(12);
    for (const d of days) {
      const [y, m, day] = d.split('-').map(Number);
      expect(day).toBeLessThanOrEqual(new Date(y, m, 0).getDate());
    }
  });

  it('returns nothing when the window is backwards', () => {
    expect(occurrencesBetween(weeklyFriday, new Date(2026, 7, 31), new Date(2026, 7, 1))).toEqual([]);
  });

  it('reports the next payday from a given day', () => {
    expect(nextOccurrence(weeklyFriday, new Date(2026, 7, 19))).toBe('2026-08-21'); // Wed -> Fri
    expect(nextOccurrence(weeklyFriday, new Date(2026, 7, 21))).toBe('2026-08-21'); // on the day
    expect(nextOccurrence(monthly31, new Date(2026, 1, 10))).toBe('2026-02-28');
  });
});

/** A minimal stand-in for the database, recording what actually gets written. */
function makeDb(schedules: IncomeSchedule[], confirmedRows: any[] = []) {
  const income: any[] = [...confirmedRows];
  return {
    income,
    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes('income_schedules')) return schedules;
      if (sql.includes('FROM income')) return income.filter(r => r.schedule_id != null);
      return [];
    }),
    getFirstAsync: jest.fn(async (_sql: string, args: any[]) => ({
      n: income.filter(r => r.schedule_id === args[0] && r.cycle_date === args[1]).length,
    })),
    runAsync: jest.fn(async (_sql: string, args: any[]) => {
      income.push({ amount: args[0], label: args[1], date: args[2], schedule_id: args[3], cycle_date: args[4] });
      return { changes: 1 };
    }),
  } as any;
}

describe('Expected income is offered, not banked', () => {
  const now = new Date(2026, 7, 19);   // Wednesday 19 August 2026

  it('lists recent paydays that have not been answered yet', async () => {
    const db = makeDb([weeklyFriday]);
    const pending = await pendingIncome(db, now);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every(p => p.schedule.id === 1)).toBe(true);
  });

  it('marks paydays that have arrived as due, and future ones as not', async () => {
    const db = makeDb([weeklyFriday]);
    const pending = await pendingIncome(db, now);
    expect(pending.find(p => p.cycleDate === '2026-08-14')!.due).toBe(true);
    expect(pending.find(p => p.cycleDate === '2026-08-21')!.due).toBe(false);
  });

  it('CONFIRMING IS THE ONLY THING THAT CREATES INCOME', async () => {
    const db = makeDb([weeklyFriday]);
    await pendingIncome(db, now);
    expect(db.runAsync).not.toHaveBeenCalled();   // looking at a forecast writes nothing
    expect(db.income).toHaveLength(0);
  });

  it('records the amount the person was ACTUALLY paid, not the estimate', async () => {
    const db = makeDb([weeklyFriday]);
    await confirmIncome(db, weeklyFriday, '2026-08-14', 1847.55);   // short week
    expect(db.income).toHaveLength(1);
    expect(db.income[0].amount).toBe(1847.55);
    expect(db.income[0].amount).not.toBe(weeklyFriday.amount);
    expect(db.income[0].date).toBe('2026-08-14');
  });

  it('a confirmed payday stops being offered', async () => {
    const db = makeDb([weeklyFriday]);
    await confirmIncome(db, weeklyFriday, '2026-08-14', 2200);
    const pending = await pendingIncome(db, now);
    expect(pending.find(p => p.cycleDate === '2026-08-14')).toBeUndefined();
  });

  it('confirming one Friday leaves the other Fridays alone', async () => {
    const db = makeDb([weeklyFriday]);
    await confirmIncome(db, weeklyFriday, '2026-08-14', 2200);
    const pending = await pendingIncome(db, now);
    expect(pending.find(p => p.cycleDate === '2026-08-07')).toBeDefined();
    expect(pending.find(p => p.cycleDate === '2026-08-21')).toBeDefined();
  });

  it('cannot be confirmed twice, so no duplicate income', async () => {
    const db = makeDb([weeklyFriday]);
    await confirmIncome(db, weeklyFriday, '2026-08-14', 2200);
    await confirmIncome(db, weeklyFriday, '2026-08-14', 2200);
    expect(db.income).toHaveLength(1);
  });

  it('refuses to record a payday with no amount', async () => {
    const db = makeDb([weeklyFriday]);
    await expect(confirmIncome(db, weeklyFriday, '2026-08-14', 0)).rejects.toThrow();
    await expect(confirmIncome(db, weeklyFriday, '2026-08-14', NaN)).rejects.toThrow();
    expect(db.income).toHaveLength(0);
  });

  it('says nothing at all when the user has set up no schedules', async () => {
    expect(await pendingIncome(makeDb([]), now)).toEqual([]);
  });

  it('stops nagging about paydays from months ago', async () => {
    const db = makeDb([weeklyFriday]);
    const pending = await pendingIncome(db, now, 45);
    const oldest = pending.map(p => p.cycleDate).sort()[0];
    expect(oldest >= '2026-07-05').toBe(true);
  });
});

/**
 * THE PROMISE: a forecast never becomes money.
 *
 * This is the test that matters most in this file. The finance engine reads the
 * `income` table and nothing else, so an expected payday cannot reach Safe to
 * Spend until someone confirms it and it becomes a real row. If this ever goes
 * red, PeggyBank is telling people they can spend money that has not arrived.
 */
describe('Expected income never reaches Safe to Spend', () => {
  const { computeFinanceSummary } = require('../core/finance');

  const monthOf = (rows: { amount: number; date: string }[]) =>
    computeFinanceSummary({
      today: new Date(2026, 7, 19),
      monthStart: '2026-08-01', monthEnd: '2026-08-31',
      expenses: [], income: rows, bills: [], paidCycles: [], goals: [],
    });

  it('an unconfirmed payday adds nothing', async () => {
    const db = makeDb([weeklyFriday]);
    const pending = await pendingIncome(db, new Date(2026, 7, 19));
    expect(pending.length).toBeGreaterThan(0);          // the forecast exists

    // ...and the income table, which is all the engine reads, is still empty.
    const confirmedRows = db.income.map((r: any) => ({ amount: r.amount, date: r.date }));
    expect(confirmedRows).toEqual([]);
    expect(monthOf(confirmedRows).monthIncome).toBe(0);
    expect(monthOf(confirmedRows).safeToSpend).toBe(0);
  });

  it('only the confirmed amount counts, not the estimate', async () => {
    const db = makeDb([weeklyFriday]);            // schedule says 2200
    await confirmIncome(db, weeklyFriday, '2026-08-14', 1847.55);   // actually paid less

    const rows = db.income.map((r: any) => ({ amount: r.amount, date: r.date }));
    expect(monthOf(rows).monthIncome).toBe(1847.55);
    expect(monthOf(rows).monthIncome).not.toBe(2200);
  });

  it('a forecast for money that never arrives leaves the month untouched', async () => {
    const db = makeDb([weeklyFriday]);
    await pendingIncome(db, new Date(2026, 7, 19));   // looked at, never answered
    const rows = db.income.map((r: any) => ({ amount: r.amount, date: r.date }));
    expect(monthOf(rows).monthIncome).toBe(0);
  });
});

/**
 * A schedule describes the future, not the past.
 *
 * Found by driving the real app in a browser: setting up "every Sunday" on 23
 * August immediately produced four things to confirm, dated 12, 19 and 26 July
 * and 2 August. Someone saying "my pay comes every Sunday" is telling the app
 * what happens NEXT; being handed a month of back-paperwork reads as the app
 * inventing history it was never told about, and every one of those would have
 * been a chance to record income that never happened.
 */
describe('A new schedule does not invent past paydays', () => {
  const madeToday: IncomeSchedule = {
    id: 9, label: 'Pay', amount: 2200, frequency: 'weekly', weekday: 0,
    created_at: '2026-08-23 14:00:00',
  };

  it('offers nothing from before the schedule was created', async () => {
    const db = makeDb([madeToday]);
    const pending = await pendingIncome(db, new Date(2026, 7, 23));
    expect(pending.every(p => p.cycleDate >= '2026-08-23')).toBe(true);
    expect(pending.find(p => p.cycleDate === '2026-07-12')).toBeUndefined();
  });

  it('still offers paydays from the day it was created onward', async () => {
    const db = makeDb([madeToday]);
    const pending = await pendingIncome(db, new Date(2026, 8, 6));   // two weeks later
    expect(pending.map(p => p.cycleDate)).toContain('2026-08-30');
  });

  it('an older schedule is still asked about normally', async () => {
    const old: IncomeSchedule = { ...madeToday, created_at: '2026-06-01 09:00:00' };
    const db = makeDb([old]);
    const pending = await pendingIncome(db, new Date(2026, 7, 23));
    expect(pending.find(p => p.cycleDate === '2026-08-09')).toBeDefined();
  });

  it('a schedule with no creation date behaves as before', async () => {
    const db = makeDb([{ ...madeToday, created_at: null }]);
    expect((await pendingIncome(db, new Date(2026, 7, 23))).length).toBeGreaterThan(0);
  });
});

/**
 * ONE PAYCHECK IS NOT EVERY PAYCHECK.
 *
 * The distinction the whole feature turns on. Normal pay is about $850. One
 * week it is $792.43 because of fewer hours. Recording that must NOT redefine
 * normal pay as $792.43 -- otherwise a single short week quietly becomes the
 * new expectation and every forecast after it is wrong.
 *
 * Equally, deliberately changing the normal figure must NOT rewrite what was
 * already received. What arrived is a fact about the past.
 */
describe('Correcting one pay versus changing future pay', () => {
  const usual: IncomeSchedule = {
    id: 4, label: 'Pay', amount: 850, frequency: 'biweekly', weekday: 5,
    anchor_date: '2026-08-07', created_at: '2026-06-01 09:00:00',
  };

  function scheduleDb(schedules: IncomeSchedule[]) {
    const rows = schedules.map(s => ({ ...s }));
    const income: any[] = [];
    return {
      rows, income,
      getAllAsync: jest.fn(async (sql: string) =>
        sql.includes('income_schedules') ? rows : income.filter(r => r.schedule_id != null)),
      getFirstAsync: jest.fn(async (sql: string, args: any[]) =>
        sql.includes('income_schedules')
          ? rows.find(r => r.id === args[0]) ?? null
          : { n: income.filter(r => r.schedule_id === args[0] && r.cycle_date === args[1]).length }),
      runAsync: jest.fn(async (sql: string, args: any[]) => {
        if (sql.includes('UPDATE income_schedules')) {
          const row = rows.find(r => r.id === args[args.length - 1]);
          const cols = sql.slice(sql.indexOf('SET ') + 4, sql.indexOf(' WHERE')).split(',').map(s => s.trim().split(' ')[0]);
          cols.forEach((c, i) => { (row as any)[c] = args[i]; });
        } else {
          income.push({ amount: args[0], label: args[1], date: args[2], schedule_id: args[3], cycle_date: args[4] });
        }
        return { changes: 1 };
      }),
    } as any;
  }

  it('THE RULE: a short paycheck does not change what is normally expected', async () => {
    const db = scheduleDb([usual]);
    await confirmIncome(db, usual, '2026-08-21', 792.43);

    expect(db.income[0].amount).toBe(792.43);       // what actually arrived
    expect(db.rows[0].amount).toBe(850);            // what is still normal
  });

  it('a bigger paycheck does not raise the expectation either', async () => {
    const db = scheduleDb([usual]);
    await confirmIncome(db, usual, '2026-08-21', 914.18);
    expect(db.rows[0].amount).toBe(850);
  });

  it('changing the normal amount deliberately DOES change future pay', async () => {
    const db = scheduleDb([usual]);
    await updateSchedule(db, 4, { amount: 900 });
    expect(db.rows[0].amount).toBe(900);
  });

  it('changing the normal amount does not rewrite pay already received', async () => {
    const db = scheduleDb([usual]);
    await confirmIncome(db, usual, '2026-08-21', 792.43);
    await updateSchedule(db, 4, { amount: 900 });
    expect(db.income[0].amount).toBe(792.43);       // the past is a fact
  });

  it('EDITING PRESERVES FIELDS NOT ASKED ABOUT', async () => {
    // The historical PeggyBank defect: an edit that silently dropped metadata.
    const db = scheduleDb([usual]);
    await updateSchedule(db, 4, { amount: 875 });
    const after = db.rows[0];
    expect(after.amount).toBe(875);
    expect(after.label).toBe('Pay');
    expect(after.frequency).toBe('biweekly');
    expect(after.weekday).toBe(5);
    expect(after.anchor_date).toBe('2026-08-07');
    expect(after.created_at).toBe('2026-06-01 09:00:00');
  });

  it('an empty change touches nothing at all', async () => {
    const db = scheduleDb([usual]);
    await updateSchedule(db, 4, {});
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('the pay date can be moved for future pays without touching the past', async () => {
    const db = scheduleDb([usual]);
    await confirmIncome(db, usual, '2026-08-21', 850);
    await updateSchedule(db, 4, { weekday: 4, anchor_date: '2026-09-03' });
    expect(db.rows[0].weekday).toBe(4);
    expect(db.income[0].cycle_date).toBe('2026-08-21');   // unchanged
  });
});

describe('Every two weeks means every two weeks', () => {
  const biweekly: IncomeSchedule = {
    id: 5, label: 'Pay', amount: 850, frequency: 'biweekly', weekday: 5,
    anchor_date: '2026-08-07', created_at: '2026-01-01 00:00:00',
  };

  it('lands a fortnight apart, not every week', () => {
    expect(occurrencesBetween(biweekly, new Date(2026, 7, 1), new Date(2026, 8, 30)))
      .toEqual(['2026-08-07', '2026-08-21', '2026-09-04', '2026-09-18']);
  });

  it('picks the RIGHT Friday, not merely a Friday', () => {
    // Anchored on 7 Aug, so 14 Aug is a Friday this schedule skips.
    const days = occurrencesBetween(biweekly, new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(days).not.toContain('2026-08-14');
    expect(days).toContain('2026-08-21');
  });

  it('keeps its rhythm across a month boundary', () => {
    const days = occurrencesBetween(biweekly, new Date(2026, 8, 1), new Date(2026, 9, 31));
    expect(days[0]).toBe('2026-09-04');
    for (let i = 1; i < days.length; i++) {
      const gap = (new Date(days[i] + 'T00:00:00').getTime() - new Date(days[i - 1] + 'T00:00:00').getTime()) / 86400000;
      expect(gap).toBe(14);
    }
  });

  it('reads back in plain language', () => {
    expect(describeSchedule(biweekly)).toBe('Every second Friday');
    expect(describeSchedule({ ...biweekly, frequency: 'weekly' })).toBe('Every Friday');
    expect(describeSchedule({ id: 6, label: 'x', amount: 1, frequency: 'monthly', day_of_month: 15 })).toBe('On the 15th');
  });
});
