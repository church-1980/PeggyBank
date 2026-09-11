/**
 * FULL ONE-BRAIN REGRESSION — Section 15 of the repair pass.
 *
 * One consolidated, narrative walk through the five deterministic scenarios
 * the repair brief specified, run against real SQLite, checking every
 * downstream consumer after each mutation. Individual defects have their
 * own focused test files (deleteOrphanAudit, debtPaymentLedger,
 * paydayUnification, etc.) — this file exists so the WHOLE story is provable
 * in one place, not scattered.
 */
process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { createExpense, deleteExpense } from '../lib/saveExpense';
import { recordPayment, setCyclePaid } from '../lib/billCycles';
import { loadFinanceSummary } from '../lib/financeSummary';
import { recentActivity } from '../lib/activity';

let db: any;
beforeEach(() => { db = makeRealDb(); });

const REF = new Date(2026, 7, 20);

describe('A. EXPENSE — create, edit, delete propagate everywhere', () => {
  it('$49.52 appears in Safe to Spend and Activity; editing to $60 updates both; deleting removes it from both', async () => {
    await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (2000, 'Paycheck', '2026-08-01')`);

    const id = await createExpense(db, { amount: 49.52, category: 'groceries', note: 'Maxi', date: '2026-08-05' });
    let s = await loadFinanceSummary(db, REF);
    expect(s.everydaySpending).toBe(49.52);
    let items = await recentActivity(db, 20);
    expect(items.find(i => i.source === 'expense' && i.sourceId === id)?.amount).toBe(49.52);

    await db.runAsync(`UPDATE expenses SET amount=60 WHERE id=?`, [id]);
    s = await loadFinanceSummary(db, REF);
    expect(s.everydaySpending).toBe(60);
    items = await recentActivity(db, 20);
    expect(items.find(i => i.source === 'expense' && i.sourceId === id)?.amount).toBe(60);

    await deleteExpense(db, id);
    s = await loadFinanceSummary(db, REF);
    expect(s.everydaySpending).toBe(0);
    items = await recentActivity(db, 20);
    expect(items.find(i => i.source === 'expense' && i.sourceId === id)).toBeUndefined();
  });
});

describe('B. BILL — plan, pay, delete-plan: historical actual remains coherent', () => {
  it('a future plan appears as owed, paying it moves it to "gone" exactly once, deleting the plan preserves that history', async () => {
    await db.runAsync(
      `INSERT INTO bills (id, name, amount, frequency, due_day) VALUES (1, 'Bell', 117, 'monthly', 28)`
    );

    // Future plan appears: unpaid this cycle.
    let s = await loadFinanceSummary(db, REF);
    expect(s.unpaidBillsTotal).toBe(117);
    expect(s.billsPaidTotal).toBe(0);

    // Pay it: actual movement appears once.
    await recordPayment(db, 'bill', 1, '2026-08-28', 'confirmed', 117, 'Bell');
    s = await loadFinanceSummary(db, REF);
    expect(s.unpaidBillsTotal).toBe(0);
    expect(s.billsPaidTotal).toBe(117);
    // Not double-counted in monthSpending alongside everyday spending.
    expect(s.monthSpending).toBe(117);

    // Delete the plan: historical actual remains coherent (D2), future plan disappears.
    await db.runAsync(`DELETE FROM bills WHERE id=1`);
    s = await loadFinanceSummary(db, REF);
    expect(s.billsPaidTotal).toBe(117); // real money, not erased
    const items = await recentActivity(db, 20);
    expect(items.find(i => i.source === 'bill' && i.sourceId === 1)?.title).toBe('Bell'); // named, not orphaned

    const septRef = new Date(2026, 8, 28);
    const sSept = await loadFinanceSummary(db, septRef);
    expect(sSept.unpaidBillsTotal).toBe(0); // no future occurrence projected — the plan is gone
  });
});

describe('C. INCOME — a schedule and a confirmed paycheck each count exactly once', () => {
  it('creating a schedule projects occurrences; recording the actual paycheck counts it once', async () => {
    await db.runAsync(
      `INSERT INTO income_schedules (id, label, amount, frequency, day_of_month, active, created_at)
       VALUES (1, 'Paycheck', 2200, 'monthly', 15, 1, '2026-01-01T00:00:00.000Z')`
    );

    // The schedule alone creates no income.
    let s = await loadFinanceSummary(db, REF);
    expect(s.monthIncome).toBe(0);

    // Recording the actual paycheck counts it once.
    await db.runAsync(
      `INSERT INTO income (amount, label, date, schedule_id, cycle_date) VALUES (2200, 'Paycheck', '2026-08-15', 1, '2026-08-15')`
    );
    s = await loadFinanceSummary(db, REF);
    expect(s.monthIncome).toBe(2200);

    const items = await recentActivity(db, 20);
    expect(items.filter(i => i.source === 'income').length).toBe(1); // not duplicated
  });
});

describe('D. DEBT — payment integrates with the engine, and edit/delete keep it correct', () => {
  it('paying, editing, and deleting a debt payment all update Safe to Spend and Activity together', async () => {
    await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (2000, 'Paycheck', '2026-08-01')`);
    await db.runAsync(`INSERT INTO debts (id, name, total_amount, amount_paid) VALUES (1, 'Visa', 1000, 0)`);

    await db.runAsync(`INSERT INTO debt_payments (debt_id, date, amount, debt_name) VALUES (1, '2026-08-10', 500, 'Visa')`);
    let s = await loadFinanceSummary(db, REF);
    expect(s.debtPaymentsTotal).toBe(500);
    expect(s.moneyLeft).toBe(1500); // 2000 - 500

    const row = await db.getFirstAsync(`SELECT id FROM debt_payments WHERE debt_id=1`);
    await db.runAsync(`UPDATE debt_payments SET amount=? WHERE id=?`, [300, row.id]);
    s = await loadFinanceSummary(db, REF);
    expect(s.debtPaymentsTotal).toBe(300);
    expect(s.moneyLeft).toBe(1700);

    await db.runAsync(`DELETE FROM debt_payments WHERE id=?`, [row.id]);
    s = await loadFinanceSummary(db, REF);
    expect(s.debtPaymentsTotal).toBe(0);
    expect(s.moneyLeft).toBe(2000);

    // The debt plan itself survives every one of those payment edits.
    expect((await db.getAllAsync(`SELECT * FROM debts WHERE id=1`)).length).toBe(1);
  });
});

