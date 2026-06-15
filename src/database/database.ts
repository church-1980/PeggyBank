import * as SQLite from 'expo-sqlite';
import { MAINTENANCE_GUIDES, GUIDE_STEPS } from '../data/maintenanceGuides';

let db: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (opening) return opening;

  if (db) {
    try {
      await db.getFirstAsync('SELECT 1');
      return db;
    } catch {
      db = null;
    }
  }

  if (!opening) {
    opening = SQLite.openDatabaseAsync('plasticsurgeon.db')
      .then(d => { db = d; opening = null; return d; })
      .catch(e => { opening = null; throw e; });
  }
  return opening;
}

export async function setupDatabase(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync(`PRAGMA journal_mode = WAL;`);

  await database.execAsync(`
    -- Registered 3D printers
    CREATE TABLE IF NOT EXISTS printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      printer_type TEXT NOT NULL DEFAULT 'FDM',
      serial_number TEXT,
      purchase_date TEXT,
      notes TEXT,
      photo_uri TEXT,
      total_print_hours REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Scheduled maintenance tasks per printer
    -- Supports both calendar intervals (interval_days) and usage intervals (interval_hours)
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      task_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      interval_hours REAL,
      interval_days INTEGER,
      last_done_at TEXT,
      last_done_hours REAL,
      next_due_at TEXT,
      next_due_hours REAL,
      priority TEXT DEFAULT 'normal',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Completed maintenance log
    CREATE TABLE IF NOT EXISTS maintenance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      task_key TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      print_hours_at_service REAL,
      cost REAL,
      parts_replaced_json TEXT,
      photos_json TEXT,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Visual inspection sessions
    -- Camera inspection is a core feature — photo_uri is on every result row.
    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      inspection_type TEXT NOT NULL DEFAULT 'quick',
      status TEXT DEFAULT 'in_progress',
      notes TEXT,
      overall_score INTEGER,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Per-checkpoint results within an inspection
    -- photo_uri: local device path — photos never leave the device unless user exports
    CREATE TABLE IF NOT EXISTS inspection_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
      check_point TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'skip',
      notes TEXT,
      photo_uri TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Print job history — feeds total_print_hours on the printer row
    CREATE TABLE IF NOT EXISTS print_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      printer_id INTEGER NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
      name TEXT,
      filament_type TEXT,
      filament_color TEXT,
      print_hours REAL NOT NULL DEFAULT 0,
      success INTEGER DEFAULT 1,
      failure_reason TEXT,
      failure_photo_uri TEXT,
      notes TEXT,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Offline maintenance guides — seeded at first launch, always available offline
    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guide_key TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      difficulty TEXT DEFAULT 'beginner',
      estimated_minutes INTEGER,
      printer_types_json TEXT,
      tools_needed_json TEXT,
      parts_needed_json TEXT,
      safety_warnings_json TEXT,
      is_premium INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Step-by-step instructions for each guide
    CREATE TABLE IF NOT EXISTS guide_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      instruction TEXT NOT NULL,
      safety_note TEXT,
      image_key TEXT,
      tip TEXT,
      requires_camera INTEGER DEFAULT 0
    );

    -- App settings (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Safe migrations — silently skip if column already exists
  const migrations = [
    `ALTER TABLE printers ADD COLUMN photo_uri TEXT`,
    `ALTER TABLE printers ADD COLUMN serial_number TEXT`,
    `ALTER TABLE maintenance_tasks ADD COLUMN next_due_at TEXT`,
    `ALTER TABLE maintenance_tasks ADD COLUMN next_due_hours REAL`,
    `ALTER TABLE maintenance_history ADD COLUMN cost REAL`,
    `ALTER TABLE maintenance_history ADD COLUMN photos_json TEXT`,
  ];
  for (const sql of migrations) {
    try { await database.execAsync(sql + ';'); } catch {}
  }

  await seedGuides(database);
}

// Seed offline guide content on first launch.
// Uses INSERT OR IGNORE so re-running is always safe.
async function seedGuides(database: SQLite.SQLiteDatabase): Promise<void> {
  for (const guide of MAINTENANCE_GUIDES) {
    await database.runAsync(
      `INSERT OR IGNORE INTO guides
        (guide_key, title, description, category, difficulty, estimated_minutes,
         printer_types_json, tools_needed_json, parts_needed_json, safety_warnings_json, is_premium)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guide.guide_key,
        guide.title,
        guide.description ?? null,
        guide.category,
        guide.difficulty,
        guide.estimated_minutes ?? null,
        JSON.stringify(guide.printer_types ?? []),
        JSON.stringify(guide.tools_needed ?? []),
        JSON.stringify(guide.parts_needed ?? []),
        JSON.stringify(guide.safety_warnings ?? []),
        guide.is_premium ? 1 : 0,
      ]
    );

    const row = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM guides WHERE guide_key = ?`, [guide.guide_key]
    );
    if (!row) continue;

    const guideId = row.id;
    for (const step of GUIDE_STEPS[guide.guide_key] ?? []) {
      await database.runAsync(
        `INSERT OR IGNORE INTO guide_steps
           (guide_id, step_number, title, instruction, safety_note, image_key, tip, requires_camera)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          guideId,
          step.step_number,
          step.title,
          step.instruction,
          step.safety_note ?? null,
          step.image_key ?? null,
          step.tip ?? null,
          step.requires_camera ? 1 : 0,
        ]
      );
    }
  }
}
