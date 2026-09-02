/**
 * A REAL round trip, against REAL SQLite, using the app's REAL schema.
 *
 * The existing backup tests drive an in-memory stand-in for the database. That
 * is the right tool for forcing a write to fail mid-restore, but it cannot
 * prove the thing a user actually cares about: that exporting, wiping the
 * phone and restoring gives them back what they had. A fake store will happily
 * accept rows that real SQLite would reject.
 *
 * So this file builds a genuine database with node:sqlite, using the CREATE
 * TABLE and ALTER TABLE statements read out of src/database/database.ts. The
 * schema is never copied here by hand: if the app's schema changes and the
 * backup cannot carry it, these tests fail rather than testing a stale replica.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { buildBackup, restoreBackup } from '../lib/backupCore';
import { BACKUP_TABLES } from '../lib/backupSchema';

const DB_SOURCE = path.join(__dirname, '..', 'database', 'database.ts');

/** The CREATE TABLE block exactly as the app declares it. */
function realSchemaSql(): string {
  const text = fs.readFileSync(DB_SOURCE, 'utf8');
  const start = text.indexOf('CREATE TABLE IF NOT EXISTS expenses');
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('`);', start);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

/** The ALTER TABLE migrations, which is where several backed-up columns live. */
function realMigrations(): string[] {
  const text = fs.readFileSync(DB_SOURCE, 'utf8');
  const at = text.indexOf('const migrations = [');
  expect(at).toBeGreaterThan(-1);
  const end = text.indexOf('\n  ];', at);
  const block = text.slice(at, end);
  const out: string[] = [];
  const marker = 'ALTER TABLE';
  let i = 0;
  while ((i = block.indexOf(marker, i)) !== -1) {
    const tick = block.indexOf('`', i);
    const line = block.slice(i, tick === -1 ? undefined : tick).trim();
    out.push(line);
    i += marker.length;
  }
  return out;
}

/**
 * expo-sqlite's async surface over node:sqlite, which is synchronous. Only the
 * three calls backupCore uses are implemented.
 */
function realDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(realSchemaSql());
  for (const sql of realMigrations()) {
    try { raw.exec(sql); } catch { /* column already present, as in the app */ }
  }
  return {
    raw,
    async getAllAsync(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).all(...(params as never[]));
    },
    async execAsync(sql: string) { raw.exec(sql); },
    async runAsync(sql: string, params: unknown[] = []) {
      return raw.prepare(sql).run(...(params as never[]));
    },
  } as any;
}

/**
 * One of everything, with the awkward cases deliberately included: a null
 * where a value is allowed, a weekly bill, an early payment, a failed
 * auto-payment, a leap day, a year boundary, an apostrophe in a name and an
 * amount that does not divide cleanly.
 */
