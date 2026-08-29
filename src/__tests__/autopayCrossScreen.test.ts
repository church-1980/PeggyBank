/**
 * EVERY SCREEN TELLS THE SAME STORY.
 *
 * A person can see the same auto-pay bill on Home, on Bills, in What Happened,
 * on the Calendar and in Monthly Breakdown. If those disagree about whether
 * Bell has been paid — or by how much — the app stops being believable, and
 * nothing crashes to warn anyone.
 *
 * These run the REAL loaders and the REAL SQL against a REAL database, walking
 * one auto-pay bill through its whole life.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary, explainSafeToSpend } from '../core/finance';
import { recordPayment, settleAssumedPayments } from '../lib/billCycles';
import { activityForMonth } from '../lib/activity';

let db: any;
const AUG28 = '2026-08-28';
const NOW = new Date(2026, 7, 28);

beforeEach(async () => {
  db = makeRealDb();
  await db.runAsync(
    `INSERT INTO bills (id, name, amount, frequency, due_day, category, payment_method, auto_confirm)
     VALUES (1, 'Bell', 117, 'monthly', 28, 'bills', 'auto', 0)`);
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (1000, 'Pay', '2026-08-01')`);
});

const summary = async () => computeFinanceSummary(await buildFinanceInput(db, NOW));

describe('One auto-pay bill, walked all the way through', () => {
  it('BEFORE the due date: reserved, and Safe to Spend already knows', async () => {
    const s = computeFinanceSummary(await buildFinanceInput(db, new Date(2026, 7, 20)));
    expect(s.unpaidBillsTotal).toBe(117);
    expect(s.billsPaidTotal).toBe(0);
    expect(s.safeToSpend).toBe(883);
  });

  it('ON the due date, unconfirmed: nothing changes at all', async () => {
    const s = await summary();
    expect(s.unpaidBillsTotal).toBe(117);
    expect(s.safeToSpend).toBe(883);
    // It has NOT quietly become an expense.
    expect((await db.getAllAsync(`SELECT * FROM expenses`)).length).toBe(0);
    // And it has not vanished either.
    expect((await db.getAllAsync(`SELECT * FROM bills`)).length).toBe(1);
  });

  it('AFTER confirming: same Safe to Spend, money moved between buckets', async () => {
    const before = await summary();
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    const after = await summary();

    expect(after.safeToSpend).toBe(before.safeToSpend);   // THE INVARIANT
    expect(after.unpaidBillsTotal).toBe(0);
    expect(after.billsPaidTotal).toBe(117);
  });

  it('What Happened shows it ONCE, and only after it is settled', async () => {
    const nothingYet = await activityForMonth(db, NOW);
    expect(nothingYet.filter((a: any) => a.title === 'Bell').length).toBe(0);

    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    const items = await activityForMonth(db, NOW);
    const bell = items.filter((a: any) => a.title === 'Bell');
    expect(bell.length).toBe(1);            // never two
    expect(bell[0].amount).toBe(117);
    expect(bell[0].direction).toBe('out');
  });

  it('the explanation reconciles exactly to the number it explains', async () => {
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    const ex = explainSafeToSpend(await buildFinanceInput(db, NOW));
    const sum = ex.lines.reduce((a: number, l: any) => a + l.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(ex.rawTotal);
    expect(ex.safeToSpend).toBe(883);
    // Bell appears under "already paid", not under "still owe" — never both.
    const paidLine: any = ex.lines.find((l: any) => l.key === 'billsPaid');
    const owedLine: any = ex.lines.find((l: any) => l.key === 'bills');
    expect(paidLine.amount).toBe(-117);
    expect(owedLine.amount).toBe(0);
  });
});

describe('A different amount flows through every screen', () => {
  it('Bell took $121.36 — the summary, the history and the plan all agree', async () => {
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 121.36);

    const s = await summary();
    expect(s.billsPaidTotal).toBe(121.36);
    expect(s.monthSpending).toBe(121.36);
    expect(s.safeToSpend).toBe(878.64);

    // What Happened shows what actually left, not what was planned.
    const items = await activityForMonth(db, NOW);
    expect((items.find((a: any) => a.title === 'Bell') as any).amount).toBe(121.36);

    // The recurring plan is untouched: next month expects $117 again.
    const bill: any = await db.getFirstAsync(`SELECT amount FROM bills WHERE id = 1`);
    expect(bill.amount).toBe(117);
  });
});

describe('A failed automatic payment', () => {
  it('stays owed everywhere, and never becomes spendable', async () => {
    await recordPayment(db, 'bill', 1, AUG28, 'failed');

    const s = await summary();
    expect(s.unpaidBillsTotal).toBe(117);     // still owed
    expect(s.billsPaidTotal).toBe(0);         // nothing left the account
    expect(s.safeToSpend).toBe(883);          // NOT 1000

    // And it is not in the history, because it did not happen.
    const items = await activityForMonth(db, NOW);
    expect(items.filter((a: any) => a.title === 'Bell').length).toBe(0);
  });

  it('recovering from failure lands in exactly one place', async () => {
    await recordPayment(db, 'bill', 1, AUG28, 'failed');
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);

    const s = await summary();
    expect(s.billsPaidTotal).toBe(117);
    expect(s.unpaidBillsTotal).toBe(0);
    expect(s.safeToSpend).toBe(883);
    const items = await activityForMonth(db, NOW);
    expect(items.filter((a: any) => a.title === 'Bell').length).toBe(1);
  });
});

describe('An assumed payment is money too', () => {
  it('costs the same as a confirmed one and appears once', async () => {
    await db.runAsync(`UPDATE bills SET auto_confirm = 1 WHERE id = 1`);
    expect(await settleAssumedPayments(db, NOW)).toBe(1);

    const s = await summary();
    expect(s.billsPaidTotal).toBe(117);
    expect(s.safeToSpend).toBe(883);          // unchanged by being assumed

    const items = await activityForMonth(db, NOW);
    expect(items.filter((a: any) => a.title === 'Bell').length).toBe(1);
  });

  it('opening the app repeatedly does not spend the money again', async () => {
    await db.runAsync(`UPDATE bills SET auto_confirm = 1 WHERE id = 1`);
    await settleAssumedPayments(db, NOW);
    await settleAssumedPayments(db, NOW);
    await settleAssumedPayments(db, NOW);

    const s = await summary();
    expect(s.billsPaidTotal).toBe(117);       // not 351
    expect(s.safeToSpend).toBe(883);
    expect((await activityForMonth(db, NOW)).filter((a: any) => a.title === 'Bell').length).toBe(1);
  });
});

describe('Subscriptions behave identically', () => {
  beforeEach(async () => {
    await db.runAsync(
      `INSERT INTO subscriptions (id, name, amount, billing_day, payment_method, auto_confirm)
       VALUES (1, 'Netflix', 23.99, 28, 'auto', 1)`);
  });

  it('a renewal is reserved, then settled, without changing the total', async () => {
    const before = await summary();
    expect(before.unpaidBillsTotal).toBe(140.99);          // 117 + 23.99
    expect(before.safeToSpend).toBe(859.01);

    await settleAssumedPayments(db, NOW);
    const after = await summary();
    expect(after.safeToSpend).toBe(859.01);                // THE INVARIANT
    // Only Netflix opted in, so only Netflix settles. Bell is auto-pay but the
    // person still wants to be asked, so it stays owed — and the TOTAL is
    // identical either way, which is the whole point.
    expect(after.billsPaidTotal).toBe(23.99);
    expect(after.unpaidBillsTotal).toBe(117);
  });

  it('a subscription and a bill with the same id never merge', async () => {
    await settleAssumedPayments(db, NOW);
    await recordPayment(db, 'bill', 1, AUG28, 'confirmed', 117);
    const items = await activityForMonth(db, NOW);
    expect(items.filter((a: any) => a.title === 'Bell').length).toBe(1);
    expect(items.filter((a: any) => a.title === 'Netflix').length).toBe(1);
    expect((items.find((a: any) => a.title === 'Netflix') as any).amount).toBe(23.99);
  });

  it('next month it renews again — the subscription did not disappear', async () => {
    await settleAssumedPayments(db, NOW);
    const september = computeFinanceSummary(
      await buildFinanceInput(db, new Date(2026, 8, 28)));
    expect(september.unpaidBillsTotal).toBe(140.99);       // owed again
    expect((await db.getAllAsync(`SELECT * FROM subscriptions`)).length).toBe(1);
  });
});
