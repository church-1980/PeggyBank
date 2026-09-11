/**
 * D1 — debt payments are real money leaving the account, and must reach the
 * canonical finance engine like any other outflow.
 *
 * DECISION (documented, not assumed): the diagnostic found debt payments
 * invisible to Safe to Spend, everywhere, always -- not an edge case. Given
 * "choose the interpretation that is financially consistent with how bills
 * and expenses work" (the repair brief's own steer): a $500 debt payment is
 * cash that left the account, the same kind of event as a bill payment.
 * FinanceInput.debtPayments is summed into monthSpending exactly like
 * billsPaidTotal.
 *
 * A cumulative debts.amount_paid column cannot be audited, corrected or
 * dated, so debt_payments is now the authoritative ledger (mirrors
 * bill_payments). debts.amount_paid is left in the schema as legacy history
 * only; DebtScreen no longer writes to it and derives what it shows from
 * SUM(debt_payments.amount).
 */
process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { loadFinanceSummary } from '../lib/financeSummary';
import { recentActivity } from '../lib/activity';
import { buildBackup, restoreBackup } from '../lib/backupCore';

let db: any;
beforeEach(() => { db = makeRealDb(); });

const REF = new Date(2026, 7, 28);

async function addVisa() {
  await db.runAsync(
    `INSERT INTO debts (id, name, total_amount, amount_paid) VALUES (1, 'Visa', 1000, 0)`
  );
}

async function pay(amount: number, date = '2026-08-10', name = 'Visa') {
  await db.runAsync(
    `INSERT INTO debt_payments (debt_id, date, amount, debt_name) VALUES (1, ?, ?, ?)`,
    [date, amount, name]
  );
}

