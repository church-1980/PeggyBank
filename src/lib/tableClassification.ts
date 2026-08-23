/**
 * EVERY TABLE, CLASSIFIED (audit sections 6 and 7).
 *
 * A table can go missing from backup, or survive "Delete All Data", simply
 * because nobody remembered it existed. That is exactly how currency_rates and
 * conversion_history -- created inside CurrencyScreen rather than the main
 * database setup -- ended up outside both lists: the user's conversion history
 * survived a full data wipe.
 *
 * So every table in the app must be named here and given one of three
 * classifications, with a reason. A test scans the source for CREATE TABLE and
 * fails if any table is missing from this file, which makes forgetting one
 * impossible rather than merely unlikely.
 *
 *   BACKED_UP    The user's own data. Must appear in a backup and must be
 *                erased by Delete All Data.
 *
 *   DERIVED      Reconstructible from elsewhere or from the network. Not worth
 *                backup space, but still erased by Delete All Data, because the
 *                user asked for their data to be gone.
 *
 *   EXCLUDED     Deliberately left out of BOTH, with a stated reason. This
 *                classification requires a justification, not a shrug.
 */

export type TableClass = 'BACKED_UP' | 'DERIVED' | 'EXCLUDED';

export interface TableFact {
  table: string;
  classification: TableClass;
  /** Why it is classified this way, in plain language. */
  reason: string;
  /** Where the table is created, so an out-of-the-way CREATE TABLE stays visible. */
  createdIn: string;
}

export const TABLE_CLASSIFICATION: TableFact[] = [
  // ── The user's money. All of it is backed up and all of it is erasable. ──
  { table: 'expenses',           classification: 'BACKED_UP', reason: 'Everything the user spent.',                       createdIn: 'src/database/database.ts' },
  { table: 'income',             classification: 'BACKED_UP', reason: 'Everything the user earned.',                      createdIn: 'src/database/database.ts' },
  { table: 'bills',              classification: 'BACKED_UP', reason: 'Recurring obligations, including subscriptions.',  createdIn: 'src/database/database.ts' },
  { table: 'subscriptions',      classification: 'BACKED_UP', reason: 'Legacy subscription rows, kept until migrated.',   createdIn: 'src/database/database.ts' },
  { table: 'bill_payments',      classification: 'BACKED_UP', reason: 'Which bill occurrence was paid, and when. Losing this would make paid bills look unpaid.', createdIn: 'src/database/database.ts' },
  { table: 'savings_goals',      classification: 'BACKED_UP', reason: 'What the user is saving for and how far along.',   createdIn: 'src/database/database.ts' },
  { table: 'debts',              classification: 'BACKED_UP', reason: 'What the user owes, and the payoff plan built around it.',                              createdIn: 'src/database/database.ts' },
  { table: 'calendar_reminders', classification: 'BACKED_UP', reason: 'Reminders the user set themselves.',               createdIn: 'src/database/database.ts' },
  { table: 'settings',           classification: 'BACKED_UP', reason: 'Name, theme, payday and other choices. Cheap to store, annoying to redo.', createdIn: 'src/database/database.ts' },
  { table: 'custom_logos',       classification: 'BACKED_UP', reason: 'Logos the user picked for their bills.',           createdIn: 'src/database/database.ts' },
  {
    table: 'income_schedules',
    classification: 'BACKED_UP',
    reason:
      'When the user expects to be paid, and roughly how much. Losing it would silently stop ' +
      'every forecast and every "did you get paid?" prompt, with nothing on screen to explain why.',
    createdIn: 'src/database/database.ts',
  },

  // ── Rebuildable, but still the user's business. ──
  {
    table: 'merchant_memory',
    classification: 'BACKED_UP',
    reason:
      'Learned from the user\'s own receipts. Rebuildable in principle, but only by re-scanning ' +
      'every receipt, so losing it would visibly degrade recognition.',
    createdIn: 'src/database/database.ts',
  },
  {
    table: 'currency_rates',
    classification: 'DERIVED',
    reason:
      'A cache of exchange rates fetched from the network. Not backed up because it refreshes ' +
      'itself and would be stale on restore. Still erased by Delete All Data.',
    createdIn: 'src/screens/CurrencyScreen.tsx',
  },
  {
    table: 'conversion_history',
    classification: 'DERIVED',
    reason:
      'Currency conversions the user performed. Not restored from backup (it is a scratchpad, ' +
      'not a ledger) but it IS the user\'s activity, so Delete All Data must erase it.',
    createdIn: 'src/screens/CurrencyScreen.tsx',
  },
];

/** Tables that must appear in a backup. */
export const BACKED_UP_TABLES = TABLE_CLASSIFICATION.filter(t => t.classification === 'BACKED_UP').map(t => t.table);

/** Tables Delete All Data must empty: everything except explicit exclusions. */
export const MUST_BE_WIPED = TABLE_CLASSIFICATION.filter(t => t.classification !== 'EXCLUDED').map(t => t.table);

/** Every table the app creates anywhere. */
export const ALL_KNOWN_TABLES = TABLE_CLASSIFICATION.map(t => t.table);
