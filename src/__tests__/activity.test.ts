/**
 * WHAT HAPPENED TO MY MONEY — the unified activity view.
 *
 * These run the REAL SQL against a REAL SQLite database. A mocked db object
 * would only prove the mock returns what the test told it to; the thing worth
 * testing here is a UNION across three tables with two joins, which only an
 * actual engine can validate.
 *
 * The two rules that matter most:
 *   1. A PLAN is not money. A bill due next week has cost nobody anything.
 *   2. ONE EVENT, ONE ROW. The same money must never be counted twice.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb, TEST_SCHEMA } from './helpers/realDb';
import {
  recentActivity, activityBetween, activityForMonth, groupByDay, activityTotals,
} from '../lib/activity';

let db: ReturnType<typeof makeRealDb>;

/** The day in Paul's example: a paycheque, a gift, groceries, supper, Bell, Netflix. */
async function seedTheExampleDay() {
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (?, ?, ?)`, [842.16, 'Paycheck', '2026-08-20']);
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (?, ?, ?)`, [100.00, 'Grandma', '2026-08-20']);
  await db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)`, [83.42, 'groceries', 'Maxi', '2026-08-20']);
  await db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)`, [40.00, 'restaurant', '', '2026-08-20']);
  await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (?, ?, ?, ?)`, [1, 'Bell', 117.00, 15]);
  await db.runAsync(`INSERT INTO subscriptions (id, name, amount, billing_day) VALUES (?, ?, ?, ?)`, [1, 'Netflix', 21.83, 22]);
  await db.runAsync(
    `INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (?, 'bill', ?, 1, ?)`,
    [1, '2026-08-20', 117.00]);
  await db.runAsync(
    `INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (?, 'subscription', ?, 1, ?)`,
    [1, '2026-08-20', 21.83]);
}

beforeEach(() => { db = makeRealDb(); });

describe('The schema the tests run against matches the app', () => {
  it('covers every table the activity query reads', () => {
    for (const t of ['expenses', 'income', 'bills', 'subscriptions', 'bill_payments']) {
      expect(TEST_SCHEMA).toContain('CREATE TABLE ' + t);
    }
  });
});

describe('Everything that happened, in one place', () => {
  beforeEach(seedTheExampleDay);

  it('shows all six events together, whatever table they live in', async () => {
    const items = await recentActivity(db as any, 50);
    expect(items).toHaveLength(6);
    expect(items.map(i => i.title).sort()).toEqual(
      ['Bell', 'Grandma', 'Maxi', 'Netflix', 'Paycheck', 'restaurant'].sort()
    );
  });

  it('knows which way each one went', async () => {
    const items = await recentActivity(db as any, 50);
    const dir = Object.fromEntries(items.map(i => [i.title, i.direction]));
    expect(dir['Paycheck']).toBe('in');
    expect(dir['Grandma']).toBe('in');
    expect(dir['Maxi']).toBe('out');
    expect(dir['Bell']).toBe('out');
    expect(dir['Netflix']).toBe('out');
  });

  it('NEVER LOSES WHERE IT CAME FROM, so tapping can open the real record', async () => {
    const items = await recentActivity(db as any, 50);
    const by = Object.fromEntries(items.map(i => [i.title, i]));
    expect(by['Maxi'].source).toBe('expense');
    expect(by['Paycheck'].source).toBe('income');
    expect(by['Bell'].source).toBe('bill');
    expect(by['Netflix'].source).toBe('subscription');
    for (const i of items) expect(i.sourceId).toBeGreaterThan(0);
  });

  it('gives every item a stable key that survives a reload', async () => {
    const a = await recentActivity(db as any, 50);
    const b = await recentActivity(db as any, 50);
    expect(a.map(i => i.key).sort()).toEqual(b.map(i => i.key).sort());
    expect(new Set(a.map(i => i.key)).size).toBe(a.length);
  });

  it('amounts are always positive; direction carries the sign', async () => {
    for (const i of await recentActivity(db as any, 50)) expect(i.amount).toBeGreaterThan(0);
  });

  it('totals money in and money out separately', async () => {
    const t = activityTotals(await recentActivity(db as any, 50));
    expect(t.in).toBe(942.16);                       // 842.16 + 100
    expect(t.out).toBe(262.25);                      // 83.42 + 40 + 117 + 21.83
  });

  it('falls back to the category when no place was recorded', async () => {
    const items = await recentActivity(db as any, 50);
    expect(items.find(i => i.amount === 40)!.title).toBe('restaurant');
  });
});

describe('A PLAN IS NOT MONEY', () => {
  it('a bill that exists but was never paid is not activity', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Hydro', 143, 15)`);
    expect(await recentActivity(db as any, 50)).toHaveLength(0);
  });

  it('a subscription that exists but was never charged is not activity', async () => {
    await db.runAsync(`INSERT INTO subscriptions (id, name, amount, billing_day) VALUES (1, 'Spotify', 11.99, 3)`);
    expect(await recentActivity(db as any, 50)).toHaveLength(0);
  });

  it('an expected paycheque is not money until it is confirmed', async () => {
    await db.runAsync(
      `INSERT INTO income_schedules (label, amount, frequency, weekday) VALUES ('Pay', 850, 'weekly', 5)`);
    expect(await recentActivity(db as any, 50)).toHaveLength(0);
  });

  it('a savings goal is a target, not a payment', async () => {
    await db.runAsync(`INSERT INTO savings_goals (name, target_amount, current_amount) VALUES ('Trip', 2000, 500)`);
    expect(await recentActivity(db as any, 50)).toHaveLength(0);
  });

  it('unpaying a bill removes it from activity again', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Bell', 117, 15)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill','2026-08-15',1,117)`);
    expect(await recentActivity(db as any, 50)).toHaveLength(1);
    await db.runAsync(`DELETE FROM bill_payments WHERE source='bill' AND bill_id=1 AND cycle_date='2026-08-15'`);
    expect(await recentActivity(db as any, 50)).toHaveLength(0);
  });
});

describe('THE SAME MONEY IS NEVER COUNTED TWICE', () => {
  it('paying Bell produces exactly ONE item, not a bill AND an expense', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Bell', 117, 15)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill','2026-08-15',1,117)`);

    const items = await recentActivity(db as any, 50);
    expect(items.filter(i => i.title === 'Bell')).toHaveLength(1);
    expect(activityTotals(items).out).toBe(117);
  });

  it('twelve months of Bell gives twelve items, not one and not twenty-four', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Bell', 117, 15)`);
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      await db.runAsync(
        `INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill',?,1,117)`,
        ['2026-' + mm + '-15']);
    }
    const items = await activityBetween(db as any, '2026-01-01', '2026-12-31', 500);
    expect(items.filter(i => i.title === 'Bell')).toHaveLength(12);
    expect(activityTotals(items).out).toBe(1404);
  });

  it('a bill and a subscription sharing an id are kept apart', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Bell', 117, 15)`);
    await db.runAsync(`INSERT INTO subscriptions (id, name, amount, billing_day) VALUES (1, 'Netflix', 21.83, 22)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill','2026-08-15',1,117)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'subscription','2026-08-22',1,21.83)`);

    const items = await recentActivity(db as any, 50);
    expect(items).toHaveLength(2);
    const bell = items.find(i => i.source === 'bill')!;
    const netflix = items.find(i => i.source === 'subscription')!;
    expect(bell.title).toBe('Bell');
    expect(netflix.title).toBe('Netflix');
    expect(bell.key).not.toBe(netflix.key);
  });

  it('TWO REAL RECORDS DO show twice, so a genuine duplicate stays visible', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Bell', 117, 15)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill','2026-08-15',1,117)`);
    await db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (117, 'home', 'Bell', '2026-08-15')`);

    const items = await recentActivity(db as any, 50);
    expect(items.filter(i => i.title === 'Bell')).toHaveLength(2);
    expect(items.filter(i => i.title === 'Bell').map(i => i.source).sort()).toEqual(['bill', 'expense']);
  });

  it('the amount actually paid wins over the amount the plan expected', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Bell', 117, 15)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill','2026-08-15',1,124)`);
    expect((await recentActivity(db as any, 50))[0].amount).toBe(124);
  });

  it('falls back to the plan amount when the payment did not record one', async () => {
    await db.runAsync(`INSERT INTO bills (id, name, amount, due_day) VALUES (1, 'Hydro', 143, 15)`);
    await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1,'bill','2026-08-15',1,NULL)`);
    expect((await recentActivity(db as any, 50))[0].amount).toBe(143);
  });
});

