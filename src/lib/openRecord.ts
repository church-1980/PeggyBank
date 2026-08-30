import type { SQLiteDatabase } from 'expo-sqlite';
import type { ActivityItem } from './activity';

/**
 * OPEN THE REAL THING.
 *
 * Every money view — What Happened, Search, and anything later — shows rows
 * that stand for an authoritative record somewhere else. Tapping one must open
 * THAT record, not a copy of it, so an edit lands in the one place the rest of
 * the app reads from.
 *
 * This lives here rather than in a screen because two screens needing the same
 * answer is exactly how two answers get written. The person never needs to know
 * which table owns their coffee; PeggyBank works it out.
 */
export async function openActivityRecord(
  db: SQLiteDatabase,
  item: ActivityItem,
  navigate: (screen: string, params?: object) => void,
): Promise<void> {
  try {
    if (item.source === 'expense') {
      const row = await db.getFirstAsync<any>(`SELECT * FROM expenses WHERE id = ?`, [item.sourceId]);
      if (row) navigate('AddExpense', { ...row });
      return;
    }
    if (item.source === 'income') {
      const row = await db.getFirstAsync<any>(`SELECT * FROM income WHERE id = ?`, [item.sourceId]);
      if (row) navigate('AddIncome', { ...row });
      return;
    }
    // A bill or subscription payment belongs to its recurring item, which is
    // where the payment history and the paid state live.
    navigate('Bills');
  } catch {
    // Leaving someone where they are beats crashing them out of the app.
  }
}
