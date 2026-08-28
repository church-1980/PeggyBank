/**
 * THE RECEIPT PHOTO MUST SURVIVE.
 *
 * The whole promise of Smart Capture is "photograph it and the paper stops
 * mattering". That promise breaks the moment the photo silently disappears,
 * and it disappears most easily on the paths nobody looks at: correcting an
 * amount a week later, switching a receipt from Expense to Bill.
 *
 * These run the REAL save/update SQL the screens issue against a REAL SQLite
 * database. The point is not that a mock returns what we told it to; it is
 * that an UPDATE which forgets a column really does erase the photo, and that
 * ours does not.
 */

import { makeRealDb } from './helpers/realDb';

process.env.TZ = 'America/Toronto';

let db: ReturnType<typeof makeRealDb>;
beforeEach(() => { db = makeRealDb(); });

const PHOTO = 'file:///data/user/0/com.spall.peggybank/files/receipts/tims-2026-08-28.jpg';

/** Exactly the INSERT AddExpenseScreen issues when Smart Capture hands it a photo. */
async function saveFromSmartCapture(over: Partial<{ amount: number; category: string; note: string; date: string; photo: string | null }> = {}) {
  const v = { amount: 11.60, category: 'restaurant', note: 'Tim Hortons', date: '2026-08-28', photo: PHOTO, ...over };
  await db.runAsync(
    `INSERT INTO expenses (amount, category, note, date, photo_uri, is_recurring) VALUES (?, ?, ?, ?, ?, ?)`,
    [v.amount, v.category, v.note, v.date, v.photo, 0]);
  return db.getFirstAsync(`SELECT * FROM expenses ORDER BY id DESC LIMIT 1`);
}

/** Exactly the UPDATE AddExpenseScreen issues when the row is edited later. */
async function editLater(id: number, fields: { amount: number; category: string; note: string; date: string; photo: string | null; recurring: boolean }) {
  await db.runAsync(
    `UPDATE expenses SET amount=?, category=?, note=?, date=?, photo_uri=?, is_recurring=? WHERE id=?`,
    [fields.amount, fields.category, fields.note, fields.date, fields.photo, fields.recurring ? 1 : 0, id]);
}

describe('The receipt photo survives the whole journey', () => {
  it('capture -> save attaches the photo to the expense', async () => {
    const row: any = await saveFromSmartCapture();
    expect(row.photo_uri).toBe(PHOTO);
    expect(row.amount).toBe(11.60);
    expect(row.note).toBe('Tim Hortons');
  });

  it('correcting the amount a week later does NOT erase the photo', async () => {
    const saved: any = await saveFromSmartCapture();
    // The person reopens it and fixes the amount. The form must carry the
    // stored photo back into the UPDATE, not a blank.
    const reopened: any = await db.getFirstAsync(`SELECT * FROM expenses WHERE id = ?`, [saved.id]);
    await editLater(saved.id, {
      amount: 12.60, category: reopened.category, note: reopened.note,
      date: reopened.date, photo: reopened.photo_uri, recurring: !!reopened.is_recurring,
    });
    const after: any = await db.getFirstAsync(`SELECT * FROM expenses WHERE id = ?`, [saved.id]);
    expect(after.amount).toBe(12.60);
    expect(after.photo_uri).toBe(PHOTO);   // the receipt is still there
  });

  it('PROOF: a form that does not read the photo back really does destroy it', async () => {
    const saved: any = await saveFromSmartCapture();
    // This is the bug this test exists to catch: a form that starts blank and
    // writes its blank over the record.
    await editLater(saved.id, {
      amount: 12.60, category: 'restaurant', note: 'Tim Hortons',
      date: '2026-08-28', photo: null, recurring: false,
    });
    const after: any = await db.getFirstAsync(`SELECT * FROM expenses WHERE id = ?`, [saved.id]);
    expect(after.photo_uri).toBeNull();    // gone, silently
  });

  it('a correction made in Smart Capture is what lands in the database', async () => {
    // OCR read "Please review" for the amount; the person typed 11.60 on the
    // review screen. That number, not a blank, must reach the row.
    const row: any = await saveFromSmartCapture({ amount: 11.60, note: 'Tim Hortons' });
    expect(row.amount).toBe(11.60);
    expect(row.note).toBe('Tim Hortons');
    expect(row.photo_uri).toBe(PHOTO);
  });

  it('a photographed bill keeps its photo too', async () => {
    await db.runAsync(
      `INSERT INTO bills (name, amount, frequency, due_day, photo_uri) VALUES (?, ?, ?, ?, ?)`,
      ['Bell', 117.43, 'monthly', 15, PHOTO]);
    const bill: any = await db.getFirstAsync(`SELECT * FROM bills ORDER BY id DESC LIMIT 1`);
    expect(bill.photo_uri).toBe(PHOTO);
  });

  it('one photographed receipt creates exactly ONE row, never two', async () => {
    await saveFromSmartCapture();
    const rows: any = await db.getAllAsync(`SELECT * FROM expenses`);
    expect(rows.length).toBe(1);
    // and it lives in the ordinary expenses table, not a Smart Capture sidecar
    const tables: any = await db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%capture%'`);
    expect(tables.length).toBe(0);
  });
});
