/**
 * A REAL SQLite database for tests.
 *
 * The activity layer is a UNION across three tables with two joins. A mocked
 * database object would prove nothing about it -- it would only prove that the
 * mock returns whatever the test told it to. So these tests run the ACTUAL SQL
 * against an actual SQLite engine (node:sqlite, built into Node), wrapped to
 * look like expo-sqlite so production code runs unmodified.
 *
 * The schema below mirrors src/database/database.ts. A test asserts the two
 * stay in step, so this cannot quietly drift into testing a fictional shape.
 */

const { DatabaseSync } = require('node:sqlite');

export interface TestDb {
  getAllAsync: (sql: string, args?: any[]) => Promise<any[]>;
  getFirstAsync: (sql: string, args?: any[]) => Promise<any>;
  runAsync: (sql: string, args?: any[]) => Promise<{ changes: number; lastInsertRowId: number }>;
  execAsync: (sql: string) => Promise<void>;
  raw: any;
}

export const TEST_SCHEMA = `
  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL, category TEXT NOT NULL, note TEXT,
    date TEXT NOT NULL, photo_uri TEXT, is_recurring INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL, label TEXT, date TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
    schedule_id INTEGER, cycle_date TEXT
  );
  CREATE TABLE bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, amount REAL NOT NULL, due_day INTEGER,
    frequency TEXT DEFAULT 'monthly', due_weekday INTEGER,
    category TEXT, is_paid INTEGER DEFAULT 0, photo_uri TEXT,
    payment_method TEXT DEFAULT 'manual', auto_confirm INTEGER DEFAULT 0
  );
  CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, amount REAL NOT NULL, billing_day INTEGER NOT NULL,
    is_paid INTEGER DEFAULT 0, notes TEXT,
    payment_method TEXT DEFAULT 'auto', auto_confirm INTEGER DEFAULT 0
  );
  CREATE TABLE bill_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL, source TEXT NOT NULL, cycle_date TEXT NOT NULL,
    paid INTEGER DEFAULT 1, paid_at TEXT, amount REAL, status TEXT DEFAULT 'confirmed',
    UNIQUE(source, bill_id, cycle_date)
  );
  CREATE TABLE merchant_memory (
    name_key TEXT PRIMARY KEY, display_name TEXT NOT NULL, doc_type TEXT NOT NULL,
    category TEXT, recurring INTEGER DEFAULT 0, last_amount REAL, avg_amount REAL,
    due_day INTEGER, times_seen INTEGER DEFAULT 1, last_seen TEXT
  );
  CREATE TABLE income_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL, amount REAL NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    day_of_month INTEGER, weekday INTEGER, active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), anchor_date TEXT
  );
  CREATE TABLE savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  );

  -- The remaining user-owned tables. A backup restores into ALL of them, so a
  -- schema missing these made a perfectly good restore look like a failure.
  CREATE TABLE settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  );
  CREATE TABLE debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, total_amount REAL NOT NULL, amount_paid REAL DEFAULT 0,
    minimum_payment REAL DEFAULT 0, monthly_payment REAL DEFAULT 0,
    apr REAL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE calendar_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, time TEXT NOT NULL, title TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE custom_logos (
    key TEXT PRIMARY KEY, uri TEXT NOT NULL, updated_at INTEGER
  );
`;

/** Fresh in-memory database with the schema applied. */
export function makeRealDb(): TestDb {
  const db = new DatabaseSync(':memory:');
  db.exec(TEST_SCHEMA);

  // expo-sqlite passes '?' parameters; node:sqlite wants them spread.
  const bind = (stmt: any, args: any[]) =>
    args.map(a => (a === undefined ? null : a));

  return {
    raw: db,
    async getAllAsync(sql: string, args: any[] = []) {
      return db.prepare(sql).all(...bind(null, args)) as any[];
    },
    async getFirstAsync(sql: string, args: any[] = []) {
      const row = db.prepare(sql).get(...bind(null, args));
      return row === undefined ? null : row;
    },
    async runAsync(sql: string, args: any[] = []) {
      const r = db.prepare(sql).run(...bind(null, args));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async execAsync(sql: string) { db.exec(sql); },
  };
}
