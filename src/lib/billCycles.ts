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

/**
 * ── PAYMENT METHOD & VERIFICATION ─────────────────────────────────────────
 *
 * Everything below writes to the SAME bill_payments table as marking a bill
 * paid by hand. There is no second recurring-payment system and no second
 * ledger: an automatic payment and a manual one produce the same kind of row.
 * Only `status` records how we came to believe it.
 */

import type { PaymentMethod, PaymentStatus, OccurrencePayment } from '../core/paymentState';

/** One occurrence's payment row, or null when nothing has been recorded. */
export async function paymentForCycle(
  db: SQLiteDatabase, source: BillSource, billId: number, cycleDate: string
): Promise<OccurrencePayment | null> {
  const row = await db.getFirstAsync<{ paid: number; status: string | null; amount: number | null }>(
    `SELECT paid, status, amount FROM bill_payments
      WHERE source = ? AND bill_id = ? AND cycle_date = ?`,
    [source, billId, cycleDate]
  );
  if (!row) return null;
  return { paid: !!row.paid, status: (row.status as PaymentStatus) ?? 'confirmed', amount: row.amount };
}

/** Every payment row for a source, keyed "billId|cycleDate". Powers list screens. */
export async function paymentsFor(
  db: SQLiteDatabase, source: BillSource
): Promise<Map<string, OccurrencePayment>> {
  const rows = await db.getAllAsync<{ bill_id: number; cycle_date: string; paid: number; status: string | null; amount: number | null }>(
    `SELECT bill_id, cycle_date, paid, status, amount FROM bill_payments WHERE source = ?`,
    [source]
  );
  const map = new Map<string, OccurrencePayment>();
  for (const r of rows) {
    map.set(r.bill_id + '|' + r.cycle_date, {
      paid: !!r.paid,
      status: (r.status as PaymentStatus) ?? 'confirmed',
      amount: r.amount,
    });
  }
  return map;
}

/**
 * Record what happened to ONE occurrence.
 *
 * `amount` is what ACTUALLY left the account. Bell planned $117 and took
 * $121.36? That $121.36 belongs to this occurrence only — the bill's own
 * amount is the PLAN and is deliberately not touched here. One occurrence and
 * the future schedule are different things, and a single surprising month must
 * not silently rewrite every month to come.
 */
export async function recordPayment(
  db: SQLiteDatabase, source: BillSource, billId: number, cycleDate: string,
  status: PaymentStatus, amount?: number | null
): Promise<void> {
  const paid = status === 'failed' ? 0 : 1;
  await db.runAsync(
    `INSERT OR REPLACE INTO bill_payments (bill_id, source, cycle_date, paid, paid_at, amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [billId, source, cycleDate, paid, new Date().toISOString(), amount ?? null, status]
  );
}

/**
 * Undo any record for an occurrence, returning it to simply owed.
 * Used when the user un-ticks a bill they ticked by mistake.
 */
export async function clearPayment(
  db: SQLiteDatabase, source: BillSource, billId: number, cycleDate: string
): Promise<void> {
  await db.runAsync(
    `DELETE FROM bill_payments WHERE source = ? AND bill_id = ? AND cycle_date = ?`,
    [source, billId, cycleDate]
  );
}

/**
 * For bills the user has explicitly asked us to stop asking about: once the
 * date has passed, record the expected payment as ASSUMED.
 *
 * Only ever runs for auto_confirm = 1, which is off until the user turns it on.
 * Idempotent — UNIQUE(source, bill_id, cycle_date) means running it twice
 * cannot produce two rows, and an occurrence the user has already answered for
 * is left exactly as they left it.
 *
 * This does not change how much money is accounted for. The occurrence moves
 * from "still owed" to "already gone", and it is subtracted once either way.
 */
export async function settleAssumedPayments(
  db: SQLiteDatabase, ref: Date = new Date()
): Promise<number> {
  const today = iso(ref);
  let settled = 0;

  const run = async (source: BillSource, sql: string) => {
    const rows = await db.getAllAsync<CycleBill & { amount: number; auto_confirm: number; payment_method: string }>(sql)
      .catch(() => [] as any[]);
    for (const b of rows) {
      if (b.payment_method !== 'auto' || !b.auto_confirm) continue;
      const cycle = currentCycleDate(b, ref);
      if (cycle > today) continue;                       // not due yet
      const existing = await paymentForCycle(db, source, b.id, cycle);
      if (existing) continue;                            // the user already answered
      await recordPayment(db, source, b.id, cycle, 'assumed', b.amount);
      settled++;
    }
  };

  await run('bill', `SELECT id, amount, frequency, due_day, due_weekday, auto_confirm, payment_method FROM bills`);
  await run('subscription', `SELECT id, amount, billing_day, auto_confirm, payment_method FROM subscriptions`);
  return settled;
}

/** How a bill or subscription is normally paid, defaulting safely. */
export function methodOf(row: { payment_method?: string | null }, fallback: PaymentMethod): PaymentMethod {
  return row.payment_method === 'auto' ? 'auto' : row.payment_method === 'manual' ? 'manual' : fallback;
}