describe('Editing and deleting reach everywhere, because there is only one copy', () => {
  beforeEach(async () => {
    await db.runAsync(`INSERT INTO expenses (id, amount, category, note, date) VALUES (1, 5, 'restaurant', 'Supper', '2026-08-20')`);
  });

  it('correcting the source record changes the activity view', async () => {
    expect((await recentActivity(db as any, 50))[0].amount).toBe(5);
    await db.runAsync(`UPDATE expenses SET amount = 30 WHERE id = 1`);
    expect((await recentActivity(db as any, 50))[0].amount).toBe(30);
  });

  it('correcting the date moves it in history', async () => {
    await db.runAsync(`UPDATE expenses SET date = '2026-08-18' WHERE id = 1`);
    expect((await recentActivity(db as any, 50))[0].date).toBe('2026-08-18');
    expect(await activityBetween(db as any, '2026-08-20', '2026-08-20', 50)).toHaveLength(0);
  });

  it('deleting it removes it and changes the totals', async () => {
    await db.runAsync(`DELETE FROM expenses WHERE id = 1`);
    const items = await recentActivity(db as any, 50);
    expect(items).toHaveLength(0);
    expect(activityTotals(items).out).toBe(0);
  });

  it('nothing is left behind, because activity stores nothing of its own', async () => {
    await db.runAsync(`DELETE FROM expenses WHERE id = 1`);
    expect(await activityForMonth(db as any, new Date(2026, 7, 20))).toHaveLength(0);
  });
});

