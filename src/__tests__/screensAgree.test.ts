/**
 * EVERY SCREEN READS ONE REALITY.
 *
 * Home, Weekly Check-In, Monthly Breakdown, the Safe to Spend explanation and
 * What Happened may PRESENT money differently. They may not CALCULATE different
 * realities.
 *
 * Monthly Breakdown used to add income and expenses up itself, counting only
 * the expenses table. A paid Bell bill of $425 was money that had genuinely
 * left the account, invisible there while What Happened showed it:
 *
 *     What Happened     money out  $511.21
 *     Monthly Breakdown spent       $86.21
 *
 * These run against a REAL SQLite database through the real loaders, because
 * the thing being tested is whether separate screens reading the same rows
 * arrive at the same answer.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { loadFinanceSummary, loadSafeToSpendExplanation } from '../lib/financeSummary';
import { activityForMonth, activityTotals } from '../lib/activity';
import { cents } from '../core/finance';

const WHEN = new Date(2026, 7, 20);
let db: ReturnType<typeof makeRealDb>;

/** An ordinary month: pay in, shopping, one bill paid, one still owed. */
async function seed() {
  await db.runAsync(`INSERT INTO income (amount,label,date) VALUES (1880,'Paycheck','2026-08-05')`);
  await db.runAsync(`INSERT INTO expenses (amount,category,note,date) VALUES (86.21,'groceries','Maxi','2026-08-10')`);
  await db.runAsync(`INSERT INTO expenses (amount,category,note,date) VALUES (42.50,'restaurant','Dunns','2026-08-12')`);
  await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (1,'Bell',425,15,'monthly')`);
  await db.runAsync(`INSERT INTO bills (id,name,amount,due_day,frequency) VALUES (2,'Hydro',143,20,'monthly')`);
  // Bell paid, for slightly less than planned. Hydro still owed.
  await db.runAsync(
    `INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (1,'bill','2026-08-15',1,420)`);
  await db.runAsync(`INSERT INTO savings_goals (name,target_amount,current_amount) VALUES ('Trip',1200,0)`);
}

beforeEach(async () => { db = makeRealDb(); await seed(); });

describe('The same month, read by every screen', () => {
  it('S. Monthly Breakdown money out equals What Happened money out', async () => {
    const finance = await loadFinanceSummary(db as any, WHEN);
    const activity = activityTotals(await activityForMonth(db as any, WHEN));

    expect(finance.monthSpending).toBe(activity.out);
    expect(finance.monthSpending).toBe(548.71);      // 86.21 + 42.50 + 420
  });

  it('money in agrees too', async () => {
    const finance = await loadFinanceSummary(db as any, WHEN);
    const activity = activityTotals(await activityForMonth(db as any, WHEN));
    expect(finance.monthIncome).toBe(activity.in);
    expect(finance.monthIncome).toBe(1880);
  });

  it('R. reading the summary twice gives the same answer', async () => {
    // Every screen calls loadFinanceSummary; reading it twice must be stable.
    const a = await loadFinanceSummary(db as any, WHEN);
    const b = await loadFinanceSummary(db as any, WHEN);
    expect(a).toEqual(b);
  });

  it('T. the explanation reconciles to the headline it explains', async () => {
    const e = await loadSafeToSpendExplanation(db as any, WHEN);
    const sum = cents(e.lines.reduce((s, l) => s + l.amount, 0));
    expect(sum).toBe(e.safeToSpend);
    expect(e.safeToSpend).toBe(e.summary.safeToSpend);
  });

  it('the money-out halves add up to the whole', async () => {
    const f = await loadFinanceSummary(db as any, WHEN);
    expect(cents(f.everydaySpending + f.billsPaidTotal)).toBe(f.monthSpending);
    expect(f.everydaySpending).toBe(128.71);         // 86.21 + 42.50
    expect(f.billsPaidTotal).toBe(420);              // what was ACTUALLY paid
  });

  it('the amount actually paid is used, not the planned amount', async () => {
    const f = await loadFinanceSummary(db as any, WHEN);
    expect(f.billsPaidTotal).toBe(420);
    expect(f.billsPaidTotal).not.toBe(425);
  });

  it('U. the payment appears exactly once in What Happened', async () => {
    const items = await activityForMonth(db as any, WHEN);
    const bell = items.filter(i => i.title === 'Bell');
    expect(bell).toHaveLength(1);
    expect(bell[0].amount).toBe(420);
    expect(bell[0].source).toBe('bill');
  });

  it('V. no synthetic expense was created to represent the bill', async () => {
    const rows = await db.getAllAsync(`SELECT * FROM expenses`);
    expect(rows).toHaveLength(2);                    // only Maxi and Dunns
    expect(rows.map((r: any) => r.note).sort()).toEqual(['Dunns', 'Maxi']);
  });

  it('the whole month reconciles end to end', async () => {
    const f = await loadFinanceSummary(db as any, WHEN);
    expect(f.monthIncome).toBe(1880);
    expect(f.monthSpending).toBe(548.71);
    expect(f.unpaidBillsTotal).toBe(143);            // Hydro
    expect(f.goalsSavingsNeeded).toBe(100);          // 1200/12
    expect(f.safeToSpend).toBe(cents(1880 - 548.71 - 143 - 100));
    expect(f.safeToSpend).toBe(1088.29);
  });
});

describe('THE INVARIANT, through the real loaders', () => {
  it('paying Hydro does not make the user richer', async () => {
    const before = await loadFinanceSummary(db as any, WHEN);
    await db.runAsync(
      `INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (2,'bill','2026-08-20',1,143)`);
    const after = await loadFinanceSummary(db as any, WHEN);

    expect(after.unpaidBillsTotal).toBe(0);
    expect(after.billsPaidTotal).toBe(563);          // 420 + 143
    expect(after.safeToSpend).toBe(before.safeToSpend);
  });

  it('and What Happened still agrees afterwards', async () => {
    await db.runAsync(
      `INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (2,'bill','2026-08-20',1,143)`);
    const f = await loadFinanceSummary(db as any, WHEN);
    const a = activityTotals(await activityForMonth(db as any, WHEN));
    expect(f.monthSpending).toBe(a.out);
  });

  it('J. a previous-month payment does not contaminate this month', async () => {
    await db.runAsync(
      `INSERT INTO bill_payments (bill_id,source,cycle_date,paid,amount) VALUES (2,'bill','2026-07-20',1,143)`);
    const f = await loadFinanceSummary(db as any, WHEN);
    expect(f.billsPaidTotal).toBe(420);              // August only
    expect(f.unpaidBillsTotal).toBe(143);            // Hydro still owed in August
  });
});
