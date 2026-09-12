import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * WRITING ONE ACTUAL INCOME ROW.
 *
 * income_schedules (incomeSchedules.ts) owns the FORECAST — what to expect
 * and when. This owns the ACTUAL MONEY: one row, one real arrival.
 *
 * Before this file, three places independently decided schedule_id,
 * cycle_date, is_recurring and date for the same conceptual thing: Add
 * Income's one-off branch, Add Income's schedule-linked branch, and
 * Incomes' own undo-after-delete (which dropped schedule_id/cycle_date
 * entirely — a real bug, not a hypothetical one). confirmIncome() in
 * incomeSchedules.ts is the fourth; it now calls createIncome() too, so
 * every actual-income row in the app is written by the one INSERT below.
 */

export interface NewIncome {
  amount: number;
  /** Defaults to 'Income' if blank, matching every screen's prior behaviour. */
  label?: string;
  /** Local YYYY-MM-DD. */
  date: string;
  /** Set only when this income settles a schedule's occurrence. */
  scheduleId?: number | null;
  /** The occurrence date this settles — normally equal to `date`. */
  cycleDate?: string | null;
  isRecurring?: boolean;
}

/** Create one actual income row and return its id. */
export async function createIncome(db: SQLiteDatabase, income: NewIncome): Promise<number> {
  const label = (income.label ?? '').trim() || 'Income';
  const result = await db.runAsync(
    `INSERT INTO income (amount, label, date, is_recurring, schedule_id, cycle_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [income.amount, label, income.date, income.isRecurring ? 1 : 0, income.scheduleId ?? null, income.cycleDate ?? null]
  );
  return Number(result.lastInsertRowId);
}

/**
 * Correct an existing income row. Deliberately narrow: amount, label and
 * date are a person's own correction of what they entered. schedule_id,
 * cycle_date and is_recurring are occurrence IDENTITY, not something a
 * screen edit should ever be able to change — there is no "edit which
 * schedule this settles" feature, and there should not quietly become one
 * just because this function could technically allow it.
 */
export async function updateIncome(
  db: SQLiteDatabase, id: number,
  changes: Partial<Pick<NewIncome, 'amount' | 'label' | 'date'>>
): Promise<void> {
  const allowed = ['amount', 'label', 'date'] as const;
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      sets.push(key + ' = ?');
      args.push(changes[key]);
    }
  }
  if (!sets.length) return; // nothing asked for, nothing touched
  args.push(id);
  await db.runAsync(`UPDATE income SET ${sets.join(', ')} WHERE id = ?`, args as never[]);
}

/** Remove an actual income row. */
export async function deleteIncome(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(`DELETE FROM income WHERE id = ?`, [id]);
}

/**
 * Undo AFTER a delete: put the exact row back, not a new one that merely
 * looks the same. Restores every column of the row the caller captured via
 * SELECT * before deleting it (id included), dynamically — the same
 * pattern as saveExpense.ts's restoreExpense() and GoalsScreen's full-row
 * undo, for the same reason: a hand-written column list is how a column
 * (schedule_id, cycle_date, is_recurring — the exact ones that went
 * missing) gets silently dropped the next time someone touches this code.
 */
export async function restoreIncome(db: SQLiteDatabase, row: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(row);
  await db.runAsync(
    `INSERT INTO income (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map(c => row[c] ?? null) as never[]
  );
}
