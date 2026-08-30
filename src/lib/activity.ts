/**
 * WHAT HAPPENED TO MY MONEY — one view over the records that already exist.
 *
 * PeggyBank stores two different kinds of thing, and the difference matters:
 *
 *   PLANS            bills, subscriptions, income_schedules, goals, debts
 *                    "Bell is £117 on the 15th of every month."
 *                    A plan is not money moving. It is an intention.
 *
 *   MONEY MOVEMENT   expenses, income, bill_payments
 *                    "Bell, £117, paid on 15 August."
 *                    Something actually happened.
 *
 * Only the second kind appears here. A bill that is due next week has not cost
 * anyone anything yet, and a paycheque that has not arrived is not money.
 *
 * NO SECOND DATABASE
 * ------------------
 * This file stores nothing. It READS the three tables that already hold money
 * movement and presents them in one shape. Copying every record into a
 * "transactions" table would create a second version of the truth that could
 * drift from the first, and every edit would then need to be made twice.
 *
 * NO DOUBLE COUNTING
 * ------------------
 * Each event is read from exactly ONE table:
 *   - money you spent            -> expenses
 *   - money you received         -> income
 *   - a bill or subscription you paid -> bill_payments
 *
 * Marking a bill paid writes only to bill_payments; it does not also create an
 * expense. So Bell can never appear twice for one payment. If it ever DID
 * appear twice, that would mean two real records existed, which is a duplicate
 * the user should see and delete -- not something to hide.
 *
 * SOURCE IS NEVER LOST
 * --------------------
 * Every item carries where it came from and which row it is, so tapping it can
 * open the real record and edit the authoritative source rather than a copy.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { localMonthRange } from '../core/datetime';
import { parseQuery, searchTerms } from '../core/searchQuery';

/** Which table a piece of activity really lives in. */
export type ActivitySource = 'expense' | 'income' | 'bill' | 'subscription';

/** Money coming in, or money going out. Never a plan. */
export type ActivityDirection = 'in' | 'out';

export interface ActivityItem {
  /** Stable across reloads: source plus row id. Safe as a list key. */
  key: string;
  source: ActivitySource;
  sourceId: number;
  /** Local calendar date, YYYY-MM-DD. Never a UTC-derived one. */
  date: string;
  /** Always positive. Direction says which way it went. */
  amount: number;
  direction: ActivityDirection;
  /** What the person would call it: "Maxi", "Bell", "Paycheck". */
  title: string;
  /** Supporting detail: "Groceries", "Bill", "Subscription". */
  subtitle?: string;
  category?: string | null;
  photoUri?: string | null;
}

/**
 * The three money-movement sources, as one ordered list.
 *
 * A UNION in SQL rather than three reads merged in JavaScript, so the database
 * does the sorting and the LIMIT actually limits: Home asking for the last ten
 * items must not read a year of history to show them.
 */
const ACTIVITY_SQL = `
  SELECT
    'expense'                          AS source,
    e.id                               AS source_id,
    e.date                             AS date,
    e.amount                           AS amount,
    'out'                              AS direction,
    COALESCE(NULLIF(TRIM(e.note), ''), e.category) AS title,
    e.category                         AS subtitle,
    e.category                         AS category,
    e.photo_uri                        AS photo_uri
  FROM expenses e

  UNION ALL

  SELECT
    'income',
    i.id,
    i.date,
    i.amount,
    'in',
    COALESCE(NULLIF(TRIM(i.label), ''), 'Income'),
    'Income',
    NULL,
    NULL
  FROM income i

  UNION ALL

  -- A bill or subscription only becomes activity once it is actually paid.
  -- The amount recorded on the payment wins over the plan's amount, because
  -- what left the account is what matters, not what was expected to.
  SELECT
    p.source,
    p.bill_id,
    p.cycle_date,
    COALESCE(p.amount, b.amount, s.amount, 0),
    'out',
    COALESCE(b.name, s.name, 'Payment'),
    CASE WHEN p.source = 'subscription' THEN 'Subscription' ELSE 'Bill' END,
    NULL,
    NULL
  FROM bill_payments p
  LEFT JOIN bills b         ON p.source = 'bill'         AND b.id = p.bill_id
  LEFT JOIN subscriptions s ON p.source = 'subscription' AND s.id = p.bill_id
  WHERE p.paid = 1
`;

interface Row {
  source: ActivitySource;
  source_id: number;
  date: string;
  amount: number;
  direction: ActivityDirection;
  title: string;
  subtitle: string | null;
  category: string | null;
  photo_uri: string | null;
}

function toItem(r: Row): ActivityItem {
  return {
    key: r.source + ':' + r.source_id,
    source: r.source,
    sourceId: r.source_id,
    date: r.date,
    amount: Math.abs(Number(r.amount) || 0),
    direction: r.direction,
    title: r.title || 'Payment',
    subtitle: r.subtitle ?? undefined,
    category: r.category,
    photoUri: r.photo_uri,
  };
}

