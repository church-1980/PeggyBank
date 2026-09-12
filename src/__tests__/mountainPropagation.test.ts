/**
 * Section 15 — THE MOUNTAIN PROPAGATION TEST.
 *
 * One deterministic dataset (an income schedule and its confirmed paycheck,
 * a photographed expense, a bill and a historical bill payment, a
 * subscription, a debt and a debt payment, a savings goal), read through
 * every REAL production consumer function — not a re-implementation of
 * them. Each scenario mutates exactly one authoritative fact through its
 * canonical writer, then re-reads every consumer and asserts they all
 * reflect the SAME new truth: no consumer still shows the old figure, and
 * none independently disagrees about the new one.
 *
 * Consumers exercised: the finance engine (Safe to Spend / Money Out /
 * category totals), Activity ("What Happened" / Home's recent list /
 * Coming-up-adjacent month view), the Calendar month builder, and CSV
 * export. Screens that only render these functions' output (Home,
 * ExpensesScreen, CalendarScreen) are not separately re-rendered here —
 * doing so would test React rendering, not whether the underlying facts
 * agree, which is what "one financial brain" actually claims.
 */
import { makeRealDb } from './helpers/realDb';
import { createIncome, updateIncome } from '../lib/saveIncome';
import { createExpense, updateExpense } from '../lib/saveExpense';
import { loadFinanceSummary } from '../lib/financeSummary';
import { spendingByCategory } from '../core/finance';
import { recentActivity, activityForMonth } from '../lib/activity';
import { buildMonth } from '../core/calendarMonth';
import { expenseCsvRows } from '../lib/csvExport';
import { recordPayment } from '../lib/billCycles';

let db: any;
const REF = new Date(2026, 7, 20); // 2026-08-20

beforeEach(async () => {
  db = makeRealDb();
  // The mountain: one of everything.
  await db.runAsync(
    `INSERT INTO income_schedules (id, label, amount, frequency, day_of_month, active)
     VALUES (1, 'Paycheck', 2200, 'monthly', 15, 1)`
  );
  await createIncome(db, { amount: 2200, label: 'Paycheck', date: '2026-08-15', scheduleId: 1, cycleDate: '2026-08-15' });
  await createExpense(db, { amount: 40, category: 'groceries', note: 'Metro', date: '2026-08-10', photoUri: 'file:///receipts/metro.jpg' });
  await db.runAsync(
    `INSERT INTO bills (id, name, amount, due_day, category) VALUES (1, 'Hydro', 88, 5, 'bills')`
  );
  await recordPayment(db, 'bill', 1, '2026-08-05', 'confirmed', 88, 'Hydro');
  await db.runAsync(
    `INSERT INTO subscriptions (id, name, amount, billing_day) VALUES (1, 'Netflix', 16.49, 22)`
  );
  await db.runAsync(
    `INSERT INTO debts (id, name, total_amount, amount_paid, apr) VALUES (1, 'Visa', 2500, 100, 19.99)`
  );
  await db.runAsync(
    `INSERT INTO debt_payments (id, debt_id, date, amount) VALUES (1, 1, '2026-08-10', 100)`
  );
  await db.runAsync(
    `INSERT INTO savings_goals (id, name, target_amount, current_amount) VALUES (1, 'Vacation', 2000, 250)`
  );
});

async function readAllConsumers() {
  const summary = await loadFinanceSummary(db, REF);
  const expenses = await db.getAllAsync(`SELECT * FROM expenses`);
  const categories = spendingByCategory(expenses as any);
  const recent = await recentActivity(db, 50);
  const month = await activityForMonth(db, REF);
  const bills = await db.getAllAsync(`SELECT * FROM bills`);
  const subs = await db.getAllAsync(`SELECT * FROM subscriptions`);
  const payments = await db.getAllAsync(`SELECT * FROM bill_payments`);
  const income = await db.getAllAsync(`SELECT * FROM income`);
  const paydays: any[] = [];
  const calendar = buildMonth({
    year: 2026, month: 7, today: '2026-08-20',
    bills: bills as any, subscriptions: subs as any, payments: payments as any,
    expenses: expenses as any, income: income as any, paydays,
  });
  const csv = await expenseCsvRows(db);
  return { summary, categories, recent, month, calendar, csv };
}

