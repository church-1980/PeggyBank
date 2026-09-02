/**
 * NO COLUMN MAY BE FORGOTTEN.
 *
 * backupSchema.ts says of itself: "Adding a column to the database without
 * adding it here will fail the backupSchema test, which compares this manifest
 * against the live schema."
 *
 * There was no such test. Table-level coverage was enforced (tableCoverage),
 * but nothing compared COLUMNS, which is the level at which backups have
 * actually failed here before — photo_uri, goal_type, pinned, apr, notes and
 * subscription status were each exported or restored incompletely at some
 * point. The manifest happened to be complete when this test was written; the
 * point is that it stays complete without anyone remembering to check.
 *
 * Read from the source, never from a copy, so it cannot drift.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BACKUP_TABLES, IMAGE_REFERENCE_COLUMNS } from '../lib/backupSchema';

const DB_SOURCE = path.join(__dirname, '..', 'database', 'database.ts');

/** Every column the app's schema really declares, per table. */
function liveSchema(): Record<string, string[]> {
  const text = fs.readFileSync(DB_SOURCE, 'utf8');
  const schema: Record<string, string[]> = {};

  const marker = 'CREATE TABLE IF NOT EXISTS ';
  let i = 0;
  while ((i = text.indexOf(marker, i)) !== -1) {
    const after = text.slice(i + marker.length);
    const name = after.slice(0, after.indexOf(' ')).trim();
    const open = after.indexOf('(');
    const close = after.indexOf('\n    );');
    i += marker.length;
    if (open === -1 || close === -1) continue;

    schema[name] = after
      .slice(open + 1, close)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('--') && !l.startsWith('UNIQUE') && !l.startsWith('FOREIGN'))
      .map((l) => l.split(/[\s(]/)[0].replace(/,$/, ''))
      .filter((c) => /^[a-z_]+$/.test(c));
  }

  // Columns added by migration are just as real as columns in CREATE TABLE,
  // and are exactly where the previously-dropped fields lived.
  const alter = 'ALTER TABLE ';
  let j = 0;
  while ((j = text.indexOf(alter, j)) !== -1) {
    const rest = text.slice(j + alter.length);
    const parts = rest.split(/\s+/);
    j += alter.length;
    if (parts[1] !== 'ADD' || parts[2] !== 'COLUMN') continue;
    const [table, , , column] = parts;
    if (schema[table] && !schema[table].includes(column)) schema[table].push(column);
  }

  return schema;
}

describe('The backup manifest matches the live database schema', () => {
  const schema = liveSchema();

  it('reads a real schema at all (guards against a broken scanner)', () => {
    expect(Object.keys(schema).length).toBeGreaterThan(8);
    expect(schema.expenses).toContain('amount');
    // A migration-added column, proving the ALTER pass works.
    expect(schema.bills).toContain('payment_method');
  });

  it('backs up EVERY column of every table it claims to back up', () => {
    const missing: string[] = [];
    for (const spec of BACKUP_TABLES) {
      const live = schema[spec.table];
      if (!live) { missing.push(`${spec.table} (table not found in schema)`); continue; }
      for (const col of live) {
        if (!spec.columns.includes(col)) missing.push(`${spec.table}.${col}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('does not claim to back up a column that does not exist', () => {
    const phantom: string[] = [];
    for (const spec of BACKUP_TABLES) {
      const live = schema[spec.table] ?? [];
      for (const col of spec.columns) {
        if (!live.includes(col)) phantom.push(`${spec.table}.${col}`);
      }
    }
    expect(phantom).toEqual([]);
  });

  it('names a primary key that the table actually has', () => {
    for (const spec of BACKUP_TABLES) {
      expect(`${spec.table}:${(schema[spec.table] ?? []).includes(spec.primaryKey)}`)
        .toBe(`${spec.table}:true`);
    }
  });

  it('every declared image-reference column is a real, backed-up column', () => {
    for (const ref of IMAGE_REFERENCE_COLUMNS) {
      const spec = BACKUP_TABLES.find((t) => t.table === ref.table);
      expect(spec).toBeDefined();
      expect(spec!.columns).toContain(ref.column);
      expect(schema[ref.table]).toContain(ref.column);
    }
  });
});
