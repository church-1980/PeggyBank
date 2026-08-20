import { buildBackup, restoreBackup, validateBackup } from '../lib/backupCore';
import { BACKUP_TABLES, BACKUP_VERSION } from '../lib/backupSchema';

/**
 * Backup/restore guards. The failure paths matter more than the happy path:
 * restore used to delete the user's data BEFORE inserting, with no transaction,
 * so a malformed file could leave them with nothing.
 */

/** Minimal in-memory stand-in that records SQL and can be told to fail. */
function makeDb(opts: { failOnTable?: string } = {}) {
  const store: Record<string, Record<string, unknown>[]> = {};
  const log: string[] = [];
  let rolledBack = false;
  let committed = false;

  const db = {
    log, store,
    get rolledBack() { return rolledBack; },
    get committed() { return committed; },

    async getAllAsync(sql: string) {
      const t = /FROM (\w+)/.exec(sql)?.[1] ?? '';
      return store[t] ?? [];
    },
    async execAsync(sql: string) {
      log.push(sql.trim());
      if (/BEGIN TRANSACTION/i.test(sql)) return;
      if (/COMMIT/i.test(sql)) { committed = true; return; }
      if (/ROLLBACK/i.test(sql)) { rolledBack = true; return; }
      const t = /DELETE FROM (\w+)/.exec(sql)?.[1];
      if (t) store[t] = [];
    },
    async runAsync(sql: string, values: unknown[]) {
      const t = /INTO (\w+)/.exec(sql)?.[1] ?? '';
      if (opts.failOnTable && t === opts.failOnTable) {
        throw new Error('simulated write failure on ' + t);
      }
      const cols = /\(([^)]+)\) VALUES/.exec(sql)?.[1].split(',').map(s => s.trim()) ?? [];
      const row: Record<string, unknown> = {};
      cols.forEach((c, i) => { row[c] = values[i]; });
      (store[t] ||= []).push(row);
      return { changes: 1 };
    },
  };
  return db as any;
}

const sampleBackup = () => ({
  version: BACKUP_VERSION,
  exportedAt: '2026-08-19T10:00:00.000Z',
  expenses: [{ id: 1, amount: 58, category: 'restaurant', note: 'Test Diner', date: '2026-08-01', photo_uri: 'file:///a.jpg', is_recurring: 0, created_at: 'x' }],
  income: [{ id: 1, amount: 2400, label: 'Paycheck', date: '2026-08-15', is_recurring: 1, created_at: 'x' }],
  bills: [{ id: 1, name: 'Bell', amount: 95.42, frequency: 'monthly', due_day: 5, due_weekday: null, category: 'bills', is_paid: 0, photo_uri: 'file:///bill.jpg', created_at: 'x' }],
  savings_goals: [{ id: 1, name: 'Vacation', target_amount: 2000, current_amount: 250, deadline: null, goal_type: 'vacation', pinned: 1, custom_image_uri: 'file:///g.jpg', created_at: 'x' }],
  debts: [{ id: 1, name: 'CIBC Visa', total_amount: 2500, amount_paid: 100, minimum_payment: 50, monthly_payment: 150, apr: 19.99, notes: 'card', created_at: 'x' }],
  subscriptions: [{ id: 1, name: 'Netflix', amount: 16.49, billing_day: 22, is_paid: 1, notes: 'family', created_at: 'x' }],
  settings: [{ key: 'appearance_mode', value: 'dark' }],
  custom_logos: [{ key: 'bell', uri: 'file:///logo.png', updated_at: 1 }],
  merchant_memory: [{ name_key: 'bell', display_name: 'Bell', doc_type: 'bill', category: null, recurring: 1, last_amount: 95.42, avg_amount: 95.42, due_day: 5, times_seen: 3, last_seen: '2026-08-01' }],
  calendar_reminders: [{ id: 1, date: '2026-08-20', time: '09:00', title: 'Rent', created_at: 'x' }],
  bill_payments: [],
});

