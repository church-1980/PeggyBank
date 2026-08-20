/**
 * NO TABLE MAY BE FORGOTTEN (audit sections 6 and 7).
 *
 * These tests read the SOURCE, not a hand-maintained list, so a table added in
 * six months' time cannot quietly escape backup or Delete All Data the way
 * currency_rates and conversion_history did -- they were created inside
 * CurrencyScreen instead of the main database setup, so they appeared in
 * neither list, and the user's conversion history survived a full data wipe.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  TABLE_CLASSIFICATION, BACKED_UP_TABLES, MUST_BE_WIPED, ALL_KNOWN_TABLES,
} from '../lib/tableClassification';
import { BACKUP_TABLES } from '../lib/backupSchema';

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

/** Every table the app creates, discovered by reading the source. */
function tablesCreatedInSource(): { table: string; file: string }[] {
  const found: { table: string; file: string }[] = [];
  const marker = 'CREATE TABLE';
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    let i = 0;
    while ((i = text.indexOf(marker, i)) !== -1) {
      let rest = text.slice(i + marker.length).trimStart();
      i += marker.length;
      // Skip the phrase where it appears in a comment rather than in SQL.
      const lineStart = text.lastIndexOf(String.fromCharCode(10), i - marker.length) + 1;
      const linePrefix = text.slice(lineStart, i - marker.length).trimStart();
      if (linePrefix.startsWith('//') || linePrefix.startsWith('*') || linePrefix.startsWith('/*')) continue;
      if (rest.startsWith('IF NOT EXISTS')) rest = rest.slice('IF NOT EXISTS'.length).trimStart();
      const name = rest.split(/[\s(]/)[0].trim();
      if (name && /^[a-z_]+$/.test(name)) {
        found.push({ table: name, file: path.relative(SRC, file).split(path.sep).join('/') });
      }
    }
  }
  return found;
}

describe('Every table in the source is classified', () => {
  const created = tablesCreatedInSource();

  it('finds tables in the source at all (guards against a broken scanner)', () => {
    expect(created.length).toBeGreaterThan(5);
    expect(created.map(c => c.table)).toContain('expenses');
  });

  it('classifies every table the app creates', () => {
    const unclassified = [...new Set(created.map(c => c.table))]
      .filter(t => !ALL_KNOWN_TABLES.includes(t))
      .map(t => `${t} (created in ${created.find(c => c.table === t)!.file})`);
    expect(unclassified).toEqual([]);
  });

  it('does not classify tables that no longer exist', () => {
    const names = new Set(created.map(c => c.table));
    expect(ALL_KNOWN_TABLES.filter(t => !names.has(t))).toEqual([]);
  });

  it('records where each table is really created', () => {
    for (const fact of TABLE_CLASSIFICATION) {
      const actual = created.filter(c => c.table === fact.table).map(c => c.file);
      expect(actual).toContain(fact.createdIn.replace('src/', ''));
    }
  });

  it('gives every table a reason, not a shrug', () => {
    for (const fact of TABLE_CLASSIFICATION) {
      expect(fact.reason.length).toBeGreaterThan(20);
    }
  });
});

describe('Backup covers everything classified BACKED_UP', () => {
  it('the backup manifest and the classification agree', () => {
    const inManifest = BACKUP_TABLES.map(t => t.table).sort();
    expect(inManifest).toEqual([...BACKED_UP_TABLES].sort());
  });
});

describe('Delete All Data erases everything the user would expect', () => {
  /** The wipe list as the database module actually declares it. */
  function wipeList(): string[] {
    const text = fs.readFileSync(path.join(SRC, 'database', 'database.ts'), 'utf8');
    const at = text.indexOf('const ALL_TABLES');
    const open = text.indexOf('[', at);
    const close = text.indexOf(']', open);
    return text.slice(open + 1, close)
      .split(',')
      .map(s => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);
  }

  it('wipes every table that is not deliberately excluded', () => {
    const missing = MUST_BE_WIPED.filter(t => !wipeList().includes(t));
    expect(missing).toEqual([]);
  });

  it('does not try to wipe a table that does not exist', () => {
    expect(wipeList().filter(t => !ALL_KNOWN_TABLES.includes(t))).toEqual([]);
  });
});
