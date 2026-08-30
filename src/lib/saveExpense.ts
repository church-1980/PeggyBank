import type { SQLiteDatabase } from 'expo-sqlite';
import { rememberMerchant } from './merchantMemory';

/**
 * WRITING ONE EXPENSE.
 *
 * Smart Capture can now save without the form, which means two places create
 * expenses. Two places creating expenses is two places to forget to remember
 * the merchant, or to write the photo, or to round the amount — so both go
 * through here.
 *
 * ONE PURCHASE, ONE ROW. The camera is an input method, not an accounting
 * system: there is no OCR record and no capture record, only the expense.
 */

export interface NewExpense {
  amount: number;
  category: string;
  /** The merchant, as the person would say it. Stored in `note`. */
  note?: string;
  /** Local YYYY-MM-DD. */
  date: string;
  photoUri?: string | null;
}

/**
 * Create the expense and return its id.
 *
 * The id matters: an automatic save has to be undoable and openable, and both
 * need to name the exact row rather than guess at "the most recent one" — which
 * would delete the wrong thing for anyone adding two expenses quickly.
 */
export async function createExpense(db: SQLiteDatabase, e: NewExpense): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO expenses (amount, category, note, date, photo_uri, is_recurring)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [e.amount, e.category, (e.note ?? '').trim(), e.date, e.photoUri ?? null]
  );

  // Learn the vendor from what was actually saved, so the next photo of it
  // fills itself in — and so a repeat visit can clear the category question.
  const name = (e.note ?? '').trim();
  if (name) {
    await rememberMerchant({
      db,
      name, docType: 'expense', recurring: false,
      amount: e.amount, category: e.category as any,
    }).catch(() => {});
  }

  return Number(result.lastInsertRowId);
}

/**
 * Remove an expense created moments ago.
 *
 * Undo deletes the ROW. It does not hide a banner and it does not write a
 * reversing entry — every view reads the expenses table, so removing the row
 * removes it from Safe to Spend, What Happened, Search, the category totals
 * and the breakdown at once, with nothing to keep in step.
 *
 * Merchant memory is deliberately left alone. It records that this person
 * shops at Tim Hortons, which stays true whether or not they kept this
 * particular receipt.
 */
export async function undoExpense(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
}