describe('backup coverage', () => {
  it('exports every table in the manifest', async () => {
    const out = await buildBackup(makeDb());
    for (const spec of BACKUP_TABLES) expect(out).toHaveProperty(spec.table);
  });

  it('round-trips every field of every table', async () => {
    const db = makeDb();
    const backup = sampleBackup();
    expect((await restoreBackup(db, backup)).success).toBe(true);
    for (const spec of BACKUP_TABLES) {
      const original = (backup as any)[spec.table] as Record<string, unknown>[];
      if (!original || original.length === 0) continue;
      expect(db.store[spec.table]).toHaveLength(original.length);
      for (const col of spec.columns) {
        expect(db.store[spec.table][0][col]).toEqual(original[0][col]);
      }
    }
  });

  it.each([
    ['bills', 'photo_uri', 'file:///bill.jpg'],
    ['savings_goals', 'goal_type', 'vacation'],
    ['savings_goals', 'pinned', 1],
    ['savings_goals', 'custom_image_uri', 'file:///g.jpg'],
    ['debts', 'monthly_payment', 150],
    ['debts', 'apr', 19.99],
    ['debts', 'notes', 'card'],
    ['subscriptions', 'is_paid', 1],
    ['subscriptions', 'notes', 'family'],
  ])('restores %s.%s, previously dropped on restore', async (table, column, expected) => {
    const db = makeDb();
    await restoreBackup(db, sampleBackup());
    expect(db.store[table as string][0][column as string]).toEqual(expected);
  });

  it.each(['custom_logos', 'merchant_memory', 'calendar_reminders'])(
    'restores %s, previously absent from backups entirely',
    async (table) => {
      const db = makeDb();
      await restoreBackup(db, sampleBackup());
      expect(db.store[table]).toHaveLength(1);
    }
  );
});

describe('restore safety', () => {
  it('rejects malformed data WITHOUT deleting anything', async () => {
    const db = makeDb();
    db.store.expenses = [{ id: 99, amount: 5 }];
    const report = await restoreBackup(db, { version: 2, expenses: 'not-an-array' });
    expect(report.success).toBe(false);
    expect(db.store.expenses).toHaveLength(1);
    expect(db.log.join(' ')).not.toMatch(/DELETE FROM/);
  });

  it('rejects a non-backup file without touching data', async () => {
    const db = makeDb();
    db.store.expenses = [{ id: 99 }];
    expect((await restoreBackup(db, { hello: 'world' })).success).toBe(false);
    expect(db.store.expenses).toHaveLength(1);
  });

  it('refuses a backup made by a newer app version', () => {
    expect(validateBackup({ version: BACKUP_VERSION + 5, expenses: [] }).ok).toBe(false);
  });

  it('ROLLS BACK entirely when a write fails midway', async () => {
    const db = makeDb({ failOnTable: 'debts' });
    const report = await restoreBackup(db, sampleBackup());
    expect(report.success).toBe(false);
    expect(report.message).toMatch(/nothing was changed|intact/i);
    expect(db.rolledBack).toBe(true);
    expect(db.committed).toBe(false);
  });

  it('commits only after every table succeeded', async () => {
    const db = makeDb();
    expect((await restoreBackup(db, sampleBackup())).success).toBe(true);
    expect(db.committed).toBe(true);
    expect(db.rolledBack).toBe(false);
  });

  it('accepts an older backup that predates newer tables', async () => {
    const old = { version: 1, exportedAt: '2026-01-01T00:00:00Z', expenses: [], income: [], bills: [], savings_goals: [], settings: [] };
    expect((await restoreBackup(makeDb(), old)).success).toBe(true);
  });

  it('reports image references that cannot be recovered', async () => {
    const report = await restoreBackup(makeDb(), sampleBackup());
    expect(report.missingImageRefs).toBeGreaterThan(0);
  });
});