describe('Mutating the confirmed paycheck amount', () => {
  it('propagates identically to the finance engine, Activity, and the Calendar', async () => {
    const before = await readAllConsumers();
    expect(before.summary.monthIncome).toBe(2200);
    expect(before.recent.find(i => i.source === 'income')!.amount).toBe(2200);
    expect(before.month.find(i => i.source === 'income')!.amount).toBe(2200);
    expect(before.calendar.get('2026-08-15')!.find(e => e.kind === 'income')!.amount).toBe(2200);

    const row = await db.getFirstAsync(`SELECT id FROM income WHERE schedule_id=1`);
    await updateIncome(db, row.id, { amount: 2350 }); // a corrected paycheque

    const after = await readAllConsumers();
    // Every consumer received the SAME new truth. None still shows 2200.
    expect(after.summary.monthIncome).toBe(2350);
    expect(after.recent.find(i => i.source === 'income')!.amount).toBe(2350);
    expect(after.month.find(i => i.source === 'income')!.amount).toBe(2350);
    expect(after.calendar.get('2026-08-15')!.find(e => e.kind === 'income')!.amount).toBe(2350);

    // Safe to Spend actually moved because of it, not by coincidence.
    expect(after.summary.safeToSpend).toBe(before.summary.safeToSpend + 150);
  });
});

describe('Mutating an expense (amount and category together)', () => {
  it('propagates identically to category totals, Activity, the Calendar, and CSV export', async () => {
    const before = await readAllConsumers();
    expect(before.categories.find(c => c.category === 'groceries')?.total).toBe(40);
    expect(before.recent.find(i => i.source === 'expense')!.amount).toBe(40);
    expect(before.calendar.get('2026-08-10')!.find(e => e.kind === 'expense')!.amount).toBe(40);
    expect(before.csv.find((r: any) => r.category === 'groceries')).toBeTruthy();

    const row = await db.getFirstAsync(`SELECT id FROM expenses`);
    await updateExpense(db, row.id, { amount: 65, category: 'restaurant' });

    const after = await readAllConsumers();
    expect(after.categories.find(c => c.category === 'groceries')).toBeUndefined();
    expect(after.categories.find(c => c.category === 'restaurant')?.total).toBe(65);
    expect(after.recent.find(i => i.source === 'expense')!.amount).toBe(65);
    expect(after.calendar.get('2026-08-10')!.find(e => e.kind === 'expense')!.amount).toBe(65);
    expect(after.csv.find((r: any) => r.category === 'restaurant' && r.amount === 65)).toBeTruthy();
    expect(after.csv.find((r: any) => r.category === 'groceries')).toBeFalsy();

    // The photo, untouched by the edit, still travels with the same row —
    // proof this was an update, not a delete-and-recreate under the hood.
    const stillOwned = await db.getFirstAsync(`SELECT photo_uri FROM expenses WHERE id=?`, [row.id]);
    expect(stillOwned.photo_uri).toBe('file:///receipts/metro.jpg');

    // Safe to Spend moved by exactly the difference.
    expect(after.summary.everydaySpending).toBe(before.summary.everydaySpending + 25);
    expect(after.summary.safeToSpend).toBe(before.summary.safeToSpend - 25);
  });
});

describe('A bill plan deletion after money has already moved', () => {
  it('the historical payment survives with its own name, unaffected by the plan being gone', async () => {
    const before = await readAllConsumers();
    expect(before.summary.billsPaidTotal).toBe(88);
    expect(before.recent.find(i => i.title === 'Hydro' && i.source === 'bill')).toBeTruthy();

    await db.runAsync(`DELETE FROM bills WHERE id=1`);

    const after = await readAllConsumers();
    // The plan is gone, but the money that already moved is not rewritten —
    // bill_payments.bill_name is the snapshot that keeps this true everywhere.
    expect(after.summary.billsPaidTotal).toBe(88);
    expect(after.recent.find(i => i.title === 'Hydro' && i.source === 'bill')).toBeTruthy();
  });
});
