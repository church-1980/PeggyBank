/**
 * CHANGE THE FINANCIAL TRUTH ONCE, THEN PROVE THE WHOLE TREE RECEIVES IT.
 *
 * This file deliberately does NOT test that a Delete button exists. It creates
 * a real expense in a real database, proves every downstream view can see it,
 * deletes it through the one authoritative function, and then proves every one
 * of those views has forgotten it — without any of them being told.
 *
 * Every assertion goes through the SHARED loader a screen actually calls. A
 * test that re-typed a screen's SQL would prove only that the test agrees with
 * itself, and would keep passing on the day a screen started answering the
 * question its own way. That is the failure this file exists to catch.
 */

import { makeRealDb, type TestDb } from './helpers/realDb';
import { localMonthRange } from '../core/datetime';
import { createExpense, deleteExpense } from '../lib/saveExpense';
import { buildFinanceInput, loadFinanceSummary } from '../lib/financeSummary';
import { computeFinanceSummary, spendingByCategory } from '../core/finance';
import { buildSegments } from '../core/spendingChart';
import {
  recentActivity, activityForMonth, searchActivity, activityInCategory, activityTotals,
} from '../lib/activity';
import { expenseCsvRows, rowsToCsv, EXPENSE_CSV_HEADERS } from '../lib/csvExport';
import { buildBackup, restoreBackup } from '../lib/backupCore';

const OWNED = 'file:///peggybank/receipts/receipt_1.jpg';

/**
 * The real storage module talks to the filesystem. What matters here is WHICH
 * files PeggyBank decides to remove, so the decision is observed and the
 * filesystem is not involved.
 */
jest.mock('../lib/receiptStorage', () => ({
  isOwnedReceipt: (u?: string | null) => !!u && u.includes('/peggybank/receipts/'),
  deleteReceiptImage: jest.fn().mockResolvedValue(undefined),
}));

/** The expense from the report: entered, then paid for by somebody else. */
const ALAMY = { amount: 49.52, category: 'restaurant', note: 'Alamy' };

const TODAY = new Date();
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DATE = iso(TODAY);

async function seed(db: TestDb) {
  // A month with other money in it, so "gone" cannot be confused with "empty".
  await db.runAsync(
    `INSERT INTO income (amount, label, date, is_recurring) VALUES (1000, 'Pay', ?, 0)`, [DATE]);
  await db.runAsync(
    `INSERT INTO expenses (amount, category, note, date, is_recurring) VALUES (20, 'groceries', 'Milk', ?, 0)`,
    [DATE]);
}

const chart = (db: TestDb) => async () => {
  const input = await buildFinanceInput(db as any, TODAY);
  const finance = computeFinanceSummary(input);
  return buildSegments({
    moneyOut: finance.monthSpending,
    billsPaid: finance.billsPaidTotal,
    categories: spendingByCategory(input.expenses),
    meta: (key) => ({ label: key, color: '#000' }),
    billsColor: '#111',
    otherColor: '#222',
  });
};

