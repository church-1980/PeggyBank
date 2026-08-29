/**
 * THE CHART AND THE SCREEN MUST AGREE — against a REAL database.
 *
 * spendingChart.test.ts proves the slicing arithmetic. This proves the thing
 * that actually reaches the phone: real rows, read by the real loader, sliced
 * the way Monthly Breakdown slices them, still adding up to the "Money out"
 * the screen prints above the chart.
 *
 * It also guards the two features this work sits on top of. An auto-pay bill
 * must appear once and only once, and a receipt photographed through Smart
 * Capture is an ordinary expense with no chart logic of its own.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary, spendingByCategory, cents } from '../core/finance';
import { buildSegments, BILLS_KEY, type ChartSegment } from '../core/spendingChart';
import { recordPayment, settleAssumedPayments } from '../lib/billCycles';

let db: any;
const NOW = new Date(2026, 7, 28);            // 28 August 2026

beforeEach(() => { db = makeRealDb(); });

/** Exactly what MonthlyBreakdownScreen does: one read, then slice it. */
async function screenChart(when: Date = NOW) {
  const input = await buildFinanceInput(db, when);
  const finance = computeFinanceSummary(input);
  const categories = spendingByCategory(input.expenses);
  const segments = buildSegments({
    moneyOut: finance.monthSpending,
    billsPaid: finance.billsPaidTotal,
    categories,
    meta: (k) => ({ label: k, color: '#000' }),
    billsColor: '#FF6B6B', otherColor: '#8B8FA8',
  });
  return { finance, segments };
}

const sumOf = (segs: ChartSegment[]) => cents(segs.reduce((s, x) => s + x.amount, 0));

const addExpense = (amount: number, category: string, date = '2026-08-10', note = '') =>
  db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)`,
    [amount, category, note, date]);

const addBill = (id: number, name: string, amount: number, over: Record<string, unknown> = {}) =>
  db.runAsync(
    `INSERT INTO bills (id, name, amount, frequency, due_day, payment_method, auto_confirm)
     VALUES (?, ?, ?, 'monthly', 28, ?, ?)`,
    [id, name, amount, over.payment_method ?? 'manual', over.auto_confirm ?? 0]);

describe('The chart reconciles with the screen, on real data', () => {
  it('a mixed month adds up exactly', async () => {
    await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (2000, 'Pay', '2026-08-01')`);
    await addExpense(195.65, 'groceries');
    await addExpense(117.27, 'restaurant');
    await addExpense(78.18, 'gas');
    await addBill(1, 'Bell', 351.10);
    await recordPayment(db, 'bill', 1, '2026-08-28', 'confirmed', 351.10);

    const { finance, segments } = await screenChart();
    expect(sumOf(segments)).toBe(finance.monthSpending);
    expect(finance.monthSpending).toBe(742.20);
  });

  it('bills only — everyday spending zero', async () => {
    await addBill(1, 'Rent', 781.78);
    await recordPayment(db, 'bill', 1, '2026-08-28', 'confirmed', 781.78);

    const { finance, segments } = await screenChart();
    expect(finance.everydaySpending).toBe(0);
    expect(sumOf(segments)).toBe(finance.monthSpending);
    expect(segments.length).toBe(1);
    expect(segments[0].key).toBe(BILLS_KEY);
  });

  it('everyday spending only — no bills paid', async () => {
    await addExpense(50, 'groceries');
    await addExpense(30, 'fun');

    const { finance, segments } = await screenChart();
    expect(finance.billsPaidTotal).toBe(0);
    expect(sumOf(segments)).toBe(finance.monthSpending);
    expect(segments.some(s => s.key === BILLS_KEY)).toBe(false);
  });

  it('a month with nothing in it draws nothing', async () => {
    const { finance, segments } = await screenChart();
    expect(finance.monthSpending).toBe(0);
    expect(segments).toEqual([]);
  });

  it('an UNPAID bill is not spending, and is not in the chart', async () => {
    // It is money still owed. It has not left the account, so it cannot be
    // part of "where the money went".
    await addBill(1, 'Hydro', 200);
    await addExpense(50, 'groceries');

    const { finance, segments } = await screenChart();
    expect(finance.monthSpending).toBe(50);
    expect(sumOf(segments)).toBe(50);
    expect(segments.some(s => s.key === BILLS_KEY)).toBe(false);
  });
});