function seed(db: any) {
  const run = (sql: string, v: unknown[] = []) => db.raw.prepare(sql).run(...(v as never[]));

  run(`INSERT INTO expenses (id, amount, category, note, date, photo_uri, is_recurring, created_at)
       VALUES (1, 42.55, 'groceries', 'Logan''s Ku', '2026-02-29', 'file:///receipts/a.jpg', 0, '2026-02-29T10:00:00.000Z')`);
  run(`INSERT INTO expenses (id, amount, category, note, date, photo_uri, is_recurring, created_at)
       VALUES (2, 7.10, 'coffee', NULL, '2025-12-31', NULL, 1, '2025-12-31T23:59:00.000Z')`);

  run(`INSERT INTO income_schedules (id, label, amount, frequency, day_of_month, weekday, active, created_at, anchor_date)
       VALUES (3, 'Pay', 2200, 'biweekly', NULL, 5, 1, 'x', '2026-01-02')`);
  run(`INSERT INTO income (id, amount, label, date, is_recurring, created_at, schedule_id, cycle_date)
       VALUES (1, 2200, 'Paycheque', '2026-01-02', 1, 'x', 3, '2026-01-02')`);
  run(`INSERT INTO income (id, amount, label, date, is_recurring, created_at, schedule_id, cycle_date)
       VALUES (2, 50, 'Side job', '2026-01-11', 0, 'x', NULL, NULL)`);

  run(`INSERT INTO bills (id, name, amount, frequency, due_day, due_weekday, category, is_paid, photo_uri, payment_method, auto_confirm, created_at)
       VALUES (1, 'Bell', 117.00, 'monthly', 5, NULL, 'bills', 0, 'file:///receipts/bell.jpg', 'auto', 1, 'x')`);
  run(`INSERT INTO bills (id, name, amount, frequency, due_day, due_weekday, category, is_paid, photo_uri, payment_method, auto_confirm, created_at)
       VALUES (2, 'Window cleaner', 30, 'weekly', NULL, 3, 'bills', 0, NULL, 'manual', 0, 'x')`);

  run(`INSERT INTO subscriptions (id, name, amount, billing_day, is_paid, notes, payment_method, auto_confirm, created_at)
       VALUES (1, 'Netflix', 16.49, 22, 1, 'family plan', 'auto', 0, 'x')`);

  run(`INSERT INTO savings_goals (id, name, target_amount, current_amount, deadline, goal_type, pinned, custom_image_uri, created_at)
       VALUES (1, 'Vacation', 2000, 250.75, '2026-12-01', 'vacation', 1, 'file:///receipts/goal.jpg', 'x')`);
  run(`INSERT INTO debts (id, name, total_amount, amount_paid, minimum_payment, monthly_payment, apr, notes, created_at)
       VALUES (1, 'Visa', 2500, 100, 50, 150, 19.99, 'card', 'x')`);
  run(`INSERT INTO calendar_reminders (id, date, time, title, created_at)
       VALUES (1, '2026-02-29', '09:00', 'Leap day reminder', 'x')`);
  run(`INSERT INTO custom_logos (key, uri, updated_at) VALUES ('bell', 'file:///logos/bell.png', 1)`);
  run(`INSERT INTO merchant_memory (name_key, display_name, doc_type, category, recurring, last_amount, avg_amount, due_day, times_seen, last_seen)
       VALUES ('bell', 'Bell', 'bill', 'bills', 1, 117.00, 116.50, 5, 4, '2026-01-05')`);

  // Settings: the user's preferences, including language and notifications.
  for (const [k, v] of [
    ['display_name', "Paul"], ['appearance_mode', 'dark'], ['language', 'fr'],
    ['notification_mode', 'gentle'], ['payday', '15'], ['pay_frequency', 'biweekly'],
    ['nav_slots', 'home,calendar,more'], ['profile_photo_uri', 'file:///receipts/me.jpg'],
  ]) run(`INSERT INTO settings (key, value) VALUES (?, ?)`, [k, v]);

  // Payment state: an EARLY manual payment, and a FAILED auto-payment. These
  // are the two rows whose meaning is destroyed if a column is dropped.
  run(`INSERT INTO bill_payments (id, bill_id, source, cycle_date, paid, paid_at, amount, status)
       VALUES (1, 1, 'bill', '2026-01-05', 1, '2026-01-02T14:00:00.000Z', 117.00, 'confirmed')`);
  run(`INSERT INTO bill_payments (id, bill_id, source, cycle_date, paid, paid_at, amount, status)
       VALUES (2, 1, 'bill', '2026-02-05', 0, '2026-02-05T14:00:00.000Z', NULL, 'failed')`);
  run(`INSERT INTO bill_payments (id, bill_id, source, cycle_date, paid, paid_at, amount, status)
       VALUES (3, 1, 'subscription', '2026-01-22', 1, '2026-01-22T14:00:00.000Z', 16.49, 'assumed')`);
}

function snapshot(db: any): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  for (const spec of BACKUP_TABLES) {
    out[spec.table] = db.raw
      .prepare(`SELECT ${spec.columns.join(', ')} FROM ${spec.table} ORDER BY ${spec.primaryKey}`)
      .all();
  }
  return out;
}