describe('One deletion, felt everywhere, told to nobody', () => {
  let db: TestDb;
  let id: number;

  beforeEach(async () => {
    db = makeRealDb();
    await seed(db);
    id = await createExpense(db as any, { ...ALAMY, date: DATE });
  });

  it('BEFORE: the expense is counted exactly once, everywhere', async () => {
    const finance = await loadFinanceSummary(db as any, TODAY);
    expect(finance.monthSpending).toBeCloseTo(69.52, 2);       // 49.52 + 20

    const activity = await activityForMonth(db as any, TODAY);
    const mine = activity.filter(a => a.source === 'expense' && a.sourceId === id);
    expect(mine).toHaveLength(1);
    expect(mine[0].amount).toBeCloseTo(49.52, 2);

    expect((await searchActivity(db as any, 'Alamy'))).toHaveLength(1);
    const { start, end } = localMonthRange(TODAY);
    expect(await activityInCategory(db as any, start, end, 'restaurant')).toHaveLength(1);

    const cats = spendingByCategory((await buildFinanceInput(db as any, TODAY)).expenses);
    expect(cats.find(c => c.category === 'restaurant')!.total).toBeCloseTo(49.52, 2);
  });

  it('AFTER: the authoritative row is gone', async () => {
    await deleteExpense(db as any, id);
    expect(await db.getFirstAsync(`SELECT id FROM expenses WHERE id = ?`, [id])).toBeNull();
  });

  it('AFTER: spending falls by exactly the amount, never twice and never not at all', async () => {
    const before = (await loadFinanceSummary(db as any, TODAY)).monthSpending;
    await deleteExpense(db as any, id);
    const after = (await loadFinanceSummary(db as any, TODAY)).monthSpending;
    expect(before - after).toBeCloseTo(49.52, 2);
    expect(after).toBeCloseTo(20, 2);
  });

  it('AFTER: Safe to Spend recomputes from the corrected state, with no special case', async () => {
    const before = (await loadFinanceSummary(db as any, TODAY)).safeToSpend;
    await deleteExpense(db as any, id);
    const after = (await loadFinanceSummary(db as any, TODAY)).safeToSpend;
    // Money no longer spent is money available again.
    expect(after - before).toBeCloseTo(49.52, 2);
  });

  it('AFTER: What Happened and the Home preview forget it', async () => {
    await deleteExpense(db as any, id);
    const month = await activityForMonth(db as any, TODAY);
    expect(month.some(a => a.source === 'expense' && a.sourceId === id)).toBe(false);
    const recent = await recentActivity(db as any, 20);
    expect(recent.some(a => a.source === 'expense' && a.sourceId === id)).toBe(false);
  });

  it('AFTER: the activity money-out total drops by the same amount', async () => {
    const before = activityTotals(await activityForMonth(db as any, TODAY)).out;
    await deleteExpense(db as any, id);
    const after = activityTotals(await activityForMonth(db as any, TODAY)).out;
    expect(before - after).toBeCloseTo(49.52, 2);
  });

  it('AFTER: search cannot find it', async () => {
    await deleteExpense(db as any, id);
    expect(await searchActivity(db as any, 'Alamy')).toHaveLength(0);
    expect(await searchActivity(db as any, '49.52')).toHaveLength(0);
  });

  it('AFTER: the category is emptied and drops out of the breakdown', async () => {
    const withIt = await chart(db)();
    expect(withIt.some(s => s.key === 'restaurant')).toBe(true);

    await deleteExpense(db as any, id);

    const cats = spendingByCategory((await buildFinanceInput(db as any, TODAY)).expenses);
    expect(cats.find(c => c.category === 'restaurant')).toBeUndefined();
    expect((await chart(db)()).some(s => s.key === 'restaurant')).toBe(false);
  });

  it('AFTER: the calendar has nothing to draw on that day', async () => {
    // The calendar reads the expenses table for the month; with the row gone
    // there is nothing for it to find.
    await deleteExpense(db as any, id);
    const onDay = await db.getAllAsync(`SELECT id FROM expenses WHERE date = ? AND id = ?`, [DATE, id]);
    expect(onDay).toHaveLength(0);
  });

  it('AFTER: the CSV export does not contain it', async () => {
    const before = rowsToCsv(EXPENSE_CSV_HEADERS, await expenseCsvRows(db as any));
    expect(before).toContain('Alamy');

    await deleteExpense(db as any, id);

    const after = rowsToCsv(EXPENSE_CSV_HEADERS, await expenseCsvRows(db as any));
    expect(after).not.toContain('Alamy');
    expect(after).toContain('Milk');           // the rest of the month survives
  });

  it('AFTER: a fresh backup does not contain it', async () => {
    await deleteExpense(db as any, id);
    const backup: any = await buildBackup(db as any);
    expect(backup.expenses.some((e: any) => e.id === id)).toBe(false);
    expect(backup.expenses).toHaveLength(1);   // the milk
  });

  it('AFTER: restoring the post-delete backup does not resurrect it', async () => {
    const before: any = await buildBackup(db as any);
    expect(before.expenses.some((e: any) => e.id === id)).toBe(true);

    await deleteExpense(db as any, id);
    const after = JSON.parse(JSON.stringify(await buildBackup(db as any)));

    const fresh = makeRealDb();
    const report = await restoreBackup(fresh as any, after);
    expect(report.success).toBe(true);

    expect(await fresh.getFirstAsync(`SELECT id FROM expenses WHERE note = 'Alamy'`)).toBeNull();
    const finance = await loadFinanceSummary(fresh as any, TODAY);
    expect(finance.monthSpending).toBeCloseTo(20, 2);
  });

  it('the money is counted once before and zero times after — never negative', async () => {
    const before = await loadFinanceSummary(db as any, TODAY);
    await deleteExpense(db as any, id);
    const after = await loadFinanceSummary(db as any, TODAY);

    expect(before.monthSpending - after.monthSpending).toBeCloseTo(49.52, 2);
    expect(after.monthSpending).toBeGreaterThanOrEqual(0);
    // Deleting twice must not credit the person 49.52 twice.
    await deleteExpense(db as any, id);
    const again = await loadFinanceSummary(db as any, TODAY);
    expect(again.monthSpending).toBeCloseTo(after.monthSpending, 2);
  });
});

