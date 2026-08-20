import { localDateString, parseLocalDate } from '../core/datetime';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Payment state belongs to a BILLING OCCURRENCE, not to the recurring bill.
 *
 * The old model stored is_paid directly on the bill, which is a permanent
 * boolean: paying Bell in August left it marked paid in September, so it
 * vanished from what was owed, was excluded from Safe to Spend, and stopped
 * reminding — silently, and wrongly.
 *
 * A bill row is now the DEFINITION (name, amount, frequency, due day). A row in
 * bill_payments is one OCCURRENCE being paid, keyed by the date that occurrence
 * fell due. August and September are therefore independent, weekly bills are
 * independent week to week, and history stays true.
 */

export type BillSource = 'bill' | 'subscription';

export interface CycleBill {
  id: number;
  frequency?: string | null;
  due_day?: number | null;
  due_weekday?: number | null;
  billing_day?: number | null;
}

const iso = (d: Date) => localDateString(d);

/**
 * The date of the occurrence currently in play — the most recent due date that
 * has arrived, otherwise the one coming up this period. Paying "this month's"
 * bill on the 3rd when it is due on the 5th still belongs to this month.
 */
export function currentCycleDate(bill: CycleBill, ref: Date = new Date()): string {
  const weekly = bill.frequency === 'weekly' && bill.due_weekday != null;

  if (weekly) {
    // Start of the 7-day window containing ref, aligned to the due weekday.
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const delta = (d.getDay() - (bill.due_weekday as number) + 7) % 7;
    d.setDate(d.getDate() - delta);
    return iso(d);
  }

  const day = bill.due_day ?? bill.billing_day ?? 1;
  const safeDay = Math.min(Math.max(day, 1), 28); // valid in every month
  return iso(new Date(ref.getFullYear(), ref.getMonth(), safeDay));
}

/** The occurrence after the current one — used for "next due". */
export function nextCycleDate(bill: CycleBill, ref: Date = new Date()): string {
  // parseLocalDate, NOT new Date(string): a bare "YYYY-MM-DD" is parsed as UTC
  // midnight, which in Toronto is 8pm the PREVIOUS day. That used to be masked
  // by formatting the result back through UTC -- two bugs cancelling out, but
  // only in negative-offset timezones.
  const current = parseLocalDate(currentCycleDate(bill, ref));
  if (bill.frequency === 'weekly' && bill.due_weekday != null) {
    current.setDate(current.getDate() + 7);
  } else {
    current.setMonth(current.getMonth() + 1);
  }
  return iso(current);
}

/** Is this specific occurrence paid? */
export async function isCyclePaid(
  db: SQLiteDatabase, source: BillSource, billId: number, cycleDate: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ paid: number }>(
    `SELECT paid FROM bill_payments WHERE source = ? AND bill_id = ? AND cycle_date = ?`,
    [source, billId, cycleDate]
  );
  return !!row?.paid;
}

/** Mark one occurrence paid or unpaid. Other occurrences are untouched. */
export async function setCyclePaid(
  db: SQLiteDatabase, source: BillSource, billId: number,
  cycleDate: string, paid: boolean, amount?: number
): Promise<void> {
  if (paid) {
    await db.runAsync(
      `INSERT OR REPLACE INTO bill_payments (bill_id, source, cycle_date, paid, paid_at, amount)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [billId, source, cycleDate, new Date().toISOString(), amount ?? null]
    );
  } else {
    await db.runAsync(
      `DELETE FROM bill_payments WHERE source = ? AND bill_id = ? AND cycle_date = ?`,
      [source, billId, cycleDate]
    );
  }
}

/** Every occurrence paid for a given source, as a lookup of id -> cycle dates. */
export async function paidCyclesFor(
  db: SQLiteDatabase, source: BillSource
): Promise<Map<number, Set<string>>> {
  const rows = await db.getAllAsync<{ bill_id: number; cycle_date: string }>(
    `SELECT bill_id, cycle_date FROM bill_payments WHERE source = ? AND paid = 1`,
    [source]
  );
  const map = new Map<number, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.bill_id)) map.set(r.bill_id, new Set());
    map.get(r.bill_id)!.add(r.cycle_date);
  }
  return map;
}

/**
 * Total still owed for the CURRENT occurrence of every bill and subscription.
 * This is what Safe to Spend should deduct — not "every bill never marked paid".
 */
export async function unpaidTotalForCurrentCycles(
  db: SQLiteDatabase, ref: Date = new Date()
): Promise<number> {
  let total = 0;

  const bills = await db.getAllAsync<CycleBill & { amount: number }>(
    `SELECT id, amount, frequency, due_day, due_weekday FROM bills`
  );
  const paidBills = await paidCyclesFor(db, 'bill');
  for (const b of bills) {
    if (!paidBills.get(b.id)?.has(currentCycleDate(b, ref))) total += b.amount;
  }

  const subs = await db.getAllAsync<CycleBill & { amount: number }>(
    `SELECT id, amount, billing_day FROM subscriptions`
  );
  const paidSubs = await paidCyclesFor(db, 'subscription');
  for (const s of subs) {
    if (!paidSubs.get(s.id)?.has(currentCycleDate(s, ref))) total += s.amount;
  }

  return total;
}

/**
 * WHICH bills are still owed for their current occurrence.
 *
 * The sibling of unpaidTotalForCurrentCycles, for screens that need to list the
 * bills rather than just add them up. Both walk the same cycle logic, so a
 * screen's "coming up" list can never contradict the total it sits next to.
 */
export async function unpaidBillsForCurrentCycles(
  db: SQLiteDatabase, ref: Date = new Date()
): Promise<{ id: number; amount: number }[]> {
  const out: { id: number; amount: number }[] = [];

  const bills = await db.getAllAsync<CycleBill & { amount: number }>(
    `SELECT id, amount, frequency, due_day, due_weekday FROM bills`
  );
  const paidBills = await paidCyclesFor(db, 'bill');
  for (const b of bills) {
    if (!paidBills.get(b.id)?.has(currentCycleDate(b, ref))) out.push({ id: b.id, amount: b.amount });
  }

  return out;
}

/** Occurrences paid within a date range — for Monthly Breakdown. */
export async function paidInRange(
  db: SQLiteDatabase, start: string, end: string
): Promise<{ count: number; total: number }> {
  const row = await db.getFirstAsync<{ n: number; t: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS t
       FROM bill_payments
      WHERE paid = 1 AND cycle_date >= ? AND cycle_date <= ?`,
    [start, end]
  );
  return { count: row?.n ?? 0, total: row?.t ?? 0 };
}
