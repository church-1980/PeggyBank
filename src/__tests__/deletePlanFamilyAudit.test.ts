/**
 * DIAGNOSTIC — the "delete a PLAN after ACTUAL MONEY moved" family, across
 * every record type that has both a plan and a record of money moving:
 * bills/subscriptions, income schedules, savings goals, debts.
 *
 * Reproduction only. See the full diagnostic report for classification.
 */
process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { loadFinanceSummary } from '../lib/financeSummary';
import { recentActivity } from '../lib/activity';

let db: any;
beforeEach(() => { db = makeRealDb(); });

const REF = new Date(2026, 7, 28);

describe('Debt payments and the finance engine', () => {
  it('REPRO: a debt payment never reduces Safe to Spend, with or without deletion', async () => {
    await db.runAsync(
      `INSERT INTO income (amount, label, date) VALUES (2000, 'Paycheck', '2026-08-05')`
    );
    await db.runAsync(
      `INSERT INTO debts (id, name, total_amount, amount_paid) VALUES (1, 'Visa', 1000, 0)`
    );

    const before = await loadFinanceSummary(db, REF);

    // The real write path: DebtScreen.handlePayment() does exactly this ---
    // one UPDATE, nothing else.
    await db.runAsync(`UPDATE debts SET amount_paid=? WHERE id=?`, [500, 1]);

    const after = await loadFinanceSummary(db, REF);

    // FINDING: identical. $500 that genuinely left the account for a debt
    // payment is invisible to Safe to Spend, moneyLeft, and monthSpending —
    // not because it was deleted, but because FinanceInput has no `debts`
    // field at all. The debt UI shows $500 paid; every other screen behaves
    // as if the $2000 paycheck is still fully unspent.
    expect(after.moneyLeft).toBe(before.moneyLeft);
    expect(after.monthSpending).toBe(before.monthSpending);
    expect(after.safeToSpend).toBe(before.safeToSpend);

    // And it never appears as a money-movement event either.
    const items = await recentActivity(db, 20);
    expect(items.find(i => i.title === 'Visa')).toBeUndefined();
  });
});

describe('Savings goal deletion is atomic (no orphan possible)', () => {
  it('current_amount lives on the goal row itself, so delete removes both at once', async () => {
    await db.runAsync(
      `INSERT INTO savings_goals (id, name, target_amount, current_amount) VALUES (1, 'Emergency Fund', 3000, 1200)`
    );
    await db.runAsync(`DELETE FROM savings_goals WHERE id=1`);
    const rows = await db.getAllAsync(`SELECT * FROM savings_goals`);
    expect(rows.length).toBe(0);
    // No separate contributions table exists to leave anything behind in.
  });

  it('but current_amount was never counted as spent money in the first place', async () => {
    await db.runAsync(
      `INSERT INTO income (amount, label, date) VALUES (2000, 'Paycheck', '2026-08-05')`
    );
    await db.runAsync(
      `INSERT INTO savings_goals (id, name, target_amount, current_amount) VALUES (1, 'Emergency Fund', 3000, 1200)`
    );
    const summary = await loadFinanceSummary(db, REF);
    // Only the REMAINING gap's monthly share (goalsSavingsNeeded) touches
    // Safe to Spend; the $1200 already "saved" was never modelled as an
    // outflow, so there is nothing for a delete to corrupt financially.
    // (goalsSavingsNeeded = max(0, 3000-1200)/12 = 150)
    expect(summary.goalsSavingsNeeded).toBe(150);
    expect(summary.monthSpending).toBe(0);
  });
});

describe('Income schedules — the reference-correct case', () => {
  it('deactivating a schedule leaves already-recorded income fully intact', async () => {
    await db.runAsync(
      `INSERT INTO income_schedules (id, label, amount, frequency, day_of_month, active) VALUES (1, 'Paycheck', 2000, 'monthly', 5, 1)`
    );
    await db.runAsync(
      `INSERT INTO income (amount, label, date, schedule_id, cycle_date) VALUES (2000, 'Paycheck', '2026-08-05', 1, '2026-08-05')`
    );

    // The real write path: IncomesScreen.stopSchedule() -> deactivateSchedule()
    await db.runAsync(`UPDATE income_schedules SET active = 0 WHERE id = ?`, [1]);

    const summary = await loadFinanceSummary(db, REF);
    expect(summary.monthIncome).toBe(2000); // untouched — the correct outcome

    const income = await db.getAllAsync(`SELECT * FROM income WHERE id IS NOT NULL`);
    expect(income.length).toBe(1); // no hard delete, nothing orphaned
  });
});
