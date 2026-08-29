/**
 * VERIFYING A PAYMENT PEGGYBANK CANNOT SEE.
 *
 * These run the REAL write paths against a REAL SQLite database. What matters
 * here is not that a function was called but that the row it wrote means the
 * right thing afterwards — and that the finance engine, reading that row, ends
 * up with the same money as before.
 *
 * The rule underneath all of it: one occurrence, one row. An automatic payment
 * and a manual one write the SAME kind of record. There is no second ledger.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import {
  recordPayment, clearPayment, paymentForCycle, paymentsFor,
  settleAssumedPayments, currentCycleDate, methodOf,
} from '../lib/billCycles';
import { occurrenceState } from '../core/paymentState';

let db: any;
beforeEach(() => { db = makeRealDb(); });

const AUG28 = '2026-08-28';
const REF = new Date(2026, 7, 28);

async function addBell(over: Record<string, unknown> = {}) {
  const v = { name: 'Bell', amount: 117, due_day: 28, payment_method: 'auto', auto_confirm: 0, ...over };
  await db.runAsync(
    `INSERT INTO bills (id, name, amount, frequency, due_day, payment_method, auto_confirm)
     VALUES (1, ?, ?, 'monthly', ?, ?, ?)`,
    [v.name, v.amount, v.due_day, v.payment_method, v.auto_confirm]);
}

async function addNetflix(over: Record<string, unknown> = {}) {
  const v = { amount: 23.99, billing_day: 28, payment_method: 'auto', auto_confirm: 0, ...over };
  await db.runAsync(
    `INSERT INTO subscriptions (id, name, amount, billing_day, payment_method, auto_confirm)
     VALUES (1, 'Netflix', ?, ?, ?, ?)`,
    [v.amount, v.billing_day, v.payment_method, v.auto_confirm]);
}

describe('Confirming an expected payment', () => {
  it('"Yes, it was paid" records ONE row, not a duplicate bill or expense', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);

    const rows = await db.getAllAsync(`SELECT * FROM bill_payments`);
    expect(rows.length).toBe(1);
    expect(rows[0].paid).toBe(1);
    expect(rows[0].status).toBe('confirmed');

    // No shadow expense was invented for it.
    const expenses = await db.getAllAsync(`SELECT * FROM expenses`);
    expect(expenses.length).toBe(0);
    // And the bill itself is untouched.
    const bill = await db.getFirstAsync(`SELECT * FROM bills WHERE id = 1`);
    expect(bill.amount).toBe(117);
  });

  it('confirming twice still leaves one row', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    expect((await db.getAllAsync(`SELECT * FROM bill_payments`)).length).toBe(1);
  });

  it('the occurrence reads back as paid', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    const p: any = await paymentForCycle(db, 'bill', 1, AUG28);
    expect(occurrenceState({ method: 'auto', cycleDate: AUG28, today: AUG28, payment: p })).toBe('paid');
  });
});

describe('A different amount than expected', () => {
  it('records what actually left the account', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 121.36);
    const p: any = await paymentForCycle(db, 'bill', 1, AUG28);
    expect(p.amount).toBe(121.36);
  });

  it('does NOT rewrite the recurring plan', async () => {
    // One surprising month must not silently change every month to come.
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 121.36);
    const bill = await db.getFirstAsync(`SELECT amount FROM bills WHERE id = 1`);
    expect(bill.amount).toBe(117);
  });

  it('leaves September expecting the planned amount again', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 121.36);
    const sept = await paymentForCycle(db, 'bill', 1, '2026-09-28');
    expect(sept).toBeNull();      // nothing recorded: owed again, at $117
  });
});

describe('The payment did not go through', () => {
  it('is not left pretending to be paid', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    const row = await db.getFirstAsync(`SELECT * FROM bill_payments`);
    expect(row.paid).toBe(0);
    expect(row.status).toBe('failed');
  });

  it('is invisible to the finance engine, so the money stays owed', async () => {
    // buildFinanceInput reads WHERE paid = 1. A failed row is not paid, so the
    // occurrence is simply still owed — the money is never released.
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    const visible = await db.getAllAsync(`SELECT * FROM bill_payments WHERE paid = 1`);
    expect(visible.length).toBe(0);
  });

  it('still reads back as a failure, not as "nothing happened"', async () => {
    // The difference matters: the person needs to be told it did not go
    // through, not quietly shown "due" as though nobody had tried.
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    const p: any = await paymentForCycle(db, 'bill', 1, AUG28);
    expect(occurrenceState({ method: 'auto', cycleDate: AUG28, today: AUG28, payment: p })).toBe('failed');
  });

  it('can be corrected afterwards when the money finally goes out', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    const rows = await db.getAllAsync(`SELECT * FROM bill_payments`);
    expect(rows.length).toBe(1);           // still one occurrence
    expect(rows[0].paid).toBe(1);
    expect(rows[0].status).toBe('confirmed');
  });
});

describe('Un-ticking something ticked by mistake', () => {
  it('returns the occurrence to simply owed', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    await clearPayment(db, 'bill', 1, AUG28);
    expect(await paymentForCycle(db, 'bill', 1, AUG28)).toBeNull();
    expect(occurrenceState({ method: 'manual', cycleDate: AUG28, today: AUG28, payment: null })).toBe('due');
  });
});

describe('Assuming an automatic payment happened, when asked to', () => {
  it('does nothing at all unless the user turned it on', async () => {
    await addBell({ auto_confirm: 0 });
    expect(await settleAssumedPayments(db, REF)).toBe(0);
    expect((await db.getAllAsync(`SELECT * FROM bill_payments`)).length).toBe(0);
  });

  it('does nothing for a MANUAL bill even if the flag is somehow set', async () => {
    // Hydro will not pay itself. No setting may make PeggyBank believe it did.
    await addBell({ payment_method: 'manual', auto_confirm: 1 });
    expect(await settleAssumedPayments(db, REF)).toBe(0);
  });

  it('does nothing before the due date', async () => {
    await addBell({ auto_confirm: 1 });
    expect(await settleAssumedPayments(db, new Date(2026, 7, 20))).toBe(0);
  });

  it('records an ASSUMED payment once the date has passed', async () => {
    await addBell({ auto_confirm: 1 });
    expect(await settleAssumedPayments(db, REF)).toBe(1);
    const row = await db.getFirstAsync(`SELECT * FROM bill_payments`);
    expect(row.status).toBe('assumed');    // never "confirmed" — nobody confirmed it
    expect(row.paid).toBe(1);
    expect(row.amount).toBe(117);
  });

  it('is idempotent — running it every time the app opens creates one row', async () => {
    await addBell({ auto_confirm: 1 });
    await settleAssumedPayments(db, REF);
    await settleAssumedPayments(db, REF);
    await settleAssumedPayments(db, REF);
    expect((await db.getAllAsync(`SELECT * FROM bill_payments`)).length).toBe(1);
  });

  it('never overwrites an answer the user already gave', async () => {
    await addBell({ auto_confirm: 1 });
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    expect(await settleAssumedPayments(db, REF)).toBe(0);
    const row = await db.getFirstAsync(`SELECT * FROM bill_payments`);
    expect(row.status).toBe('failed');     // the user's word stands
    expect(row.paid).toBe(0);
  });

  it('handles subscriptions the same way', async () => {
    await addNetflix({ auto_confirm: 1 });
    expect(await settleAssumedPayments(db, REF)).toBe(1);
    const row = await db.getFirstAsync(`SELECT * FROM bill_payments WHERE source = 'subscription'`);
    expect(row.status).toBe('assumed');
    expect(row.amount).toBe(23.99);
  });
});

describe('Subscriptions keep running', () => {
  it('a settled renewal does not stop the next one', async () => {
    await addNetflix({ auto_confirm: 1 });
    await settleAssumedPayments(db, REF);
    // September's renewal has no record, so it is owed again on schedule.
    expect(await paymentForCycle(db, 'subscription', 1, '2026-09-28')).toBeNull();
    expect((await db.getAllAsync(`SELECT * FROM subscriptions`)).length).toBe(1);
  });

  it('one renewal is one row — never two months in one go', async () => {
    await addNetflix({ auto_confirm: 1 });
    await settleAssumedPayments(db, REF);
    await settleAssumedPayments(db, new Date(2026, 8, 28));   // a month later
    const rows = await db.getAllAsync(`SELECT * FROM bill_payments ORDER BY cycle_date`);
    expect(rows.length).toBe(2);
    expect(rows[0].cycle_date).toBe('2026-08-28');
    expect(rows[1].cycle_date).toBe('2026-09-28');
  });

  it('a subscription and a bill sharing an id never collide', async () => {
    // Both are id 1. They live in different namespaces via `source`.
    await addBell({ auto_confirm: 1 });
    await addNetflix({ auto_confirm: 1 });
    await settleAssumedPayments(db, REF);
    const rows = await db.getAllAsync(`SELECT source, amount FROM bill_payments ORDER BY source`);
    expect(rows.length).toBe(2);
    expect(rows[0].source).toBe('bill');
    expect(rows[1].source).toBe('subscription');
  });
});

describe('Changing how a bill is paid does not rewrite history', () => {
  it('switching to auto-pay in August leaves the manual months alone', async () => {
    await addBell({ payment_method: 'manual' });
    // Paid by hand, June and July.
    await recordPayment(db, 'bill', 1, '2026-06-28', 'confirmed', 117);
    await recordPayment(db, 'bill', 1, '2026-07-28', 'confirmed', 117);

    await db.runAsync(`UPDATE bills SET payment_method = 'auto' WHERE id = 1`);

    const history = await db.getAllAsync(
      `SELECT cycle_date, status, paid FROM bill_payments ORDER BY cycle_date`);
    expect(history.length).toBe(2);
    for (const h of history) {
      expect(h.status).toBe('confirmed');   // still true: the user really did pay these
      expect(h.paid).toBe(1);
    }
  });

  it('switching back to manual does not un-pay anything', async () => {
    await addBell({ payment_method: 'auto' });
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    await db.runAsync(`UPDATE bills SET payment_method = 'manual', auto_confirm = 0 WHERE id = 1`);
    const row = await db.getFirstAsync(`SELECT * FROM bill_payments`);
    expect(row.paid).toBe(1);
  });

  it('turning auto-pay OFF stops future assuming without touching the past', async () => {
    await addBell({ auto_confirm: 1 });
    await settleAssumedPayments(db, REF);                       // August assumed
    await db.runAsync(`UPDATE bills SET payment_method = 'manual', auto_confirm = 0 WHERE id = 1`);
    await settleAssumedPayments(db, new Date(2026, 8, 28));      // September: nothing
    const rows = await db.getAllAsync(`SELECT cycle_date FROM bill_payments`);
    expect(rows.length).toBe(1);
    expect(rows[0].cycle_date).toBe('2026-08-28');
  });
});

describe('Existing data migrates safely', () => {
  it('a bill saved before this feature behaves exactly as it did: manual', async () => {
    // No payment_method given — the column default applies.
    await db.runAsync(
      `INSERT INTO bills (id, name, amount, frequency, due_day) VALUES (9, 'Hydro', 84, 'monthly', 2)`);
    const bill = await db.getFirstAsync(`SELECT * FROM bills WHERE id = 9`);
    expect(bill.payment_method).toBe('manual');
    expect(bill.auto_confirm).toBe(0);
    // And it is never assumed paid on anyone's behalf.
    expect(await settleAssumedPayments(db, REF)).toBe(0);
  });

  it('a subscription saved before this feature is treated as auto-charged', async () => {
    await db.runAsync(
      `INSERT INTO subscriptions (id, name, amount, billing_day) VALUES (9, 'Spotify', 11.99, 5)`);
    const sub = await db.getFirstAsync(`SELECT * FROM subscriptions WHERE id = 9`);
    expect(sub.payment_method).toBe('auto');
    // But nothing is ever assumed paid without the user opting in.
    expect(sub.auto_confirm).toBe(0);
    expect(await settleAssumedPayments(db, REF)).toBe(0);
  });

  it('a payment row saved before this feature counts as confirmed', async () => {
    await db.runAsync(
      `INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount)
       VALUES (1, 'bill', ?, 1, 117)`, [AUG28]);
    const p: any = await paymentForCycle(db, 'bill', 1, AUG28);
    expect(p.status).toBe('confirmed');
  });

  it('methodOf falls back safely for a row with nothing stored', () => {
    expect(methodOf({}, 'manual')).toBe('manual');
    expect(methodOf({}, 'auto')).toBe('auto');
    expect(methodOf({ payment_method: null }, 'manual')).toBe('manual');
    expect(methodOf({ payment_method: 'auto' }, 'manual')).toBe('auto');
    expect(methodOf({ payment_method: 'manual' }, 'auto')).toBe('manual');
  });
});

describe('Reading many bills at once', () => {
  it('paymentsFor keys every occurrence it knows about', async () => {
    await addBell();
    await recordPayment(db, 'bill', 1, '2026-07-28', 'confirmed', 117);
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    const map: any = await paymentsFor(db, 'bill');
    expect(map.get('1|2026-07-28').paid).toBe(true);
    expect(map.get('1|2026-08-28').status).toBe('failed');
    expect(map.get('1|2026-09-28')).toBeUndefined();
  });

  it('agrees with currentCycleDate about which occurrence is in play', async () => {
    await addBell();
    const cycle = currentCycleDate({ id: 1, due_day: 28 }, REF);
    expect(cycle).toBe(AUG28);
  });
});