describe('Export, wipe the phone, restore', () => {
  it('gives back every row of every table, field for field', async () => {
    const before = realDb();
    seed(before);
    const original = snapshot(before);
    const backup = await buildBackup(before);

    // A different device: a brand new empty database.
    const after = realDb();
    for (const spec of BACKUP_TABLES) {
      expect(after.raw.prepare(`SELECT COUNT(*) c FROM ${spec.table}`).get().c).toBe(0);
    }

    const report = await restoreBackup(after, JSON.parse(JSON.stringify(backup)));
    expect(report.success).toBe(true);

    expect(snapshot(after)).toEqual(original);
  });

  it('restores something in every table, so an empty pass cannot look like success', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    for (const spec of BACKUP_TABLES) {
      const n = after.raw.prepare(`SELECT COUNT(*) c FROM ${spec.table}`).get().c as number;
      expect(`${spec.table}=${n > 0}`).toBe(`${spec.table}=true`);
    }
  });
});

describe('Relationships survive, not just row counts', () => {
  it('each payment still belongs to the right bill occurrence', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    const joined = after.raw.prepare(
      `SELECT b.name, p.source, p.cycle_date, p.paid, p.status, p.amount
         FROM bill_payments p JOIN bills b ON b.id = p.bill_id
        ORDER BY p.id`
    ).all();

    expect(joined).toEqual([
      { name: 'Bell', source: 'bill',         cycle_date: '2026-01-05', paid: 1, status: 'confirmed', amount: 117 },
      { name: 'Bell', source: 'bill',         cycle_date: '2026-02-05', paid: 0, status: 'failed',    amount: null },
      { name: 'Bell', source: 'subscription', cycle_date: '2026-01-22', paid: 1, status: 'assumed',   amount: 16.49 },
    ]);
  });

  it('an early payment is still early, not merely paid', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    const row = after.raw.prepare(
      `SELECT cycle_date, paid_at FROM bill_payments WHERE id = 1`
    ).get() as { cycle_date: string; paid_at: string };
    expect(row.paid_at < row.cycle_date).toBe(true);
  });

  it('settled income still points at the payday it settled', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    const row = after.raw.prepare(
      `SELECT i.cycle_date, s.label FROM income i JOIN income_schedules s ON s.id = i.schedule_id WHERE i.id = 1`
    ).get();
    expect(row).toEqual({ cycle_date: '2026-01-02', label: 'Pay' });
  });

  it('the one-payment-per-occurrence rule is still enforced after a restore', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    // A restore that dropped the UNIQUE index would let August be paid twice.
    expect(() =>
      after.raw.prepare(
        `INSERT INTO bill_payments (bill_id, source, cycle_date, paid) VALUES (1, 'bill', '2026-01-05', 1)`
      ).run()
    ).toThrow();
  });
});

describe('The awkward values come back unchanged', () => {
  it('keeps leap days, year ends, apostrophes, nulls and uneven amounts', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    const rows = after.raw.prepare(`SELECT * FROM expenses ORDER BY id`).all() as any[];
    expect(rows[0].date).toBe('2026-02-29');
    expect(rows[0].note).toBe("Logan's Ku");
    expect(rows[0].amount).toBe(42.55);
    expect(rows[1].date).toBe('2025-12-31');
    expect(rows[1].note).toBeNull();

    const goal = after.raw.prepare(`SELECT current_amount, pinned FROM savings_goals WHERE id = 1`).get() as any;
    expect(goal.current_amount).toBe(250.75);
    expect(goal.pinned).toBe(1);
  });

  it('every preference comes back, including language and notifications', async () => {
    const before = realDb();
    seed(before);
    const backup = await buildBackup(before);
    const after = realDb();
    await restoreBackup(after, JSON.parse(JSON.stringify(backup)));

    const got = Object.fromEntries(
      (after.raw.prepare(`SELECT key, value FROM settings`).all() as any[]).map(r => [r.key, r.value])
    );
    expect(got.language).toBe('fr');
    expect(got.notification_mode).toBe('gentle');
    expect(got.appearance_mode).toBe('dark');
    expect(got.payday).toBe('15');
  });

  it('survives the trip through an actual JSON file, not just an object', async () => {
    const before = realDb();
    seed(before);
    const original = snapshot(before);
    const text = JSON.stringify(await buildBackup(before), null, 2);

    const after = realDb();
    await restoreBackup(after, JSON.parse(text));
    expect(snapshot(after)).toEqual(original);
  });
});