describe('Deleting an ACTUAL never deletes the PLAN behind it', () => {
  it('deleting a recorded expense leaves the recurring bill alone', async () => {
    const db = makeRealDb();
    await db.runAsync(
      `INSERT INTO bills (name, amount, due_day, frequency, category) VALUES ('Bell', 117, 5, 'monthly', 'home')`);
    const id = await createExpense(db as any, {
      amount: 117, category: 'home', note: 'Bell', date: DATE,
    });

    await deleteExpense(db as any, id);

    const bills = await db.getAllAsync(`SELECT id, name FROM bills`);
    expect(bills).toHaveLength(1);
    expect((bills[0] as any).name).toBe('Bell');
  });

  it('deleting an expense leaves income schedules alone', async () => {
    const db = makeRealDb();
    await db.runAsync(
      `INSERT INTO income_schedules (label, amount, frequency, day_of_month, active)
       VALUES ('Pay', 2200, 'monthly', 15, 1)`);
    const id = await createExpense(db as any, { ...ALAMY, date: DATE });

    await deleteExpense(db as any, id);

    expect(await db.getAllAsync(`SELECT id FROM income_schedules`)).toHaveLength(1);
  });

  it('deleting an expense leaves what PeggyBank learned about the vendor', async () => {
    // Memory records that this person eats at Alamy, which stays true whether
    // or not they kept this particular receipt.
    const db = makeRealDb();
    const id = await createExpense(db as any, { ...ALAMY, date: DATE });
    const before = await db.getAllAsync(`SELECT name_key FROM merchant_memory`);
    expect(before.length).toBeGreaterThan(0);

    await deleteExpense(db as any, id);
    expect(await db.getAllAsync(`SELECT name_key FROM merchant_memory`)).toHaveLength(before.length);
  });
});

describe('The receipt photo', () => {
  /**
   * The earlier version of these tests asserted on the DATABASE row and never
   * on the FILE, so removing the "is anything else still using this?" check
   * changed nothing any test could see. Watching the storage module is the
   * only way to tell the two apart.
   */
  const storage = jest.requireMock('../lib/receiptStorage') as {
    deleteReceiptImage: jest.Mock;
    isOwnedReceipt: (u?: string | null) => boolean;
  };

  beforeEach(() => storage.deleteReceiptImage.mockClear());

  it('deletes the image PeggyBank owns when nothing else uses it', async () => {
    const db = makeRealDb();
    const id = await createExpense(db as any, {
      ...ALAMY, date: DATE, photoUri: OWNED,
    });

    await deleteExpense(db as any, id);

    expect(storage.deleteReceiptImage).toHaveBeenCalledWith(OWNED);
  });

  it('KEEPS an image another record still points at', async () => {
    const db = makeRealDb();
    const a = await createExpense(db as any, { ...ALAMY, date: DATE, photoUri: OWNED });
    await createExpense(db as any, { ...ALAMY, note: 'Second', date: DATE, photoUri: OWNED });

    await deleteExpense(db as any, a);

    expect(storage.deleteReceiptImage).not.toHaveBeenCalled();
    const survivor: any = await db.getFirstAsync(
      `SELECT photo_uri FROM expenses WHERE note = 'Second'`);
    expect(survivor.photo_uri).toBe(OWNED);
  });

  it('KEEPS an image a BILL still points at', async () => {
    const db = makeRealDb();
    await db.runAsync(
      `INSERT INTO bills (name, amount, due_day, photo_uri) VALUES ('Bell', 117, 5, ?)`, [OWNED]);
    const id = await createExpense(db as any, { ...ALAMY, date: DATE, photoUri: OWNED });

    await deleteExpense(db as any, id);

    expect(storage.deleteReceiptImage).not.toHaveBeenCalled();
  });

  it('never touches a picture from the person own gallery', async () => {
    const db = makeRealDb();
    const id = await createExpense(db as any, {
      ...ALAMY, date: DATE, photoUri: 'file:///storage/emulated/0/DCIM/holiday.jpg',
    });

    await deleteExpense(db as any, id);

    expect(storage.deleteReceiptImage).not.toHaveBeenCalled();
    expect(await db.getFirstAsync(`SELECT id FROM expenses WHERE id = ?`, [id])).toBeNull();
  });

  it('an expense with no photo deletes cleanly', async () => {
    const db = makeRealDb();
    const id = await createExpense(db as any, { ...ALAMY, date: DATE });
    await expect(deleteExpense(db as any, id)).resolves.toBeUndefined();
    expect(storage.deleteReceiptImage).not.toHaveBeenCalled();
  });

  it('a failure to clean up the image never costs the person the deletion', async () => {
    const db = makeRealDb();
    storage.deleteReceiptImage.mockRejectedValueOnce(new Error('disk gone'));
    const id = await createExpense(db as any, { ...ALAMY, date: DATE, photoUri: OWNED });

    await expect(deleteExpense(db as any, id)).resolves.toBeUndefined();
    expect(await db.getFirstAsync(`SELECT id FROM expenses WHERE id = ?`, [id])).toBeNull();
  });
});