/** The most recent money movement, newest first. For the Home preview. */
export async function recentActivity(db: SQLiteDatabase, limit = 8): Promise<ActivityItem[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM (${ACTIVITY_SQL}) ORDER BY date DESC, source_id DESC LIMIT ?`,
    [limit]
  ).catch(() => []);
  return rows.map(toItem);
}

/**
 * Money movement in a date range, newest first.
 * `limit` and `offset` exist so a long history loads a page at a time rather
 * than pulling every record a person has ever entered into memory.
 */
export async function activityBetween(
  db: SQLiteDatabase, start: string, end: string, limit = 100, offset = 0
): Promise<ActivityItem[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM (${ACTIVITY_SQL}) WHERE date >= ? AND date <= ?
     ORDER BY date DESC, source_id DESC LIMIT ? OFFSET ?`,
    [start, end, limit, offset]
  ).catch(() => []);
  return rows.map(toItem);
}

/** Activity for the month containing `when`. */
export async function activityForMonth(
  db: SQLiteDatabase, when: Date = new Date(), limit = 200, offset = 0
): Promise<ActivityItem[]> {
  const { start, end } = localMonthRange(when);
  return activityBetween(db, start, end, limit, offset);
}

/**
 * Group by day for display, newest day first, preserving order within a day.
 * Pure, so it can be tested without a database.
 */
export function groupByDay(items: ActivityItem[]): { date: string; items: ActivityItem[] }[] {
  const days = new Map<string, ActivityItem[]>();
  for (const it of items) {
    if (!days.has(it.date)) days.set(it.date, []);
    days.get(it.date)!.push(it);
  }
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({ date, items: list }));
}

/** Totals for a set of activity. Money in and money out kept apart. */
export function activityTotals(items: ActivityItem[]): { in: number; out: number } {
  let cin = 0, cout = 0;
  for (const it of items) {
    if (it.direction === 'in') cin += it.amount; else cout += it.amount;
  }
  return { in: Math.round(cin * 100) / 100, out: Math.round(cout * 100) / 100 };
}

/**
 * FIND ONE THING.
 *
 * Search is a VIEW, not a second source of truth. It runs the SAME union every
 * other money view runs, with a filter on top — so a row found here IS the row
 * What Happened shows, and tapping it opens the real record.
 *
 * Matching is deliberately generous. Someone looking for a Tim Hortons coffee
 * might type "tims", "tim", "coffee" or "11.60". The cost of one extra row is a
 * glance; the cost of hiding the right one is that they stop trusting search.
 *
 * Every value is a bound parameter. Typed text never reaches the SQL.
 */
export async function searchActivity(
  db: SQLiteDatabase, raw: string, limit = 60
): Promise<ActivityItem[]> {
  const q = parseQuery(raw);
  if (q.empty) return [];

  const where: string[] = [];
  const args: (string | number)[] = [];

  // Name, category or type. Every word must appear, so a second word narrows.
  for (const term of searchTerms(q)) {
    where.push(
      `(LOWER(title) LIKE ? OR LOWER(COALESCE(subtitle, '')) LIKE ?)`);
    const like = '%' + term + '%';
    args.push(like, like);
  }

  const amountClause = q.amount != null ? 'ROUND(amount, 2) = ROUND(?, 2)' : null;

  // Matched on the stored LOCAL date string. The whole app stores YYYY-MM-DD in
  // local time; comparing against UTC here would shift a late-evening payment
  // into the wrong day.
  const dateClauses: string[] = [];
  const dateArgs: number[] = [];
  if (q.year != null)  { dateClauses.push(`CAST(strftime('%Y', date) AS INTEGER) = ?`); dateArgs.push(q.year); }
  if (q.month != null) { dateClauses.push(`CAST(strftime('%m', date) AS INTEGER) = ?`); dateArgs.push(q.month + 1); }
  if (q.day != null)   { dateClauses.push(`CAST(strftime('%d', date) AS INTEGER) = ?`); dateArgs.push(q.day); }

  /**
   * "20" is both twenty dollars and the twentieth, and nobody typing it knows
   * which they meant. Requiring BOTH would find a $20 charge only if it also
   * landed on the 20th — almost never, so search would look broken. Either
   * reading is accepted.
   *
   * A date given in words is NOT ambiguous: "august 12" means that day, so its
   * parts stay required together.
   */
  if (q.ambiguousNumber && amountClause && dateClauses.length) {
    where.push('(' + amountClause + ' OR ' + dateClauses.join(' AND ') + ')');
    args.push(q.amount as number, ...dateArgs);
  } else {
    if (amountClause) { where.push(amountClause); args.push(q.amount as number); }
    dateClauses.forEach((c, i) => { where.push(c); args.push(dateArgs[i]); });
  }

  if (!where.length) return [];

  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM (${ACTIVITY_SQL}) WHERE ${where.join(' AND ')}
     ORDER BY date DESC, source_id DESC LIMIT ?`,
    [...args, limit]
  ).catch(() => []);

  return rows.map(toItem);
}