describe('The auto-pay work still holds', () => {
  it('a confirmed auto-payment appears ONCE, not twice', async () => {
    await addBill(1, 'Bell', 117, { payment_method: 'auto' });
    await recordPayment(db, 'bill', 1, '2026-08-28', 'confirmed', 117);
    await addExpense(50, 'groceries');

    const { finance, segments } = await screenChart();
    const bills = segments.filter(s => s.key === BILLS_KEY);
    expect(bills.length).toBe(1);
    expect(bills[0].amount).toBe(117);
    expect(sumOf(segments)).toBe(finance.monthSpending);
    expect(finance.monthSpending).toBe(167);
  });

  it('an EXPECTED auto-payment nobody has confirmed is not shown as spent', async () => {
    // The date has passed, but PeggyBank has seen no bank. It has not become
    // money out, so it must not appear in "where the money went".
    await addBill(1, 'Bell', 117, { payment_method: 'auto' });
    await addExpense(50, 'groceries');

    const { finance, segments } = await screenChart();
    expect(finance.billsPaidTotal).toBe(0);
    expect(segments.some(s => s.key === BILLS_KEY)).toBe(false);
    expect(sumOf(segments)).toBe(50);
  });

  it('a FAILED auto-payment is not spending either', async () => {
    await addBill(1, 'Bell', 117, { payment_method: 'auto' });
    await recordPayment(db, 'bill', 1, '2026-08-28', 'failed');
    await addExpense(50, 'groceries');

    const { segments } = await screenChart();
    expect(segments.some(s => s.key === BILLS_KEY)).toBe(false);
    expect(sumOf(segments)).toBe(50);
  });

  it('an ASSUMED payment is spending, once', async () => {
    await addBill(1, 'Bell', 117, { payment_method: 'auto', auto_confirm: 1 });
    await settleAssumedPayments(db, NOW);

    const { finance, segments } = await screenChart();
    expect(segments.filter(s => s.key === BILLS_KEY).length).toBe(1);
    expect(sumOf(segments)).toBe(finance.monthSpending);
    expect(finance.monthSpending).toBe(117);
  });

  it('the ACTUAL amount is charted, not the planned one', async () => {
    // Bell planned $117 and took $121.36. The chart shows what really left.
    await addBill(1, 'Bell', 117, { payment_method: 'auto' });
    await recordPayment(db, 'bill', 1, '2026-08-28', 'confirmed', 121.36);

    const { finance, segments } = await screenChart();
    expect(segments.find(s => s.key === BILLS_KEY)!.amount).toBe(121.36);
    expect(sumOf(segments)).toBe(finance.monthSpending);
  });

  it('opening the app repeatedly does not inflate the chart', async () => {
    await addBill(1, 'Bell', 117, { payment_method: 'auto', auto_confirm: 1 });
    await settleAssumedPayments(db, NOW);
    await settleAssumedPayments(db, NOW);
    await settleAssumedPayments(db, NOW);

    const { segments } = await screenChart();
    expect(sumOf(segments)).toBe(117);      // not 351
  });
});

describe('Smart Capture needs no chart logic of its own', () => {
  it('a photographed Tim Hortons receipt is just an expense in Restaurant', async () => {
    await db.runAsync(
      `INSERT INTO expenses (amount, category, note, date, photo_uri)
       VALUES (11.60, 'restaurant', 'Tim Hortons', '2026-08-28', 'file:///receipts/tims.jpg')`);
    await addExpense(50, 'groceries');

    const { finance, segments } = await screenChart();
    const rest = segments.find(s => s.key === 'restaurant');
    expect(rest!.amount).toBe(11.60);
    expect(sumOf(segments)).toBe(finance.monthSpending);
    expect(finance.monthSpending).toBe(61.60);
  });

  it('it is counted exactly once, photo or no photo', async () => {
    await db.runAsync(
      `INSERT INTO expenses (amount, category, note, date, photo_uri)
       VALUES (11.60, 'restaurant', 'Tim Hortons', '2026-08-28', 'file:///receipts/tims.jpg')`);
    const { segments } = await screenChart();
    expect(segments.filter(s => s.key === 'restaurant').length).toBe(1);
    expect(sumOf(segments)).toBe(11.60);
  });
});