describe('Order, grouping and paging', () => {
  beforeEach(async () => {
    const rows: [string, number][] = [['2026-08-18', 10], ['2026-08-20', 20], ['2026-08-19', 30], ['2026-08-20', 40]];
    for (const [d, a] of rows) {
      await db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (?, 'other', 'x', ?)`, [a, d]);
    }
  });

  it('newest first', async () => {
    const dates = (await recentActivity(db as any, 50)).map(i => i.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('groups by day, newest day first', async () => {
    const days = groupByDay(await recentActivity(db as any, 50));
    expect(days.map(d => d.date)).toEqual(['2026-08-20', '2026-08-19', '2026-08-18']);
    expect(days[0].items).toHaveLength(2);
  });

  it('a Home preview asks for only what it shows', async () => {
    expect(await recentActivity(db as any, 2)).toHaveLength(2);
  });

  it('history pages instead of loading everything at once', async () => {
    const first = await activityBetween(db as any, '2026-08-01', '2026-08-31', 2, 0);
    const second = await activityBetween(db as any, '2026-08-01', '2026-08-31', 2, 2);
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(first.map(i => i.key)).not.toEqual(second.map(i => i.key));
  });

  it('a month view keeps to that month', async () => {
    await db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (99, 'other', 'july', '2026-07-31')`);
    const aug = await activityForMonth(db as any, new Date(2026, 7, 15));
    expect(aug.every(i => i.date.startsWith('2026-08'))).toBe(true);
  });

  it('late-evening dates stay on their own day, not tomorrow', async () => {
    // The stored date is a local calendar date and must never be reinterpreted.
    await db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (7, 'other', 'late', '2026-08-31')`);
    const aug = await activityForMonth(db as any, new Date(2026, 7, 31, 23, 59));
    expect(aug.some(i => i.date === '2026-08-31')).toBe(true);
  });
});
