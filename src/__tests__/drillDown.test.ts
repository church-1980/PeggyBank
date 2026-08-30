/**
 * A TOTAL MUST NOT BE A DEAD END.
 *
 * Monthly Breakdown says "Restaurants $184". Tapping it should show the $184 —
 * the actual rows, openable and correctable.
 *
 * The rule that makes it trustworthy: the rows must ADD UP to the slice. A
 * drill-down that shows $170 under a $184 heading is worse than no drill-down,
 * because now the person knows one of the two numbers is lying and cannot tell
 * which.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { activityInCategory, billPaymentsInRange } from '../lib/activity';
import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary, spendingByCategory, cents } from '../core/finance';
import { buildSegments, BILLS_KEY } from '../core/spendingChart';

let db: any;
const START = '2026-08-01', END = '2026-08-31';
const NOW = new Date(2026, 7, 28);

beforeEach(async () => {
  db = makeRealDb();
  const e = (a: number, c: string, n: string, d: string) =>
    db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)`, [a, c, n, d]);

  await e(11.60, 'restaurant', 'Tim Hortons', '2026-08-28');
  await e(42.50, 'restaurant', 'Chez Ma',     '2026-08-15');
  await e(130.00, 'restaurant', 'Anniversary', '2026-08-02');
  await e(195.65, 'groceries',  'Maxi',       '2026-08-12');
  await e(88.00, 'restaurant',  'Last month', '2026-07-20');   // outside the month

  await db.runAsync(`INSERT INTO bills (id, name, amount, frequency, due_day) VALUES (1, 'Bell', 117, 'monthly', 28)`);
  await db.runAsync(`INSERT INTO subscriptions (id, name, amount, billing_day) VALUES (1, 'Netflix', 23.99, 20)`);
  await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1, 'bill', '2026-08-28', 1, 117)`);
  await db.runAsync(`INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1, 'subscription', '2026-08-20', 1, 23.99)`);
});

const sum = (rows: any[]) => cents(rows.reduce((s, r) => s + r.amount, 0));

/** The chart, built exactly as Monthly Breakdown builds it. */
async function chart() {
  const input = await buildFinanceInput(db, NOW);
  const finance = computeFinanceSummary(input);
  const segments = buildSegments({
    moneyOut: finance.monthSpending,
    billsPaid: finance.billsPaidTotal,
    categories: spendingByCategory(input.expenses),
    meta: (k) => ({ label: k, color: '#000' }),
    billsColor: '#000', otherColor: '#000',
  });
  return { finance, segments };
}

describe('The rows behind a slice add up to it', () => {
  it('Restaurants: the drill-down equals the slice, exactly', async () => {
    const { segments } = await chart();
    const slice = segments.find(s => s.key === 'restaurant')!;
    const rows = await activityInCategory(db, START, END, 'restaurant');

    expect(sum(rows)).toBe(slice.amount);
    expect(slice.amount).toBe(184.10);        // 11.60 + 42.50 + 130.00
    expect(rows.length).toBe(3);
  });

  it('Groceries too', async () => {
    const { segments } = await chart();
    const slice = segments.find(s => s.key === 'groceries')!;
    expect(sum(await activityInCategory(db, START, END, 'groceries'))).toBe(slice.amount);
  });

  it('Bills paid: the payments equal the slice', async () => {
    const { segments } = await chart();
    const slice = segments.find(s => s.key === BILLS_KEY)!;
    const rows = await billPaymentsInRange(db, START, END);

    expect(sum(rows)).toBe(slice.amount);
    expect(slice.amount).toBe(140.99);        // 117 + 23.99
    expect(rows.length).toBe(2);
  });

  it('every slice in the chart can be opened, and none is empty', async () => {
    const { segments } = await chart();
    for (const seg of segments) {
      const rows = seg.key === BILLS_KEY
        ? await billPaymentsInRange(db, START, END)
        : await activityInCategory(db, START, END, seg.key);
      expect(rows.length).toBeGreaterThan(0);
      expect(sum(rows)).toBe(seg.amount);
    }
  });
});

describe('The month you are looking at is the month you get', () => {
  it('last month\'s restaurant meal is not in this month\'s drill-down', async () => {
    const rows = await activityInCategory(db, START, END, 'restaurant');
    expect(rows.map(r => r.title)).not.toContain('Last month');
  });

  it('stepping back a month shows that month instead', async () => {
    const rows = await activityInCategory(db, '2026-07-01', '2026-07-31', 'restaurant');
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Last month');
  });
});

describe('A drill-down opens the real record', () => {
  it('rows carry the identity needed to open and correct them', async () => {
    const rows = await activityInCategory(db, START, END, 'restaurant');
    for (const r of rows) {
      expect(r.source).toBe('expense');
      expect(r.sourceId).toBeGreaterThan(0);
    }
    const real: any = await db.getFirstAsync(`SELECT * FROM expenses WHERE id = ?`, [rows[0].sourceId]);
    expect(real).toBeTruthy();
  });

  it('correcting a row changes the slice it came from', async () => {
    const before = await chart();
    const rows = await activityInCategory(db, START, END, 'restaurant');
    await db.runAsync(`UPDATE expenses SET amount = 20 WHERE id = ?`, [rows[0].sourceId]);

    const after = await chart();
    const slice = after.segments.find(s => s.key === 'restaurant')!;
    expect(slice.amount).toBe(192.50);        // 184.10 - 11.60 + 20
    expect(sum(await activityInCategory(db, START, END, 'restaurant'))).toBe(slice.amount);
    expect(after.finance.monthSpending).not.toBe(before.finance.monthSpending);
  });
});
