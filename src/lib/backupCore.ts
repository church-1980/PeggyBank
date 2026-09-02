import type { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_TABLES, BACKUP_VERSION, IMAGE_REFERENCE_COLUMNS, IMAGE_SETTING_KEYS } from './backupSchema';

/**
 * The database half of backup/restore, with no file picker or sharing in it, so
 * it can be tested directly — including the failure paths that matter most.
 */

export interface BackupData {
  version: number;
  exportedAt: string;
  [table: string]: unknown;
}

export interface RestoreReport {
  success: boolean;
  message: string;
  restored?: Record<string, number>;
  /** Image paths that no longer resolve (see IMAGE POLICY in backupSchema). */
  missingImageRefs?: number;
}

/** Read every table in the manifest into a backup object. */
export async function buildBackup(db: SQLiteDatabase): Promise<BackupData> {
  const out: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
  };
  for (const spec of BACKUP_TABLES) {
    try {
      out[spec.table] = await db.getAllAsync(
        `SELECT ${spec.columns.join(', ')} FROM ${spec.table}`
      );
    } catch {
      // A table that does not exist yet in this install backs up as empty
      // rather than aborting the whole export.
      out[spec.table] = [];
    }
  }
  return out;
}

/**
 * Validate BEFORE anything is deleted. A malformed file must never cost the
 * user their existing data.
 */
export function validateBackup(parsed: unknown): { ok: true; data: BackupData } | { ok: false; error: string } {
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'This file is not a PeggyBank backup.' };
  }
  const b = parsed as BackupData;

  if (typeof b.version !== 'number') {
    return { ok: false, error: 'This file is missing a backup version.' };
  }
  if (b.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `This backup was made by a newer version of PeggyBank (v${b.version}). Update the app first.`,
    };
  }
  for (const spec of BACKUP_TABLES) {
    const rows = b[spec.table];
    if (rows === undefined) {
      // Older backups legitimately predate newer tables.
      if (spec.required && b.version >= BACKUP_VERSION) {
        return { ok: false, error: `Backup is missing required data: ${spec.table}.` };
      }
      continue;
    }
    if (!Array.isArray(rows)) {
      return { ok: false, error: `Backup data for ${spec.table} is not in the expected format.` };
    }
    for (const row of rows) {
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        return { ok: false, error: `Backup data for ${spec.table} contains an invalid record.` };
      }
    }
  }
  if (b.version >= 1 && !Array.isArray(b.expenses)) {
    return { ok: false, error: 'This file does not look like a PeggyBank backup.' };
  }
  return { ok: true, data: b };
}

/**
 * Restore atomically: everything succeeds, or the database is left exactly as
 * it was. Previously this deleted all user data first and inserted afterwards
 * with no transaction, so a failure part-way left the user with neither their
 * old data nor a complete restore.
 */
export async function restoreBackup(db: SQLiteDatabase, parsed: unknown): Promise<RestoreReport> {
  const check = validateBackup(parsed);
  if (!check.ok) return { success: false, message: check.error };
  const backup = check.data;

  const restored: Record<string, number> = {};
  let began = false;

  try {
    await db.execAsync('BEGIN TRANSACTION;');
    began = true;

    for (const spec of BACKUP_TABLES) {
      const rows = (backup[spec.table] as Record<string, unknown>[] | undefined) ?? [];

      // Only clear a table we are about to repopulate from this backup.
      if (backup[spec.table] === undefined) continue;

      await db.execAsync(`DELETE FROM ${spec.table};`);

      const cols = spec.columns.join(', ');
      const placeholders = spec.columns.map(() => '?').join(', ');
      for (const row of rows) {
        const values = spec.columns.map((c) => (row[c] === undefined ? null : row[c]));
        await db.runAsync(
          `INSERT OR REPLACE INTO ${spec.table} (${cols}) VALUES (${placeholders})`,
          values as never[]
        );
      }
      restored[spec.table] = rows.length;
    }

    await db.execAsync('COMMIT;');
  } catch (e) {
    if (began) {
      try { await db.execAsync('ROLLBACK;'); } catch {}
    }
    return {
      success: false,
      message: `Restore failed and nothing was changed. Your existing data is intact. (${String(e)})`,
    };
  }

  // Count image references that will not resolve (see IMAGE POLICY).
  let missingImageRefs = 0;
  for (const { table, column } of IMAGE_REFERENCE_COLUMNS) {
    const rows = (backup[table] as Record<string, unknown>[] | undefined) ?? [];
    for (const row of rows) if (row[column]) missingImageRefs++;
  }

  const total = Object.values(restored).reduce((a, b) => a + b, 0);
  const when = typeof backup.exportedAt === 'string' ? backup.exportedAt.split('T')[0] : 'an earlier date';
  return {
    success: true,
    message: `Restored ${total} records from ${when}.`,
    restored,
    missingImageRefs,
  };
}

/**
 * WHAT A BACKUP HOLDS, in the words the user would use.
 *
 * Not statistics for their own sake — reassurance. Someone who has just tapped
 * "Create Backup" wants one thing confirmed: that their information is really
 * in there. Only categories that actually have something are listed, so an
 * empty PeggyBank does not produce a wall of zeroes.
 */
export interface BackupSummaryLine { label: string; count: number }

const SUMMARY_LABELS: { table: string; one: string; many: string }[] = [
  { table: 'expenses',          one: 'expense',            many: 'expenses' },
  { table: 'income',            one: 'income record',      many: 'income records' },
  { table: 'income_schedules',  one: 'pay schedule',       many: 'pay schedules' },
  { table: 'bills',             one: 'bill',               many: 'bills' },
  { table: 'bill_payments',     one: 'bill payment',       many: 'bill payments' },
  { table: 'subscriptions',     one: 'subscription',       many: 'subscriptions' },
  { table: 'savings_goals',     one: 'savings goal',       many: 'savings goals' },
  { table: 'debts',             one: 'debt',               many: 'debts' },
  { table: 'calendar_reminders',one: 'reminder',           many: 'reminders' },
];

export function summarizeBackup(backup: BackupData): BackupSummaryLine[] {
  const lines: BackupSummaryLine[] = [];
  for (const s of SUMMARY_LABELS) {
    const rows = backup[s.table];
    const count = Array.isArray(rows) ? rows.length : 0;
    if (count > 0) lines.push({ label: count === 1 ? s.one : s.many, count });
  }
  return lines;
}

/** How many photo references the backup carries but cannot carry the files for. */
export function countImageReferences(backup: BackupData): number {
  let n = 0;
  for (const { table, column } of IMAGE_REFERENCE_COLUMNS) {
    const rows = (backup[table] as Record<string, unknown>[] | undefined) ?? [];
    for (const row of rows) if (row[column]) n++;
  }
  const settings = (backup.settings as Record<string, unknown>[] | undefined) ?? [];
  for (const row of settings) {
    if (IMAGE_SETTING_KEYS.includes(String(row.key)) && row.value) n++;
  }
  return n;
}
