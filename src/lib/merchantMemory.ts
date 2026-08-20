import { localDateString } from '../core/datetime';
import { getDatabase } from '../database/database';

/**
 * What the camera has learned about the vendors you actually use.
 *
 * The built-in recogniser only knows a handful of big Canadian billers. This is
 * the part that learns YOUR vendors: every time a photographed document is
 * saved, the merchant is recorded with how you filed it. The next photo of that
 * vendor is then filled in from your own history rather than guesswork —
 * including vendors the built-in list has never heard of.
 */

export interface MerchantMemory {
  nameKey:     string;
  displayName: string;
  docType:     'bill' | 'expense';
  category?:   string;
  recurring:   boolean;
  lastAmount?: number;
  avgAmount?:  number;
  dueDay?:     number;
  timesSeen:   number;
  lastSeen?:   string;
}

/**
 * Normalise a merchant name so "BELL CANADA #4821" and "Bell Canada" match.
 * Strips punctuation, store/invoice numbers, and collapses whitespace.
 */
export function merchantKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[#*]\s*\d+/g, ' ')        // store / invoice numbers
    .replace(/\b\d{4,}\b/g, ' ')        // long digit runs (account numbers)
    .replace(/[^a-z0-9\s]/g, ' ')       // punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/** Look up what we already know about a merchant. */
export async function recallMerchant(name?: string): Promise<MerchantMemory | null> {
  if (!name || !name.trim()) return null;
  const key = merchantKey(name);
  if (!key) return null;
  try {
    const db = await getDatabase();
    let row = await db.getFirstAsync<any>(
      `SELECT * FROM merchant_memory WHERE name_key = ?`, [key]
    );
    // Fall back to a prefix match so "bell canada" still finds "bell".
    if (!row) {
      row = await db.getFirstAsync<any>(
        `SELECT * FROM merchant_memory
          WHERE ? LIKE name_key || '%' OR name_key LIKE ? || '%'
          ORDER BY times_seen DESC LIMIT 1`,
        [key, key]
      );
    }
    if (!row) return null;
    return {
      nameKey:     row.name_key,
      displayName: row.display_name,
      docType:     row.doc_type,
      category:    row.category ?? undefined,
      recurring:   !!row.recurring,
      lastAmount:  row.last_amount ?? undefined,
      avgAmount:   row.avg_amount ?? undefined,
      dueDay:      row.due_day ?? undefined,
      timesSeen:   row.times_seen ?? 1,
      lastSeen:    row.last_seen ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Record how a document was actually filed. Called after a save, so what gets
 * learned is what YOU confirmed — not what the OCR guessed.
 */
export async function rememberMerchant(input: {
  name: string;
  docType: 'bill' | 'expense';
  category?: string;
  recurring?: boolean;
  amount?: number;
  dueDay?: number;
}): Promise<void> {
  const key = merchantKey(input.name);
  if (!key) return;
  try {
    const db = await getDatabase();
    const today = localDateString(new Date());
    const prev = await db.getFirstAsync<any>(
      `SELECT times_seen, avg_amount FROM merchant_memory WHERE name_key = ?`, [key]
    );

    if (prev) {
      const seen = (prev.times_seen ?? 1) + 1;
      // Running average, so "what you usually pay" settles over time.
      const avg = input.amount != null
        ? ((prev.avg_amount ?? input.amount) * (seen - 1) + input.amount) / seen
        : prev.avg_amount;
      await db.runAsync(
        `UPDATE merchant_memory
            SET display_name = ?, doc_type = ?, category = COALESCE(?, category),
                recurring = ?, last_amount = COALESCE(?, last_amount),
                avg_amount = ?, due_day = COALESCE(?, due_day),
                times_seen = ?, last_seen = ?
          WHERE name_key = ?`,
        [
          input.name.trim(), input.docType, input.category ?? null,
          input.recurring ? 1 : 0, input.amount ?? null, avg ?? null,
          input.dueDay ?? null, seen, today, key,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO merchant_memory
           (name_key, display_name, doc_type, category, recurring,
            last_amount, avg_amount, due_day, times_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          key, input.name.trim(), input.docType, input.category ?? null,
          input.recurring ? 1 : 0, input.amount ?? null, input.amount ?? null,
          input.dueDay ?? null, today,
        ]
      );
    }
  } catch {
    // Learning is a convenience — never block a save because of it.
  }
}

/** Everything learned so far, most-used first (for a future "known vendors" screen). */
export async function allMerchants(): Promise<MerchantMemory[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM merchant_memory ORDER BY times_seen DESC, display_name ASC`
    );
    return rows.map((row) => ({
      nameKey: row.name_key, displayName: row.display_name, docType: row.doc_type,
      category: row.category ?? undefined, recurring: !!row.recurring,
      lastAmount: row.last_amount ?? undefined, avgAmount: row.avg_amount ?? undefined,
      dueDay: row.due_day ?? undefined, timesSeen: row.times_seen ?? 1,
      lastSeen: row.last_seen ?? undefined,
    }));
  } catch {
    return [];
  }
}
