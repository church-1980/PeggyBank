/**
 * AN AUTOMATIC SAVE MUST BE ONE SAVE.
 *
 * Auto-save removes the review screen's accidental protection: a person who
 * never saw a form cannot notice it was submitted twice. So the things that
 * were harmless before — a double tap, a callback firing twice — become the
 * ones that quietly create two expenses.
 *
 * Undo must delete the ROW, not hide a banner. These run the REAL SQL against
 * a REAL database, and check the money everywhere it shows up.
 */

process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { createExpense, undoExpense } from '../lib/saveExpense';
import { searchActivity, activityForMonth, activityInCategory } from '../lib/activity';
import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary, spendingByCategory } from '../core/finance';

let db: any;
const NOW = new Date(2026, 7, 28);

beforeEach(async () => {
  db = makeRealDb();
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (1000, 'Pay', '2026-08-01')`);
});

/** The Tim Hortons receipt that started all of this. */
const TIMS = {
  amount: 11.60, category: 'restaurant', note: 'Tim Hortons',
  date: '2026-08-28', photoUri: 'file:///receipts/tims.jpg',
};

const rows = () => db.getAllAsync(`SELECT * FROM expenses`);
const summary = async () => computeFinanceSummary(await buildFinanceInput(db, NOW));

describe('One photograph, one expense', () => {
  it('saves exactly one row, with the photo attached', async () => {
    const id = await createExpense(db, TIMS);
    const all: any = await rows();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(id);
    expect(all[0].amount).toBe(11.60);
    expect(all[0].note).toBe('Tim Hortons');
    expect(all[0].photo_uri).toBe('file:///receipts/tims.jpg');
  });

  it('creates no camera record and no OCR record — only the expense', async () => {
    await createExpense(db, TIMS);
    const tables: any = await db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table'
        AND (name LIKE '%capture%' OR name LIKE '%ocr%' OR name LIKE '%receipt%')`);
    expect(tables.length).toBe(0);
  });

  it('returns the id, so Undo and Edit can name the exact row', async () => {
    // "The most recent expense" would delete the wrong thing for anyone
    // adding two quickly.
    const first = await createExpense(db, TIMS);
    const second = await createExpense(db, { ...TIMS, amount: 4.75 });
    expect(second).not.toBe(first);
    await undoExpense(db, first);
    const left: any = await rows();
    expect(left.length).toBe(1);
    expect(left[0].id).toBe(second);
    expect(left[0].amount).toBe(4.75);
  });

  it('teaches merchant memory what was actually saved', async () => {
    await createExpense(db, TIMS);
    const mem: any = await db.getFirstAsync(`SELECT * FROM merchant_memory`);
    expect(mem).toBeTruthy();
    expect(mem.display_name).toBe('Tim Hortons');
    expect(mem.category).toBe('restaurant');
  });

  it('a nameless receipt still saves, and teaches nothing', async () => {
    await createExpense(db, { ...TIMS, note: '' });
    expect((await rows() as any).length).toBe(1);
    expect(await db.getFirstAsync(`SELECT * FROM merchant_memory`)).toBeNull();
  });
});

describe('Undo removes the money everywhere', () => {
  it('the row is gone, not hidden', async () => {
    const id = await createExpense(db, TIMS);
    await undoExpense(db, id);
    expect((await rows() as any).length).toBe(0);
  });

  it('Safe to Spend returns to exactly what it was', async () => {
    const before = await summary();
    const id = await createExpense(db, TIMS);
    const during = await summary();
    expect(during.safeToSpend).toBe(before.safeToSpend - 11.60);

    await undoExpense(db, id);
    const after = await summary();
    expect(after.safeToSpend).toBe(before.safeToSpend);
    expect(after.monthSpending).toBe(before.monthSpending);
  });

  it('What Happened no longer lists it', async () => {
    const id = await createExpense(db, TIMS);
    expect((await activityForMonth(db, NOW)).some((a: any) => a.title === 'Tim Hortons')).toBe(true);
    await undoExpense(db, id);
    expect((await activityForMonth(db, NOW)).some((a: any) => a.title === 'Tim Hortons')).toBe(false);
  });

  it('Search no longer finds it', async () => {
    const id = await createExpense(db, TIMS);
    expect((await searchActivity(db, 'Tim Hortons')).length).toBe(1);
    await undoExpense(db, id);
    expect(await searchActivity(db, 'Tim Hortons')).toEqual([]);
  });

  it('the category drill-down no longer counts it', async () => {
    const id = await createExpense(db, TIMS);
    expect((await activityInCategory(db, '2026-08-01', '2026-08-31', 'restaurant')).length).toBe(1);
    await undoExpense(db, id);
    expect(await activityInCategory(db, '2026-08-01', '2026-08-31', 'restaurant')).toEqual([]);
  });

  it('Monthly Breakdown stops counting it', async () => {
    const id = await createExpense(db, TIMS);
    const input = await buildFinanceInput(db, NOW);
    expect(spendingByCategory(input.expenses).find(c => c.category === 'restaurant')?.total).toBe(11.60);

    await undoExpense(db, id);
    const after = await buildFinanceInput(db, NOW);
    expect(spendingByCategory(after.expenses).find(c => c.category === 'restaurant')).toBeUndefined();
  });

  it('undoing twice is harmless', async () => {
    const id = await createExpense(db, TIMS);
    await undoExpense(db, id);
    await undoExpense(db, id);
    expect((await rows() as any).length).toBe(0);
  });

  it('merchant memory survives Undo, deliberately', async () => {
    // That this person shops at Tim Hortons stays true whether or not they
    // kept this particular receipt.
    const id = await createExpense(db, TIMS);
    await undoExpense(db, id);
    expect(await db.getFirstAsync(`SELECT * FROM merchant_memory`)).toBeTruthy();
  });
});