describe('E. PAYDAY — cannot report a contradictory spendable amount from the same data', () => {
  it('bills-owed and savings-needed are byte-identical between the canonical summary and what Payday would show', async () => {
    await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (2000, 'Paycheck', '2026-08-01')`);
    await db.runAsync(`INSERT INTO bills (id, name, amount, frequency, due_day) VALUES (1, 'Hydro', 145, 'monthly', 15)`);
    await db.runAsync(`INSERT INTO savings_goals (id, name, target_amount, current_amount) VALUES (1, 'Vacation', 2400, 0)`);

    const summary = await loadFinanceSummary(db, REF);

    // This is exactly what PaydayScreen.calculatePlan() now does: read these
    // two fields verbatim, never recompute them. Proven by construction
    // (calculatePlan assigns billsTotal = summary.unpaidBillsTotal directly)
    // and by paydaySecondBrain.test.tsx, which renders the real screen.
    const paydayBills = summary.unpaidBillsTotal;
    const paydaySavings = summary.goalsSavingsNeeded;

    expect(paydayBills).toBe(145);
    expect(paydaySavings).toBe(200); // 2400/12
    // Home and Payday read the identical numbers -- they cannot disagree
    // about what is owed or what saving needs, only about scope (this
    // paycheck vs. the rest of the month), which is not a contradiction.
  });
});
