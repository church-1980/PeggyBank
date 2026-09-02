/**
 * THE PART THE USER ACTUALLY MEETS.
 *
 * The backup engine was already correct. What failed on a real phone was
 * everything around it: a file named like a database dump, a promise that the
 * file contained "everything" when the photos were never in it, a padlock icon
 * beside plain-text financial data, and raw JSON as the user's first
 * impression of their own backup.
 *
 * These tests hold the WORDING and the PROMISES, because those are what went
 * wrong, and nothing else in the suite was watching them.
 */

import * as fs from 'fs';
import * as path from 'path';
import { summarizeBackup, countImageReferences, validateBackup } from '../lib/backupCore';
import { BACKUP_VERSION } from '../lib/backupSchema';

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'screens', 'ExportScreen.tsx'), 'utf8',
);

const backup = (over: Record<string, unknown> = {}) => ({
  version: BACKUP_VERSION,
  exportedAt: '2026-09-02T10:00:00.000Z',
  expenses: [], income: [], bills: [], savings_goals: [], debts: [],
  subscriptions: [], settings: [], custom_logos: [], merchant_memory: [],
  calendar_reminders: [], bill_payments: [], income_schedules: [],
  ...over,
});

describe('The confirmation says what was saved, in words', () => {
  it('counts what is there and names it in plain language', () => {
    const lines = summarizeBackup(backup({
      expenses: [1, 2, 3].map((id) => ({ id })),
      bills: [{ id: 1 }],
      subscriptions: [{ id: 1 }, { id: 2 }],
    }) as never);

    expect(lines).toEqual([
      { label: 'expenses', count: 3 },
      { label: 'bill', count: 1 },
      { label: 'subscriptions', count: 2 },
    ]);
  });

  it('says "1 expense", not "1 expenses"', () => {
    const [line] = summarizeBackup(backup({ expenses: [{ id: 1 }] }) as never);
    expect(line).toEqual({ label: 'expense', count: 1 });
  });

  it('leaves out what the user does not have, rather than printing zeroes', () => {
    const lines = summarizeBackup(backup({ expenses: [{ id: 1 }] }) as never);
    expect(lines.map((l) => l.label)).toEqual(['expense']);
  });

  it('a brand new PeggyBank produces no list at all, not a wall of zeroes', () => {
    expect(summarizeBackup(backup() as never)).toEqual([]);
  });

  it('never invents a count for something the file does not contain', () => {
    const lines = summarizeBackup({ version: 2, exportedAt: 'x' } as never);
    expect(lines).toEqual([]);
  });

  it('counts the money records the user would think of first', () => {
    const lines = summarizeBackup(backup({
      income: [{ id: 1 }], income_schedules: [{ id: 1 }],
      bill_payments: [{ id: 1 }, { id: 2 }], savings_goals: [{ id: 1 }],
      debts: [{ id: 1 }], calendar_reminders: [{ id: 1 }],
    }) as never);
    expect(lines.map((l) => l.label)).toEqual([
      'income record', 'pay schedule', 'bill payment'.concat('s'),
      'savings goal', 'debt', 'reminder',
    ]);
  });
});

describe('Photos are counted honestly, because they are not in the file', () => {
  it('counts every kind of image the data points at', () => {
    const n = countImageReferences(backup({
      expenses: [{ photo_uri: 'file:///a.jpg' }, { photo_uri: null }],
      bills: [{ photo_uri: 'file:///b.jpg' }],
      savings_goals: [{ custom_image_uri: 'file:///g.jpg' }],
      custom_logos: [{ uri: 'file:///l.png' }],
      settings: [{ key: 'profile_photo_uri', value: 'file:///me.jpg' }],
    }) as never);
    expect(n).toBe(5);
  });

  it('does not count the profile photo when there is not one', () => {
    expect(countImageReferences(backup({
      settings: [{ key: 'display_name', value: 'Paul' }],
    }) as never)).toBe(0);
  });

  it('a user with no photos is told about none', () => {
    expect(countImageReferences(backup() as never)).toBe(0);
  });
});

