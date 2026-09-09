/**
 * DIAGNOSTIC — does deleting a bill/subscription PLAN clean up its
 * bill_payments history, and do the three consumers of that table
 * (finance engine, Activity feed, Calendar) agree about what remains?
 *
 * This is a reproduction, not a fix. See CHATGPT/diagnostic report for
 * the finding this backs.
 */
process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { recordPayment } from '../lib/billCycles';
import { loadFinanceSummary } from '../lib/financeSummary';
import { recentActivity } from '../lib/activity';

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

describe('Deleting a bill plan after it was paid', () => {
  it('REPRO: the payment still reduces Safe to Spend after the bill is deleted', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);

    const before = await loadFinanceSummary(db, REF);
    expect(before.billsPaidTotal).toBe(117);

    // Same SQL BillsScreen.deleteBill() runs — no bill_payments cleanup.
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const after = await loadFinanceSummary(db, REF);
    // FINDING: this still equals 117. Deleting the bill did not remove its
    // $117 from "money out" — it silently keeps counting forever, because
    // buildFinanceInput() reads bill_payments with no join back to bills.
    expect(after.billsPaidTotal).toBe(117);
    expect(after.monthSpending).toBe(before.monthSpending);
  });

  it('REPRO: the orphaned payment still appears in Activity, unnamed', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const items = await recentActivity(db, 20);
    const orphan = items.find(i => i.source === 'bill' && i.sourceId === 1);
    // FINDING: the row survives (activity.ts LEFT JOINs, so it doesn't
    // vanish), but its title falls back to the generic 'Payment' because
    // the bill it names no longer exists — a payment with no bill attached,
    // permanently, with no way in the UI to trace or remove it.
    expect(orphan).toBeDefined();
    expect(orphan?.title).toBe('Payment');
  });

  it('CONTROL: deleting the bill BEFORE payment leaves no trace anywhere (as expected)', async () => {
    await addBell();
    await db.runAsync(`DELETE FROM bills WHERE id=?`, [1]);

    const summary = await loadFinanceSummary(db, REF);
    expect(summary.billsPaidTotal).toBe(0);
    const items = await recentActivity(db, 20);
    expect(items.find(i => i.sourceId === 1)).toBeUndefined();
  });
});
