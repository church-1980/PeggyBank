/**
 * D7 — canonical expense creation.
 *
 * Deletion already had one canonical path (deleteExpense in saveExpense.ts,
 * "THE ONE PLACE THAT DOES IT"). Creation did not: AddExpenseScreen ran its
 * own independent INSERT with the same six columns as createExpense(), and
 * ExpensesScreen's undo-after-delete ran a THIRD, hand-written INSERT.
 * Currently in agreement is not the same as structurally unable to drift —
 * the same duplication-risk class already pinned elsewhere in this codebase
 * (unpaidBillsAgreement.test.ts).
 *
 * AddExpenseScreen's create branch now calls createExpense() directly.
 * ExpensesScreen's undo now calls a dedicated restoreExpense() — not
 * createExpense(), because undo must not generate a fresh merchant-memory
 * side effect for a purchase that already happened once.
 */
import { makeRealDb } from './helpers/realDb';
import { createExpense, restoreExpense, deleteExpense } from '../lib/saveExpense';

let db: any;
beforeEach(() => { db = makeRealDb(); });

describe('D7 — one creator for every entry point', () => {
  it('Add Expense and Smart Capture produce byte-identical rows for identical input', async () => {
    // Add Expense's call shape (screens/AddExpenseScreen.tsx handleSave).
    const addExpenseId = await createExpense(db, {
      amount: 42.55, category: 'groceries', note: 'Metro', date: '2026-08-01',
      photoUri: null, isRecurring: false,
    });
    // Smart Capture's call shape (screens/QuickCaptureScreen.tsx) — same
    // function, same fields it actually passes.
    const smartCaptureId = await createExpense(db, {
      amount: 42.55, category: 'groceries', note: 'Metro', date: '2026-08-01',
      photoUri: null,
    });

    const [a, b] = await Promise.all([
      db.getFirstAsync(`SELECT amount, category, note, date, photo_uri, is_recurring FROM expenses WHERE id=?`, [addExpenseId]),
      db.getFirstAsync(`SELECT amount, category, note, date, photo_uri, is_recurring FROM expenses WHERE id=?`, [smartCaptureId]),
    ]);
    expect(a).toEqual(b);
  });

  it('the recurring flag set in Add Expense reaches merchant memory (not hardcoded false)', async () => {
    await createExpense(db, {
      amount: 89.99, category: 'home', note: 'Bell', date: '2026-08-01', isRecurring: true,
    });
    const remembered = await db.getFirstAsync(`SELECT recurring FROM merchant_memory WHERE name_key='bell'`);
    expect(remembered.recurring).toBe(1); // not silently forced to false
  });
});

describe('D7 — undo restores the exact row, not a new one', () => {
  it('restoreExpense puts back every column, including the original id', async () => {
    const id = await createExpense(db, {
      amount: 12.34, category: 'restaurant', note: 'Boston Pizza', date: '2026-08-05',
      photoUri: 'file:///receipts/a.jpg', isRecurring: true,
    });
    const before = await db.getFirstAsync(`SELECT * FROM expenses WHERE id=?`, [id]);

    await deleteExpense(db, id);
    expect(await db.getAllAsync(`SELECT * FROM expenses`)).toHaveLength(0);

    await restoreExpense(db, before);

    const after = await db.getFirstAsync(`SELECT * FROM expenses WHERE id=?`, [id]);
    expect(after).toEqual(before); // same id, same everything
  });

  it('does not create a second merchant-memory entry for the same restore', async () => {
    const id = await createExpense(db, { amount: 12.34, category: 'restaurant', note: 'Boston Pizza', date: '2026-08-05' });
    const before = await db.getFirstAsync(`SELECT * FROM expenses WHERE id=?`, [id]);
    const seenBefore = (await db.getFirstAsync(`SELECT times_seen FROM merchant_memory WHERE name_key='boston pizza'`)).times_seen;

    await deleteExpense(db, id);
    await restoreExpense(db, before);

    const seenAfter = (await db.getFirstAsync(`SELECT times_seen FROM merchant_memory WHERE name_key='boston pizza'`)).times_seen;
    expect(seenAfter).toBe(seenBefore); // restoreExpense does not re-learn the vendor
  });
});
