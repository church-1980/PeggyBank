/**
 * D2 — PLAN vs ACTUAL MONEY, when the plan is deleted after payment.
 *
 * The full-program diagnostic proved that deleting a bill/subscription after
 * it was paid orphaned its bill_payments row, and financeSummary, activity
 * and calendarMonth each handled the orphan differently — three realities
 * from one event.
 *
 * THE RULE: deleting a PLAN must not falsify or erase historical ACTUAL
 * MONEY. The plan stops being scheduled; the payment it already produced
 * stays real, stays counted exactly once, and stays understandable by name.
 * That is implemented by snapshotting the bill/subscription's name onto
 * bill_payments.bill_name when the payment is recorded (billCycles.ts), so a
 * payment never depends on its parent still existing to mean something.
 *
 * These tests now assert the FIXED behaviour. Reverting the fix — deleting
 * the plan with no name snapshot, or reintroducing a bare `DELETE FROM
 * bills`-then-forget — makes them fail.
 */
process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { recordPayment, setCyclePaid } from '../lib/billCycles';
import { loadFinanceSummary } from '../lib/financeSummary';
import { recentActivity } from '../lib/activity';
import { buildMonth } from '../core/calendarMonth';
import { buildBackup, restoreBackup } from '../lib/backupCore';

let db: any;
beforeEach(() => { db = makeRealDb(); });

const AUG28 = '2026-08-28';
const REF = new Date(2026, 7, 28);

async function addBell() {
  await db.runAsync(
    `INSERT INTO bills (id, name, amount, frequency, due_day, payment_method, auto_confirm)
     VALUES (1, 'Bell', 117, 'monthly', 28, 'manual', 0)`
  );
}

async function addNetflix() {
  await db.runAsync(
    `INSERT INTO subscriptions (id, name, amount, billing_day, payment_method, auto_confirm)
     VALUES (1, 'Netflix', 16.49, 28, 'auto', 0)`
  );
}

describe('D2 fixed — bill plan deleted after payment', () => {
  it('Safe to Spend reflects the real payment exactly once, before and after deletion', async () => {
    await addBell();
    // The real write path: BillsScreen passes the bill's name now.
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117, 'Bell');

    const before = await loadFinanceSummary(db, REF);
    expect(before.billsPaidTotal).toBe(117);

    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const after = await loadFinanceSummary(db, REF);
    // Unchanged: real money that moved stays counted once. This was already
    // true before the fix — the bug was never here, it was in how the other
    // two screens described the same fact.
    expect(after.billsPaidTotal).toBe(117);
    expect(after.monthSpending).toBe(before.monthSpending);
  });

  it('Activity names the payment from its snapshot once the bill is gone', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117, 'Bell');
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const items = await recentActivity(db, 20);
    const orphan = items.find(i => i.source === 'bill' && i.sourceId === 1);
    expect(orphan).toBeDefined();
    // FIXED: was 'Payment' (generic, untraceable). Now the real name.
    expect(orphan?.title).toBe('Bell');
    expect(orphan?.amount).toBe(117);
  });

  it('Calendar keeps the historical payment visible, by name, with no future occurrence', async () => {
    await addBell();
    // Inserted directly (not via recordPayment) so paid_at is pinned to the
    // simulated payment date, AUG28, rather than the real current moment.
    await db.runAsync(
      `INSERT INTO bill_payments (bill_id, source, cycle_date, paid, paid_at, amount, bill_name)
       VALUES (1, 'bill', ?, 1, ?, 117, 'Bell')`,
      [AUG28, AUG28 + 'T12:00:00.000Z']
    );
    const payments = await db.getAllAsync(
      `SELECT source, bill_id, cycle_date, paid, paid_at, amount, status, bill_name FROM bill_payments`
    );
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    // August: the payment still appears, named, dated the day it moved.
    const august = buildMonth({
      year: 2026, month: 7, today: '2026-08-28',
      bills: [], subscriptions: [], payments,
      expenses: [], income: [], paydays: [],
    });
    const augEntries = [...august.values()].flat();
    const paidEntry = augEntries.find(e => e.kind === 'bill' && e.label === 'Bell');
    expect(paidEntry).toBeDefined();
    expect(paidEntry?.amount).toBe(117);
    expect(paidEntry?.state).toBe('actual');
    // FIXED: previously invisible — buildMonth only drew bills it was handed,
    // and the deleted bill was no longer among them.

    // September: the plan is gone, so no future occurrence is projected.
    const september = buildMonth({
      year: 2026, month: 8, today: '2026-09-28',
      bills: [], subscriptions: [], payments,
      expenses: [], income: [], paydays: [],
    });
    const sepEntries = [...september.values()].flat();
    expect(sepEntries.find(e => e.kind === 'bill')).toBeUndefined();
  });

  it('backup and restore preserve the orphaned payment, still named', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117, 'Bell');
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const backup = await buildBackup(db);
    const fresh: any = makeRealDb();
    const report = await restoreBackup(fresh, backup);
    expect(report.success).toBe(true);

    const items = await recentActivity(fresh, 20);
    const orphan = items.find((i: any) => i.source === 'bill' && i.sourceId === 1);
    expect(orphan?.title).toBe('Bell');

    const summary = await loadFinanceSummary(fresh, REF);
    expect(summary.billsPaidTotal).toBe(117);
  });
});

describe('D2 fixed — subscription equivalent', () => {
  it('a deleted subscription behaves identically to a deleted bill', async () => {
    await addNetflix();
    await setCyclePaid(db, 'subscription', 1, AUG28, true, 16.49, 'Netflix');
    // setCyclePaid also stamps paid_at to "now" — pin it to AUG28 for the
    // Calendar assertion below, exactly as the bill test does above.
    await db.runAsync(
      `UPDATE bill_payments SET paid_at = ? WHERE source='subscription' AND bill_id=1`,
      [AUG28 + 'T12:00:00.000Z']
    );
    await db.runAsync(`DELETE FROM subscriptions WHERE id=?`, [1]);

    const summary = await loadFinanceSummary(db, REF);
    expect(summary.billsPaidTotal).toBe(16.49);

    const items = await recentActivity(db, 20);
    const orphan = items.find(i => i.source === 'subscription' && i.sourceId === 1);
    expect(orphan?.title).toBe('Netflix');

    const payments = await db.getAllAsync(
      `SELECT source, bill_id, cycle_date, paid, paid_at, amount, status, bill_name FROM bill_payments`
    );
    const august = buildMonth({
      year: 2026, month: 7, today: '2026-08-28',
      bills: [], subscriptions: [], payments,
      expenses: [], income: [], paydays: [],
    });
    const entry = [...august.values()].flat().find(e => e.kind === 'subscription');
    expect(entry?.label).toBe('Netflix');
  });
});

describe('D2 falsification — proves the tests actually catch the bug', () => {
  it('FALSIFIES if a payment is recorded with no name snapshot and its plan is deleted', async () => {
    await addBell();
    // Deliberately mutated: omit the name, as the pre-fix call sites did.
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117 /* no name */);
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const items = await recentActivity(db, 20);
    const orphan = items.find(i => i.source === 'bill' && i.sourceId === 1);
    // Falls back to 'Payment' exactly as before the fix — proving this suite
    // would catch a regression where a call site stops passing the name.
    expect(orphan?.title).toBe('Payment');
  });
});