describe('The chart follows the month you are looking at', () => {
  beforeEach(async () => {
    await addExpense(100, 'groceries', '2026-07-10');    // July
    await addExpense(60, 'fun',        '2026-07-12');
    await addExpense(200, 'groceries', '2026-08-10');    // August
  });

  it('August shows August', async () => {
    const { finance, segments } = await screenChart(NOW);
    expect(finance.monthSpending).toBe(200);
    expect(sumOf(segments)).toBe(200);
    expect(segments.length).toBe(1);
  });

  it('stepping back to July shows July', async () => {
    const { finance, segments } = await screenChart(new Date(2026, 6, 15));
    expect(finance.monthSpending).toBe(160);
    expect(sumOf(segments)).toBe(160);
    expect(segments.length).toBe(2);
  });

  it('a past month does not change when a new expense lands today', async () => {
    const before = await screenChart(new Date(2026, 6, 15));
    await addExpense(999, 'shopping', '2026-08-29');
    const after = await screenChart(new Date(2026, 6, 15));
    expect(after.segments).toEqual(before.segments);
  });

  it('reading the same month twice gives the same answer', async () => {
    const a = await screenChart(NOW);
    const b = await screenChart(NOW);
    expect(b.segments).toEqual(a.segments);
    expect(b.finance.monthSpending).toBe(a.finance.monthSpending);
  });
});

describe('The chart keeps up as the month is edited', () => {
  it('adding an expense grows its slice and the total together', async () => {
    await addExpense(100, 'groceries');
    const before = await screenChart();
    await addExpense(25, 'groceries');
    const after = await screenChart();

    expect(after.finance.monthSpending).toBe(125);
    expect(sumOf(after.segments)).toBe(after.finance.monthSpending);
    expect(after.segments[0].amount).toBe(before.segments[0].amount + 25);
  });

  it('editing an amount is reflected, and still reconciles', async () => {
    await addExpense(100, 'groceries');
    await db.runAsync(`UPDATE expenses SET amount = 140 WHERE category = 'groceries'`);
    const { finance, segments } = await screenChart();
    expect(segments[0].amount).toBe(140);
    expect(sumOf(segments)).toBe(finance.monthSpending);
  });

  it('changing an expense’s category moves the money between slices', async () => {
    await addExpense(100, 'groceries');
    await addExpense(50, 'fun');
    await db.runAsync(`UPDATE expenses SET category = 'fun' WHERE category = 'groceries'`);

    const { finance, segments } = await screenChart();
    expect(segments.length).toBe(1);
    expect(segments[0].key).toBe('fun');
    expect(segments[0].amount).toBe(150);
    expect(sumOf(segments)).toBe(finance.monthSpending);
  });

  it('deleting an expense removes it from the chart and the total', async () => {
    await addExpense(100, 'groceries');
    await addExpense(50, 'fun');
    await db.runAsync(`DELETE FROM expenses WHERE category = 'fun'`);

    const { finance, segments } = await screenChart();
    expect(finance.monthSpending).toBe(100);
    expect(sumOf(segments)).toBe(100);
    expect(segments.some(s => s.key === 'fun')).toBe(false);
  });

  it('paying a bill moves money into the chart without changing what is owed twice', async () => {
    await addBill(1, 'Bell', 117);
    await addExpense(50, 'groceries');

    const before = await screenChart();
    expect(before.finance.monthSpending).toBe(50);

    await recordPayment(db, 'bill', 1, '2026-08-28', 'confirmed', 117);
    const after = await screenChart();

    expect(after.finance.monthSpending).toBe(167);
    expect(sumOf(after.segments)).toBe(167);
    // And Safe to Spend is unmoved by the payment, as the auto-pay work proved.
    expect(after.finance.safeToSpend).toBe(before.finance.safeToSpend);
  });
});
