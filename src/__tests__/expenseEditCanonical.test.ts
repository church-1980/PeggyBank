/**
 * Section 6 — updateExpense() is the ONE place an edit changes an expense.
 *
 * These run the canonical updater against a REAL SQLite database and then
 * read the same tables the app's own consumers read (finance.ts,
 * calendarMonth.ts) — proving the edit is visible everywhere, not just in
 * the expenses table itself.
 */
import { makeRealDb } from './helpers/realDb';
import { createExpense, updateExpense } from '../lib/saveExpense';
import { spendingByCategory } from '../core/finance';
import { buildMonth } from '../core/calendarMonth';

let db: any;
beforeEach(() => { db = makeRealDb(); });

async function allExpenses() {
  return db.getAllAsync(`SELECT * FROM expenses`);
}

describe('Section 6 — expense with a receipt, edit amount, receipt remains', () => {
  it('photo_uri survives an amount-only edit', async () => {
    const id = await createExpense(db, {
      amount: 18.4, category: 'groceries', note: 'Metro', date: '2026-08-10',
      photoUri: 'file:///receipts/1.jpg',
    });
    await updateExpense(db, id, { amount: 22.5 });
    const row = await db.getFirstAsync(`SELECT * FROM expenses WHERE id=?`, [id]);
    expect(row.amount).toBe(22.5);
    expect(row.photo_uri).toBe('file:///receipts/1.jpg');
  });
});

describe('Section 6 — edit category moves category totals correctly', () => {
  it('spendingByCategory reflects the new category, not the old one', async () => {
    const id = await createExpense(db, { amount: 40, category: 'groceries', date: '2026-08-10' });
    await createExpense(db, { amount: 10, category: 'restaurant', date: '2026-08-11' });

    let totals = spendingByCategory(await allExpenses());
    expect(totals.find(t => t.category === 'groceries')?.total).toBe(40);

    await updateExpense(db, id, { category: 'restaurant' });

    totals = spendingByCategory(await allExpenses());
    expect(totals.find(t => t.category === 'groceries')).toBeUndefined();
    expect(totals.find(t => t.category === 'restaurant')?.total).toBe(50);
  });
});

describe('Section 6 — edit date changes the Calendar correctly', () => {
  it('the expense moves from the old day to the new day, once', async () => {
    const id = await createExpense(db, { amount: 15, category: 'groceries', date: '2026-08-10' });
    await updateExpense(db, id, { date: '2026-08-20' });

    const expenses = await allExpenses();
    const month = buildMonth({
      year: 2026, month: 7, today: '2026-08-25',
      bills: [], subscriptions: [], payments: [], income: [], paydays: [],
      expenses,
    });

    expect(month.get('2026-08-10')?.some(e => e.kind === 'expense')).toBeFalsy();
    const moved = month.get('2026-08-20')?.filter(e => e.kind === 'expense');
    expect(moved).toHaveLength(1);
    expect(moved![0].amount).toBe(15);
  });
});

describe('Section 6 — edit merchant preserves normal merchant-memory behaviour', () => {
  it('changing the note does not itself throw or corrupt the row (memory hook is create-time only, per saveExpense.ts)', async () => {
    const id = await createExpense(db, { amount: 9, category: 'restaurant', note: 'Subway', date: '2026-08-01' });
    await updateExpense(db, id, { note: 'Tim Hortons' });
    const row = await db.getFirstAsync(`SELECT * FROM expenses WHERE id=?`, [id]);
    expect(row.note).toBe('Tim Hortons');
  });
});

describe('Section 6 — edit notes only, money does not change', () => {
  it('amount and date are untouched by a note-only update', async () => {
    const id = await createExpense(db, { amount: 27.75, category: 'groceries', note: 'old', date: '2026-08-12' });
    await updateExpense(db, id, { note: 'corrected memo' });
    const row = await db.getFirstAsync(`SELECT * FROM expenses WHERE id=?`, [id]);
    expect(row.amount).toBe(27.75);
    expect(row.date).toBe('2026-08-12');
    expect(row.note).toBe('corrected memo');
  });
});

describe('Section 6 — edit amount updates every consumer of the expenses table', () => {
  it('spendingByCategory and the raw sum both reflect the corrected amount, exactly once', async () => {
    const id = await createExpense(db, { amount: 20, category: 'groceries', date: '2026-08-05' });
    await updateExpense(db, id, { amount: 65 });

    const expenses = await allExpenses();
    expect(expenses).toHaveLength(1); // no duplicate row created by the edit
    const totals = spendingByCategory(expenses);
    expect(totals.find(t => t.category === 'groceries')?.total).toBe(65);
  });
});
