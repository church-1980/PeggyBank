import type { SQLiteDatabase } from 'expo-sqlite';
import { rememberMerchant } from './merchantMemory';
import { isOwnedReceipt, deleteReceiptImage } from './receiptStorage';

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
  /** Defaults false. Smart Capture never sets this — a photographed expense is a one-off. */
  isRecurring?: boolean;
}

/**
 * Create the expense and return its id.
 *
 * The id matters: an automatic save has to be undoable and openable, and both
 * need to name the exact row rather than guess at "the most recent one" — which
 * would delete the wrong thing for anyone adding two expenses quickly.
 *
 * D7 — THE canonical creator. Add Expense's own save button now calls this
 * too, instead of an independent INSERT with the same six columns: two
 * places creating an expense is two places for a column, a default or the
 * merchant-memory hook to quietly drift apart, the exact risk this repair
 * pass exists to close.
 */
export async function createExpense(db: SQLiteDatabase, e: NewExpense): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO expenses (amount, category, note, date, photo_uri, is_recurring)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [e.amount, e.category, (e.note ?? '').trim(), e.date, e.photoUri ?? null, e.isRecurring ? 1 : 0]
  );

  // Learn the vendor from what was actually saved, so the next photo of it
  // fills itself in — and so a repeat visit can clear the category question.
  const name = (e.note ?? '').trim();
  if (name) {
    await rememberMerchant({
      db,
      name, docType: 'expense', recurring: !!e.isRecurring,
      amount: e.amount, category: e.category as any,
    }).catch(() => {});
  }

  return Number(result.lastInsertRowId);
}

/**
 * REMOVE AN EXPENSE. THE ONE PLACE THAT DOES IT.
 *
 * Deleting is the sharpest test of whether PeggyBank has one financial brain,
 * so it is deliberately not clever: it removes the ROW. It does not hide a
 * card, zero an amount, set a flag, or write a reversing entry. Every view —
 * Safe to Spend, Money Out, What Happened, the Calendar, Search, the category
 * totals, the breakdown, the CSV and the backup — reads the expenses table, so
 * the row leaving is the only event any of them need.
 *
 * If this function ever grows a list of screens to notify, the architecture
 * has drifted and the notification is the wrong fix.
 *
 * Merchant memory is deliberately left alone: it records that this person
 * shops at Tim Hortons, which stays true whether or not they kept this
 * particular receipt.
 *
 * THE PHOTO. A receipt image is owned by exactly one expense — every accepted
 * capture is copied to a uniquely named file — so deleting the expense should
 * take the image with it rather than leaving it on the phone forever. But
 * "should" is not "must be assumed": the file is only removed once nothing
 * else in the database still points at it, and only when it lives inside
 * PeggyBank's own receipts folder. A gallery picture the person chose is never
 * touched.
 */
export async function deleteExpense(db: SQLiteDatabase, id: number): Promise<void> {
  const row = await db.getFirstAsync<{ photo_uri: string | null }>(
    `SELECT photo_uri FROM expenses WHERE id = ?`, [id],
  );

  // The row goes first. If this throws, nothing has been lost and the caller
  // reports a failure rather than a success.
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);

  const uri = row?.photo_uri ?? null;
  if (!isOwnedReceipt(uri)) return;

  try {
    const stillUsed = await db.getFirstAsync<{ n: number }>(
      `SELECT
         (SELECT COUNT(*) FROM expenses WHERE photo_uri = ?) +
         (SELECT COUNT(*) FROM bills    WHERE photo_uri = ?) AS n`,
      [uri, uri],
    );
    if ((stillUsed?.n ?? 0) === 0) await deleteReceiptImage(uri);
  } catch {
    // An orphaned image costs storage. Failing the delete over it would cost
    // the person their correction, which is worse.
  }
}

/**
 * Undo a save made moments ago. The same deletion — undo is not a second
 * concept, and giving it its own implementation is how the two drift apart.
 */
export async function undoExpense(db: SQLiteDatabase, id: number): Promise<void> {
  await deleteExpense(db, id);
}

/**
 * D7 — undo AFTER a delete: put the exact row back, not a new one that
 * merely looks the same.
 *
 * Deliberately NOT createExpense(): that function generates fresh
 * merchant-memory side effects and is for a NEW purchase, not the same one
 * coming back. Restoring puts back every column of the row the caller
 * captured before deleting it (via SELECT *) — id included, so nothing else
 * that could reference it is orphaned — dynamically, the same reasoning as
 * the savings-goal undo fix: a hand-written column list is how a column
 * gets silently dropped the next time the schema grows.
 */
export async function restoreExpense(db: SQLiteDatabase, row: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(row);
  await db.runAsync(
    `INSERT INTO expenses (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map(c => row[c] ?? null) as never[]
  );
}