describe('A failed restore costs the user nothing', () => {
  it('leaves the existing database untouched when the file is malformed', async () => {
    const db = realDb();
    seed(db);
    const original = snapshot(db);

    for (const bad of [null, 'not a backup', 42, {}, { version: 'two' }, { version: 99 }]) {
      const report = await restoreBackup(db, bad);
      expect(report.success).toBe(false);
      expect(snapshot(db)).toEqual(original);
    }
  });

  it('leaves the existing database untouched when a row is the wrong shape', async () => {
    const db = realDb();
    seed(db);
    const original = snapshot(db);
    const backup: any = await buildBackup(db);
    backup.expenses = ['this is not a row'];

    expect((await restoreBackup(db, backup)).success).toBe(false);
    expect(snapshot(db)).toEqual(original);
  });

  it('a truncated file is refused rather than half-applied', async () => {
    const db = realDb();
    seed(db);
    const original = snapshot(db);
    const text = JSON.stringify(await buildBackup(db));

    let parsed: unknown = 'unparsed';
    try { parsed = JSON.parse(text.slice(0, Math.floor(text.length / 2))); } catch { parsed = undefined; }
    expect((await restoreBackup(db, parsed)).success).toBe(false);
    expect(snapshot(db)).toEqual(original);
  });
});

describe('Atomicity, proven on a real database rather than a stand-in', () => {
  /**
   * A backup whose shape is valid but whose CONTENT real SQLite will refuse
   * partway through: bills.name is NOT NULL. Expenses are written before bills
   * are reached, so a non-atomic restore leaves the user with some of the new
   * data, none of their old data, and no way back.
   */
  function poisoned(backup: any) {
    const copy = JSON.parse(JSON.stringify(backup));
    copy.bills = [{ ...copy.bills[0], name: null }];
    return copy;
  }

  it('a restore that fails partway leaves the ORIGINAL data completely intact', async () => {
    const db = realDb();
    seed(db);
    const original = snapshot(db);
    const good = await buildBackup(db);

    const report = await restoreBackup(db, poisoned(good));

    expect(report.success).toBe(false);
    // Not "roughly the same" and not "the right number of rows" — identical.
    expect(snapshot(db)).toEqual(original);
  });

  it('and the failure never leaves a half-written table behind', async () => {
    const db = realDb();
    seed(db);
    const good = await buildBackup(db);
    const expensesBefore = db.raw.prepare(`SELECT * FROM expenses ORDER BY id`).all();

    await restoreBackup(db, poisoned(good));

    // expenses are restored BEFORE bills, so this is the table that would show
    // a partial write if the transaction were not doing its job.
    expect(db.raw.prepare(`SELECT * FROM expenses ORDER BY id`).all()).toEqual(expensesBefore);
  });

  it('says nothing was changed, and means it', async () => {
    const db = realDb();
    seed(db);
    const good = await buildBackup(db);
    const report = await restoreBackup(db, poisoned(good));
    expect(report.message).toContain('nothing was changed');
  });

  /**
   * The order matters as much as the transaction: a file must be judged
   * unacceptable BEFORE the first DELETE runs, not after.
   */
  it('a backup from a newer app version never deletes anything', async () => {
    const db = realDb();
    seed(db);
    const original = snapshot(db);

    const fromTheFuture: any = await buildBackup(db);
    fromTheFuture.version = 999;

    const report = await restoreBackup(db, fromTheFuture);
    expect(report.success).toBe(false);
    expect(snapshot(db)).toEqual(original);
  });

  it('an empty but valid-looking file does not quietly erase the user', async () => {
    const db = realDb();
    seed(db);
    const original = snapshot(db);

    // No table keys at all: there is nothing to restore, so there is nothing
    // to clear either. Absence of data is not an instruction to delete data.
    await restoreBackup(db, { version: 2, exportedAt: '2026-09-02T00:00:00.000Z' });
    expect(snapshot(db)).toEqual(original);
  });
});
