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
  `);

  // Safe migrations — silently skip if column already exists
  const migrations = [
    `ALTER TABLE bills ADD COLUMN frequency TEXT DEFAULT 'monthly'`,
    `ALTER TABLE bills ADD COLUMN due_weekday INTEGER`,
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
}
