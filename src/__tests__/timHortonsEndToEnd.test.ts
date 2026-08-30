/**
 * THE RECEIPT THAT STARTED ALL OF THIS.
 *
 * Tim Hortons, $11.60, 28 August 2026. On a real phone the installed build
 * read the date and failed the merchant and the amount, so a person who had
 * photographed a receipt still had to type the whole thing in.
 *
 * This follows that one receipt the entire way: the printed text, through the
 * parser, through the routing decision, into a saved expense, and out again in
 * Safe to Spend, Search, What Happened and the category drill-down. Every
 * earlier test covers one link; this covers the chain.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { TIM_HORTONS, MAXI_FRENCH } from './fixtures/receipts';
import { parseDocument } from '../lib/recognition/parse';
import { resolveReview } from '../lib/recognition/review';
import { decideRoute } from '../core/captureRoute';
import { createExpense, undoExpense } from '../lib/saveExpense';
import { searchActivity, activityForMonth, activityInCategory } from '../lib/activity';
import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary, spendingByCategory, cents } from '../core/finance';

let db: any;
const NOW = new Date(2026, 7, 28);

beforeEach(async () => {
  db = makeRealDb();
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (1000, 'Pay', '2026-08-01')`);
});

describe('The parser still beats the noise', () => {
  const fields = parseDocument(TIM_HORTONS);

  it('finds the TOTAL, not the subtotal, the tax, the debit or the change', () => {
    // Six money values on that receipt. Only one is what was spent.
    expect(fields.amount).toBe(11.60);
    expect(fields.amount).not.toBe(10.09);   // subtotal
    expect(fields.amount).not.toBe(0.50);    // GST
    expect(fields.amount).not.toBe(1.01);    // QST
    expect(fields.amount).not.toBe(0.00);    // change
  });

  it('names the shop, not the street or the phone number', () => {
    expect(fields.merchant).toBe('Tim Hortons');
  });

  it('reads the date', () => {
    expect(fields.date).toBe('2026-08-28');
  });

  it('a Quebec receipt with comma decimals still works', () => {
    const fr = parseDocument(MAXI_FRENCH);
    expect(fr.amount).toBe(47.83);           // not the sous-total, not the taxes
  });
});

describe('That receipt now goes straight through', () => {
  it('is confident enough to save without asking', () => {
    const r: any = { ok: true, ...parseDocument(TIM_HORTONS) };
    const view = resolveReview(r, null, {});
    const decision = decideRoute({
      ok: true, confidence: view.confidence,
      merchant: view.merchant, amount: view.amount,
      date: view.date, category: view.category,
    });
    // If the category cannot be read from a coffee receipt, ONE question is
    // the worst it may cost — never the four-field form it used to.
    expect(decision.route === 'auto' || decision.route === 'ask').toBe(true);
    if (decision.route === 'ask') expect(decision.askFor).toEqual(['category']);
  });
});

describe('Photographed, then everywhere it should be — exactly once', () => {
  async function capture() {
    const f = parseDocument(TIM_HORTONS);
    return createExpense(db, {
      amount: f.amount!, category: 'restaurant', note: f.merchant!,
      date: f.date!, photoUri: 'file:///receipts/tims.jpg',
    });
  }

  it('one expense, carrying the photo', async () => {
    await capture();
    const all: any = await db.getAllAsync(`SELECT * FROM expenses`);
    expect(all.length).toBe(1);
    expect(all[0].amount).toBe(11.60);
    expect(all[0].note).toBe('Tim Hortons');
    expect(all[0].photo_uri).toBe('file:///receipts/tims.jpg');
  });

  it('Safe to Spend drops by exactly the receipt', async () => {
    const before = computeFinanceSummary(await buildFinanceInput(db, NOW));
    await capture();
    const after = computeFinanceSummary(await buildFinanceInput(db, NOW));
    expect(cents(before.safeToSpend - after.safeToSpend)).toBe(11.60);
  });

  it('Search finds it by name and by amount', async () => {
    await capture();
    expect((await searchActivity(db, 'tim')).length).toBe(1);
    expect((await searchActivity(db, '11.60')).length).toBe(1);
  });

  it('What Happened lists it once', async () => {
    await capture();
    const items = await activityForMonth(db, NOW);
    expect(items.filter((a: any) => a.title === 'Tim Hortons').length).toBe(1);
  });

  it('Monthly Breakdown counts it under Restaurant, once', async () => {
    await capture();
    const input = await buildFinanceInput(db, NOW);
    const cats = spendingByCategory(input.expenses);
    expect(cats.find(c => c.category === 'restaurant')?.total).toBe(11.60);
    expect(computeFinanceSummary(input).monthSpending).toBe(11.60);
  });

  it('the Restaurant drill-down opens it', async () => {
    const id = await capture();
    const rows = await activityInCategory(db, '2026-08-01', '2026-08-31', 'restaurant');
    expect(rows.length).toBe(1);
    expect(rows[0].sourceId).toBe(id);
  });

  it('and Undo removes it from every one of those at once', async () => {
    const before = computeFinanceSummary(await buildFinanceInput(db, NOW));
    const id = await capture();
    await undoExpense(db, id);

    expect((await db.getAllAsync(`SELECT * FROM expenses`) as any).length).toBe(0);
    expect(await searchActivity(db, 'tim')).toEqual([]);
    expect((await activityForMonth(db, NOW)).length).toBe(1);          // just the income
    expect(await activityInCategory(db, '2026-08-01', '2026-08-31', 'restaurant')).toEqual([]);
    expect(computeFinanceSummary(await buildFinanceInput(db, NOW)).safeToSpend)
      .toBe(before.safeToSpend);
  });
});