/**
 * THE MOUNTAIN ITSELF.
 *
 * These read the source. The one-brain rule is a property of the CODEBASE —
 * "no screen owns its own version of this" — and absence is not something a
 * unit test of behaviour can observe. If a second deletion appears tomorrow,
 * this is what notices.
 */
describe('One financial brain, not six', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const SRC = path.join(__dirname, '..');

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) {
        if (name !== '__tests__' && name !== 'node_modules') walk(p, out);
      } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  }
  const appFiles = walk(SRC);
  const read = (p: string) => fs.readFileSync(p, 'utf8');
  const rel = (p: string) => path.relative(SRC, p).split(path.sep).join('/');

  it('exactly ONE place in the app deletes an expense', () => {
    const owners = appFiles.filter(f => read(f).includes('DELETE FROM expenses')).map(rel);
    expect(owners).toEqual(['lib/saveExpense.ts']);
  });

  it('no screen keeps its own idea of what has been deleted', () => {
    // A per-screen "hidden" or "deletedIds" set is how a view stops being a
    // view and starts being a second, disagreeing, financial record.
    const offenders = appFiles
      .filter(f => rel(f).startsWith('screens/'))
      .filter(f => /deletedIds|hiddenExpenses|removedIds|isDeleted|soft_delete|deleted_at/i.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('the expenses table carries no deletion flag', () => {
    const schema = read(path.join(SRC, 'database', 'database.ts'));
    const block = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS expenses'));
    expect(block.slice(0, block.indexOf(');'))).not.toMatch(/deleted|archived|hidden|void/i);
  });

  it('nothing patches a screen total after a deletion', () => {
    // The shape this pass exists to forbid: subtracting an amount from a view
    // instead of letting the view re-read.
    const body = read(path.join(SRC, 'lib', 'saveExpense.ts'));
    for (const leak of ['safeToSpend', 'monthSpending', 'moneyOut', 'refreshHome', 'recompute']) {
      expect(`${leak}:${body.includes(leak)}`).toBe(`${leak}:false`);
    }
  });

  it('Safe to Spend has no idea deletion exists', () => {
    const engine = read(path.join(SRC, 'core', 'finance.ts'));
    expect(engine.toLowerCase()).not.toContain('delete');
  });
});

describe('Deleting is reachable only from the record itself', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const screen = (n: string) =>
    fs.readFileSync(path.join(__dirname, '..', 'screens', n), 'utf8');

  it('the authoritative expense screen offers it', () => {
    const s = screen('AddExpenseScreen.tsx');
    expect(s).toContain('Delete expense');
    expect(s).toContain('testID="delete-expense"');
  });

  it('and asks once, naming the money, before doing it', () => {
    const s = screen('AddExpenseScreen.tsx');
    expect(s).toContain('Delete this expense?');
    expect(s).toContain('from your spending and totals');
    expect(s).toContain("style: 'destructive'");
    expect(s).toContain("{ text: 'Cancel', style: 'cancel' }");
  });

  it('only offers it when a real record is open', () => {
    const s = screen('AddExpenseScreen.tsx');
    expect(s).toContain('if (!editingId) return;');
    expect(s).toContain('{editingId ? (');
  });

  it('leaves the screen afterwards instead of stranding the user', () => {
    const s = screen('AddExpenseScreen.tsx');
    const at = s.indexOf('await deleteExpense(db, editingId)');
    expect(at).toBeGreaterThan(-1);
    expect(s.slice(at, at + 120)).toContain('handleBack()');
  });

  it('never claims success when the row is still there', () => {
    const s = screen('AddExpenseScreen.tsx');
    const at = s.indexOf('const handleDelete');
    const body = s.slice(at, s.indexOf('const handleSave', at));
    expect(body).toContain("Couldn't delete this expense");
    expect(body).toContain('It is still saved');
    // handleBack must be inside the try, after the delete — never in finally.
    expect(body.indexOf('handleBack()')).toBeGreaterThan(body.indexOf('await deleteExpense'));
  });

  it('Home, What Happened, Calendar and the Breakdown carry no delete control', () => {
    for (const name of [
      'DashboardScreen.tsx', 'ActivityScreen.tsx',
      'CalendarScreen.tsx', 'MonthlyBreakdownScreen.tsx',
    ]) {
      let src = '';
      try { src = screen(name); } catch { continue; }
      expect(`${name}:${/Delete expense|deleteExpense\(/.test(src)}`).toBe(`${name}:false`);
    }
  });
});
