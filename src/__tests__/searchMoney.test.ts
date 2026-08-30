/**
 * FINDING ONE TRANSACTION.
 *
 * The competitor review found this was PeggyBank's real weakness: an old
 * receipt was only findable by scrolling. Search fixes that WITHOUT becoming a
 * second source of truth — it runs the same union What Happened runs, so a row
 * found here is the row, and tapping it opens the real record.
 *
 * These run the REAL SQL against a REAL database. What matters is not that a
 * function was called but that a person typing "tims" finds their coffee.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { searchActivity } from '../lib/activity';
import { parseQuery, searchTerms } from '../core/searchQuery';

let db: any;

beforeEach(async () => {
  db = makeRealDb();
  const e = (amount: number, category: string, note: string, date: string) =>
    db.runAsync(`INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)`,
      [amount, category, note, date]);

  await e(11.60, 'restaurant', 'Tim Hortons', '2026-08-28');
  await e(4.75,  'restaurant', 'Tim Hortons', '2026-08-12');
  await e(195.65, 'groceries', 'Maxi',        '2026-08-12');
  await e(20.00, 'gas',        'Shell',       '2026-07-03');
  await e(64.20, 'shopping',   'Winners',     '2026-06-15');
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (1250, 'Paycheck', '2026-08-14')`);
  await db.runAsync(`INSERT INTO bills (id, name, amount, frequency, due_day) VALUES (1, 'Bell', 117, 'monthly', 28)`);
  await db.runAsync(
    `INSERT INTO bill_payments (bill_id, source, cycle_date, paid, amount) VALUES (1, 'bill', '2026-08-28', 1, 117)`);
});

const titles = (rows: any[]) => rows.map(r => r.title);

describe('Typing what you remember', () => {
  it('a merchant name finds it', async () => {
    const r = await searchActivity(db, 'Tim Hortons');
    expect(r.length).toBe(2);
    expect(titles(r).every(t => t === 'Tim Hortons')).toBe(true);
  });

  it('a partial name works — people type "tim", not the full name', async () => {
    expect((await searchActivity(db, 'tim')).length).toBe(2);
  });

  it('case does not matter', async () => {
    expect((await searchActivity(db, 'TIM HORTONS')).length).toBe(2);
    expect((await searchActivity(db, 'maxi')).length).toBe(1);
  });

  it('a category finds everything in it', async () => {
    const r = await searchActivity(db, 'restaurant');
    expect(r.length).toBe(2);
  });

  it('an amount finds the transaction', async () => {
    const r = await searchActivity(db, '11.60');
    expect(r.length).toBe(1);
    expect(r[0].title).toBe('Tim Hortons');
  });

  it('an amount with a dollar sign works', async () => {
    expect((await searchActivity(db, '$20')).length).toBe(1);
  });

  it('a bare round number is treated as money too', async () => {
    // Someone typing "20" means the twenty-dollar thing.
    const r = await searchActivity(db, '20');
    expect(titles(r)).toContain('Shell');
  });

  it('a bill payment is findable, not just expenses', async () => {
    const r = await searchActivity(db, 'Bell');
    expect(r.length).toBe(1);
    expect(r[0].amount).toBe(117);
    expect(r[0].direction).toBe('out');
  });

  it('income is findable too', async () => {
    const r = await searchActivity(db, 'Paycheck');
    expect(r.length).toBe(1);
    expect(r[0].direction).toBe('in');
  });

  it('nothing typed finds nothing — not everything', async () => {
    expect(await searchActivity(db, '')).toEqual([]);
    expect(await searchActivity(db, '   ')).toEqual([]);
  });

  it('a word that matches nothing returns nothing, quietly', async () => {
    expect(await searchActivity(db, 'zzzz')).toEqual([]);
  });
});

describe('Dates, the way people write them', () => {
  it('a month name narrows to that month', async () => {
    const r = await searchActivity(db, 'august');
    // Two Tim Hortons, Maxi, the paycheque and the Bell payment. Income and
    // bill payments are money too — a month search that showed only expenses
    // would be quietly answering a different question.
    expect(r.length).toBe(5);
    expect(titles(r)).toContain('Paycheck');
    expect(titles(r)).toContain('Bell');
    expect(r.every(x => x.date.startsWith('2026-08'))).toBe(true);
  });

  it('a month and a day together mean THAT day', async () => {
    const r = await searchActivity(db, 'august 12');
    expect(titles(r).sort()).toEqual(['Maxi', 'Tim Hortons']);
  });

  it('a name plus a month narrows to both', async () => {
    const r = await searchActivity(db, 'tim august');
    expect(r.length).toBe(2);
  });

  it('month words work in French too', async () => {
    // Someone reading the app in French types "août", not "august".
    const fr = await searchActivity(db, 'août 12');
    const en = await searchActivity(db, 'august 12');
    expect(titles(fr).sort()).toEqual(titles(en).sort());
  });

  it('a year narrows', async () => {
    expect((await searchActivity(db, 'tim 2026')).length).toBe(2);
    expect((await searchActivity(db, 'tim 2025')).length).toBe(0);
  });
});

describe('An ambiguous number means either reading', () => {
  it('"20" finds the $20 charge even though it is not on the 20th', async () => {
    // Shell is $20.00 on 3 July. Requiring amount AND day would find nothing,
    // which is exactly how a search stops being believed.
    const r = await searchActivity(db, '20');
    expect(titles(r)).toContain('Shell');
  });

  it('"12" finds things on the 12th as well as anything costing $12', async () => {
    const r = await searchActivity(db, '12');
    expect(titles(r).sort()).toEqual(['Maxi', 'Tim Hortons']);
  });

  it('a decimal is money only — its leading digits are not a day', async () => {
    // "11.60" must not also be read as the 11th, or the Tim Hortons on the
    // 28th is filtered out by a day nobody typed.
    const r = await searchActivity(db, '11.60');
    expect(r.length).toBe(1);
    expect(r[0].amount).toBe(11.60);
  });
});

describe('Search is a finder, never a second ledger', () => {
  it('returns the authoritative row, openable and editable', async () => {
    const [row] = await searchActivity(db, '11.60');
    expect(row.source).toBe('expense');
    expect(row.sourceId).toBeGreaterThan(0);
    const real: any = await db.getFirstAsync(
      `SELECT * FROM expenses WHERE id = ?`, [row.sourceId]);
    expect(real.amount).toBe(11.60);
    expect(real.note).toBe('Tim Hortons');
  });

  it('stores nothing of its own', async () => {
    await searchActivity(db, 'tim');
    const tables: any = await db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%search%' OR name LIKE '%index%')`);
    expect(tables.length).toBe(0);
  });

  it('a corrected record is what search then finds', async () => {
    const [before] = await searchActivity(db, '11.60');
    await db.runAsync(`UPDATE expenses SET amount = 12.99 WHERE id = ?`, [before.sourceId]);
    expect(await searchActivity(db, '11.60')).toEqual([]);
    const [after] = await searchActivity(db, '12.99');
    expect(after.sourceId).toBe(before.sourceId);   // same record, new value
  });

  it('a photographed receipt is findable like anything else', async () => {
    await db.runAsync(
      `INSERT INTO expenses (amount, category, note, date, photo_uri)
       VALUES (8.40, 'restaurant', 'Starbucks', '2026-08-20', 'file:///r.jpg')`);
    const [row] = await searchActivity(db, 'starbucks');
    expect(row.photoUri).toBe('file:///r.jpg');
  });
});