describe('D1 — a debt payment reaches Safe to Spend', () => {
  it('debt $1000, pay $500 -> Safe to Spend changes by exactly $500, once', async () => {
    await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (2000, 'Paycheck', '2026-08-05')`);
    await addVisa();
    const before = await loadFinanceSummary(db, REF);

    await pay(500);
    const after = await loadFinanceSummary(db, REF);

    expect(after.debtPaymentsTotal).toBe(500);
    expect(before.moneyLeft - after.moneyLeft).toBe(500);
    expect(before.safeToSpend - after.safeToSpend).toBe(500);
  });

  it('What Happened shows it', async () => {
    await addVisa();
    await pay(500);
    const items = await recentActivity(db, 20);
    const entry = items.find(i => i.source === 'debt' && i.sourceId === 1);
    expect(entry).toBeDefined();
    expect(entry?.title).toBe('Visa');
    expect(entry?.amount).toBe(500);
    expect(entry?.direction).toBe('out');
  });

  it('editing a payment updates every output, and it is never counted twice', async () => {
    await addVisa();
    await pay(500);
    const row: { id: number } = await db.getFirstAsync(`SELECT id FROM debt_payments WHERE debt_id=1`);
    await db.runAsync(`UPDATE debt_payments SET amount=? WHERE id=?`, [300, row!.id]);

    const summary = await loadFinanceSummary(db, REF);
    expect(summary.debtPaymentsTotal).toBe(300);       // not 800, not 500 + 300
    const rows = await db.getAllAsync(`SELECT * FROM debt_payments`);
    expect(rows.length).toBe(1);                       // still one row, not two

    const items = await recentActivity(db, 20);
    expect(items.find(i => i.source === 'debt')?.amount).toBe(300);
  });

  it('deleting a payment removes it from every output; the debt plan remains', async () => {
    await addVisa();
    await pay(500);
    const row: { id: number } = await db.getFirstAsync(`SELECT id FROM debt_payments WHERE debt_id=1`);
    await db.runAsync(`DELETE FROM debt_payments WHERE id=?`, [row!.id]);

    const summary = await loadFinanceSummary(db, REF);
    expect(summary.debtPaymentsTotal).toBe(0);
    const items = await recentActivity(db, 20);
    expect(items.find(i => i.source === 'debt')).toBeUndefined();

    const debts = await db.getAllAsync(`SELECT * FROM debts WHERE id=1`);
    expect(debts.length).toBe(1);                       // the plan itself survives
  });

  it('two payments in different months are each attributed to their own month', async () => {
    await addVisa();
    await pay(500, '2026-08-10');
    await pay(300, '2026-09-05');
    const aug = await loadFinanceSummary(db, REF);
    expect(aug.debtPaymentsTotal).toBe(500);
    const sep = await loadFinanceSummary(db, new Date(2026, 8, 28));
    expect(sep.debtPaymentsTotal).toBe(300);
  });
});

describe('D1 — deleting the debt PLAN after payment (the D2 family, applied to debts)', () => {
  it('the payment stays real, named, and counted after the debt is deleted', async () => {
    await addVisa();
    await pay(500);
    await db.runAsync(`DELETE FROM debts WHERE id=1`);

    const summary = await loadFinanceSummary(db, REF);
    expect(summary.debtPaymentsTotal).toBe(500);        // real money, not erased

    const items = await recentActivity(db, 20);
    const entry = items.find(i => i.source === 'debt' && i.sourceId === 1);
    expect(entry?.title).toBe('Visa');                  // named from the snapshot, not 'Payment'
  });

  it('backup and restore preserve it', async () => {
    await addVisa();
    await pay(500);
    await db.runAsync(`DELETE FROM debts WHERE id=1`);

    const backup = await buildBackup(db);
    const fresh: any = makeRealDb();
    const report = await restoreBackup(fresh, backup);
    expect(report.success).toBe(true);

    const summary = await loadFinanceSummary(fresh, REF);
    expect(summary.debtPaymentsTotal).toBe(500);
    const items = await recentActivity(fresh, 20);
    expect(items.find((i: any) => i.source === 'debt')?.title).toBe('Visa');
  });
});

/**
 * MIGRATION SAFETY — database.ts's debt_payments_migrated_v1 one-time
 * backfill, run as a standalone simulation against a real SQLite engine.
 *
 * database.ts's setupDatabase() cannot be driven end-to-end here: it depends
 * on the real expo-sqlite native module, which this test suite (real
 * node:sqlite, not the RN runtime) cannot load. This proves the exact same
 * logic that migration runs -- same guard, same SQL, same idempotence -- as
 * a direct simulation, which is the same ceiling this codebase already
 * accepts for its other one-time migrations (bill_cycles_migrated_v1,
 * paycheck_dedupe_v1 have no dedicated test either). Full setupDatabase()
 * execution remains verified only by manual review and real-device use.
 */
describe('MIGRATION SAFETY — debts.amount_paid backfilled into a ledger row', () => {
  async function runMigration() {
    const migrated = await db.getFirstAsync(`SELECT value FROM settings WHERE key = 'debt_payments_migrated_v1'`);
    if (migrated) return;
    const paidDebts = await db.getAllAsync(`SELECT id, name, amount_paid FROM debts WHERE amount_paid > 0`);
    for (const d of paidDebts) {
      await db.runAsync(
        `INSERT INTO debt_payments (debt_id, date, amount, debt_name) VALUES (?, ?, ?, ?)`,
        [d.id, '2026-09-11', d.amount_paid, d.name]
      );
    }
    await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('debt_payments_migrated_v1', 'done')`);
  }

  it('a pre-migration fixture (amount_paid only, no ledger) gets exactly one payment row', async () => {
    await db.runAsync(`INSERT INTO debts (id, name, total_amount, amount_paid) VALUES (1, 'Visa', 2500, 850)`);
    await runMigration();

    const rows = await db.getAllAsync(`SELECT * FROM debt_payments WHERE debt_id=1`);
    expect(rows.length).toBe(1);
    expect(rows[0].amount).toBe(850);
    expect(rows[0].debt_name).toBe('Visa');

    // Financial equivalence: the engine now sees the same $850 the old
    // cumulative field always claimed, just as an auditable, dated row.
    const summary = await loadFinanceSummary(db, new Date(2026, 8, 11));
    expect(summary.debtPaymentsTotal).toBe(850);
    expect(rows[0].amount).toBe(850);
  });

  it('a debt with no progress gets no synthetic row', async () => {
    await db.runAsync(`INSERT INTO debts (id, name, total_amount, amount_paid) VALUES (1, 'Car loan', 5000, 0)`);
    await runMigration();
    const rows = await db.getAllAsync(`SELECT * FROM debt_payments`);
    expect(rows.length).toBe(0);
  });

  it('is idempotent: running it twice does not duplicate the backfill', async () => {
    await db.runAsync(`INSERT INTO debts (id, name, total_amount, amount_paid) VALUES (1, 'Visa', 2500, 850)`);
    await runMigration();
    await runMigration();
    const rows = await db.getAllAsync(`SELECT * FROM debt_payments WHERE debt_id=1`);
    expect(rows.length).toBe(1);
  });

  it('a fresh install with no debts at all migrates cleanly to nothing', async () => {
    await runMigration();
    const rows = await db.getAllAsync(`SELECT * FROM debt_payments`);
    expect(rows.length).toBe(0);
    const flag = await db.getFirstAsync(`SELECT value FROM settings WHERE key='debt_payments_migrated_v1'`);
    expect(flag?.value).toBe('done');
  });
});