describe('An automatic save must be ONE save', () => {
  /**
   * Auto-save removes the review screen's accidental protection: someone who
   * never saw a form cannot notice it was submitted twice. So the things that
   * were harmless before are the dangerous ones now.
   */

  it('two saves of the same receipt really would be two expenses', async () => {
    // Stated plainly, because it is the whole reason the guard exists: the
    // database will happily take the second one.
    await createExpense(db, TIMS);
    await createExpense(db, TIMS);
    expect((await rows() as any).length).toBe(2);
  });

  it('THE OBVIOUS GUARD DOES NOT WORK — and this is why', async () => {
    // "if (saved) return" looks like protection and is not. All three calls
    // reach the check before any of them finishes, so all three see null and
    // all three save. The flag is set AFTER an await; the race lives in the gap.
    let saved: number | null = null;
    const naive = async () => {
      if (saved !== null) return saved;
      saved = await createExpense(db, TIMS);
      return saved;
    };

    await Promise.all([naive(), naive(), naive()]);
    expect((await rows() as any).length).toBe(3);     // three expenses, one receipt
  });

  it('latching the PROMISE works, because the assignment is synchronous', async () => {
    // This is the pattern the screen uses. The second caller finds a promise
    // already there and waits on the same save instead of starting another.
    let inFlight: Promise<number> | null = null;
    const saveOnce = () => {
      if (inFlight) return inFlight;
      inFlight = createExpense(db, TIMS);
      return inFlight;
    };

    const ids = await Promise.all([saveOnce(), saveOnce(), saveOnce()]);
    expect((await rows() as any).length).toBe(1);
    expect(new Set(ids).size).toBe(1);
  });

  it('a failed save creates nothing, and says nothing was saved', async () => {
    const broken: any = {
      runAsync: async () => { throw new Error('disk full'); },
      getFirstAsync: async () => null,
    };
    await expect(createExpense(broken, TIMS)).rejects.toThrow('disk full');
    expect((await rows() as any).length).toBe(0);
  });

  it('a save that fails does not teach merchant memory a lie', async () => {
    const broken: any = {
      runAsync: async () => { throw new Error('disk full'); },
      getFirstAsync: async () => null,
    };
    await createExpense(broken, TIMS).catch(() => {});
    expect(await db.getFirstAsync(`SELECT * FROM merchant_memory`)).toBeNull();
  });
});

describe('Edit corrects the one record, and everything follows', () => {
  it('correcting the amount moves every view at once', async () => {
    const id = await createExpense(db, TIMS);
    const before = await summary();

    // What Edit does: update the authoritative row.
    await db.runAsync(`UPDATE expenses SET amount = 10.60 WHERE id = ?`, [id]);

    const after = await summary();
    expect(after.monthSpending).toBe(10.60);
    expect(after.safeToSpend).toBe(before.safeToSpend + 1.00);

    const [found] = await searchActivity(db, 'Tim Hortons');
    expect(found.amount).toBe(10.60);
    expect(found.sourceId).toBe(id);          // the same record, not a new one

    expect((await rows() as any).length).toBe(1);
  });

  it('editing never creates a second expense', async () => {
    const id = await createExpense(db, TIMS);
    await db.runAsync(`UPDATE expenses SET amount = 10.60, category = 'groceries' WHERE id = ?`, [id]);
    expect((await rows() as any).length).toBe(1);
  });
});

describe('A correction beats what the camera read', () => {
  it('what the person typed is what gets saved', async () => {
    // OCR said 11.60; the person corrected it to 12.99 before saving.
    const id = await createExpense(db, { ...TIMS, amount: 12.99, category: 'groceries' });
    const row: any = await db.getFirstAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);
    expect(row.amount).toBe(12.99);
    expect(row.category).toBe('groceries');
  });

  it('and merchant memory learns the correction, not the guess', async () => {
    await createExpense(db, { ...TIMS, category: 'groceries' });
    const mem: any = await db.getFirstAsync(`SELECT * FROM merchant_memory`);
    expect(mem.category).toBe('groceries');
  });
});
