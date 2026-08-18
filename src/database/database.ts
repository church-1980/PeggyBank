import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Concurrent callers piggyback on the same in-flight open
  if (opening) return opening;

  if (db) {
    try {
      await db.getFirstAsync('SELECT 1');
      return db;
    } catch {
      db = null;
      // Fall through to reopen
    }
  }

  // Check again — another concurrent caller may have started opening
  // while we were awaiting the health check above
  if (!opening) {
    opening = SQLite.openDatabaseAsync('peggybank.db')
      .then(d => { db = d; opening = null; return d; })
      .catch(e => { opening = null; throw e; });
  }
  return opening;
}

export async function setupDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`PRAGMA journal_mode = WAL;`);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      photo_uri TEXT,
      is_recurring INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      label TEXT,
      date TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT DEFAULT 'monthly',
      due_day INTEGER,
      due_weekday INTEGER,
      category TEXT DEFAULT 'bills',
      is_paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      minimum_payment REAL DEFAULT 0,
      monthly_payment REAL DEFAULT 0,
      apr REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      billing_day INTEGER NOT NULL,
      is_paid INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calendar_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_logos (
      key TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      updated_at INTEGER
    );

    -- What the camera has LEARNED about a vendor. Every time a photographed
    -- document is saved the merchant is recorded here with how it was filed,
    -- so the next photo of that vendor fills itself in — including vendors
    -- the built-in list has never heard of.
    CREATE TABLE IF NOT EXISTS merchant_memory (
      name_key      TEXT PRIMARY KEY,
      display_name  TEXT NOT NULL,
      doc_type      TEXT NOT NULL,
      category      TEXT,
      recurring     INTEGER DEFAULT 0,
      last_amount   REAL,
      avg_amount    REAL,
      due_day       INTEGER,
      times_seen    INTEGER DEFAULT 1,
      last_seen     TEXT
    );
  `);

  // Safe migrations — silently skip if column already exists
  const migrations = [
    `ALTER TABLE bills ADD COLUMN frequency TEXT DEFAULT 'monthly'`,
    `ALTER TABLE bills ADD COLUMN due_weekday INTEGER`,
    `ALTER TABLE bills ADD COLUMN photo_uri TEXT`,
    `ALTER TABLE expenses ADD COLUMN photo_uri TEXT`,
    `ALTER TABLE expenses ADD COLUMN is_recurring INTEGER DEFAULT 0`,
    `ALTER TABLE subscriptions ADD COLUMN is_paid INTEGER DEFAULT 0`,
    `ALTER TABLE savings_goals ADD COLUMN goal_type TEXT`,
    `ALTER TABLE savings_goals ADD COLUMN pinned INTEGER DEFAULT 0`,
    `ALTER TABLE savings_goals ADD COLUMN custom_image_uri TEXT`,
  ];
  for (const sql of migrations) {
    try { await database.execAsync(sql + ';'); } catch {}
  }

  // ── ONE-TIME CLEANUP: duplicate paychecks ──────────────────────────────────
  // The Payday Planner used to INSERT a new 'Paycheck' income row on every save,
  // so re-saving a plan stacked several rows for the same day and inflated
  // income. Saving now updates that day's paycheck instead; this clears rows the
  // old behaviour already created.
  //
  // Deliberately narrow: only rows whose label is exactly 'Paycheck', and only
  // where more than one exists for the SAME date — the newest is kept, earlier
  // ones for that date are removed. Income with any other label is never
  // touched. Guarded by a flag so it can only ever run once.
  try {
    const done = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'paycheck_dedupe_v1'`
    );
    if (!done) {
      const DUPES = `label = 'Paycheck'
        AND id NOT IN (SELECT MAX(id) FROM income WHERE label = 'Paycheck' GROUP BY date)`;
      const found = await database.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM income WHERE ${DUPES}`
      );
      if ((found?.n ?? 0) > 0) {
        await database.runAsync(`DELETE FROM income WHERE ${DUPES}`);
        console.log(`[db] removed ${found?.n} duplicate paycheck row(s)`);
      }
      await database.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('paycheck_dedupe_v1', 'done')`
      );
    }
  } catch (e) {
    console.warn('[db] paycheck dedupe skipped:', e);
  }
}

// Every PeggyBank-owned table. Used by the destructive wipe.
const ALL_TABLES = [
  'expenses', 'income', 'bills', 'savings_goals',
  'debts', 'subscriptions', 'calendar_reminders', 'settings', 'custom_logos',
  'merchant_memory',
];

/**
 * Delete ALL local PeggyBank data, transactionally. Does NOT touch files on
 * disk — the caller (Profile delete flow) handles receipt-image cleanup and the
 * app reset. Throws on failure so the caller can report it.
 */
export async function wipeAllLocalData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION;');
  try {
    for (const table of ALL_TABLES) {
      // Guard each table so a missing table can't abort the whole wipe.
      try { await database.execAsync(`DELETE FROM ${table};`); } catch {}
    }
    await database.execAsync('COMMIT;');
  } catch (e) {
    try { await database.execAsync('ROLLBACK;'); } catch {}
    throw e;
  }
}