describe('The screen does not promise more than the file delivers', () => {
  it('no longer claims a backup saves everything', () => {
    expect(SCREEN).not.toContain('Saves everything in one file');
  });

  it('tells the user their photos are not in the file', () => {
    expect(SCREEN.toLowerCase()).toContain('not inside the file');
  });

  it('says plainly that the file is not password protected', () => {
    expect(SCREEN).toContain('not password protected');
  });

  it('does not imply the backup is encrypted or secured', () => {
    for (const claim of ['encrypted', 'password-protected', 'secured', 'lock-closed']) {
      expect(`${claim}:${SCREEN.toLowerCase().includes(claim)}`).toBe(`${claim}:false`);
    }
  });

  it('warns that anyone who opens the file can read it', () => {
    expect(SCREEN).toContain('can read your financial information');
  });
});

describe('The user never has to understand JSON', () => {
  it('does not render backup contents anywhere on the screen', () => {
    for (const leak of ['JSON.stringify', 'JSON.parse']) {
      expect(`${leak}:${SCREEN.includes(leak)}`).toBe(`${leak}:false`);
    }
  });

  it('does not put the file format in the buttons the user taps', () => {
    expect(SCREEN).toContain('Create Backup');
    expect(SCREEN).toContain('Restore Backup');
    expect(SCREEN).not.toContain('Export Backup File');
    expect(SCREEN).not.toContain('Saves a .json file');
  });

  it('reassures the user that computer text is normal if they do open it', () => {
    expect(SCREEN).toContain('that is normal');
  });
});

describe('Failure is explained, not dumped', () => {
  it('the screen never shows the raw error to the user', () => {
    // String(e) in an Alert is how a stack trace reaches a grandparent.
    expect(SCREEN).not.toContain('String(e)');
  });

  it('every refusal message is a sentence, not a database error', () => {
    for (const bad of [null, 'nope', 42, {}, { version: 'two' }, { version: 999 }]) {
      const r = validateBackup(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.length).toBeGreaterThan(15);
        expect(r.error.endsWith('.')).toBe(true);
        for (const jargon of ['SQLITE', 'undefined', 'null', 'TypeError', 'Error:']) {
          expect(`${jargon}:${r.error.includes(jargon)}`).toBe(`${jargon}:false`);
        }
      }
    }
  });

  it('says the user lost nothing when a restore is refused', () => {
    expect(SCREEN).toContain('Nothing on your phone was changed');
  });
});

describe('Restore describes what it will really do', () => {
  it('says it replaces, because that is what it does', () => {
    expect(SCREEN).toContain('will replace what is on this phone');
  });

  it('warns that anything newer than the backup is lost', () => {
    expect(SCREEN).toContain('since that backup was made will be gone');
  });

  it('confirms success in plain words', () => {
    expect(SCREEN).toContain('Backup restored ✓');
    expect(SCREEN).toContain('Backup created ✓');
  });
});

describe('Backup version handling', () => {
  it('accepts a backup from this version', () => {
    expect(validateBackup(backup()).ok).toBe(true);
  });

  it('refuses a backup from a NEWER app and says why', () => {
    const r = validateBackup(backup({ version: BACKUP_VERSION + 1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('newer version of PeggyBank');
  });

  it('accepts an older backup that predates newer tables', () => {
    const old: Record<string, unknown> = {
      version: 1, exportedAt: 'x',
      expenses: [], income: [], bills: [],
    };
    expect(validateBackup(old).ok).toBe(true);
  });

  it('refuses a file with no version rather than guessing', () => {
    const noVersion = backup() as Record<string, unknown>;
    delete noVersion.version;
    const r = validateBackup(noVersion);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('version');
  });

  it('never silently treats an unreadable version as this one', () => {
    for (const v of ['2', null, {}, [], true]) {
      expect(validateBackup(backup({ version: v })).ok).toBe(false);
    }
  });
});

describe('CSV is not mistaken for a backup', () => {
  it('does not describe the CSV summary as everything', () => {
    expect(SCREEN).not.toContain("description: 'Everything in one file'");
  });

  it('says plainly that a CSV cannot restore PeggyBank', () => {
    expect(SCREEN).toContain('cannot put your information back from a');
  });
});
