/**
 * THE manifest of what a PeggyBank backup contains.
 *
 * Export and restore both read this list, so a column can never be saved but
 * silently not restored — which is exactly how bill photos, goal type/pinned,
 * debt APR and subscription notes were being lost.
 *
 * Every user-owned table must appear here with an explicit classification.
 * Adding a column to the database without adding it here will fail the
 * backupSchema test, which compares this manifest against the live schema.
 */

export type TableName =
  | 'expenses' | 'income' | 'bills' | 'savings_goals' | 'debts'
  | 'subscriptions' | 'settings' | 'custom_logos' | 'merchant_memory'
  | 'calendar_reminders' | 'bill_payments' | 'income_schedules';

export interface TableSpec {
  table: TableName;
  /** Every column written to, and read back from, the backup file. */
  columns: string[];
  /** Column used for INSERT OR REPLACE conflict handling. */
  primaryKey: string;
  /** Restored rows are required for the backup to be considered valid. */
  required: boolean;
}

export const BACKUP_TABLES: TableSpec[] = [
  {
    table: 'expenses',
    columns: ['id', 'amount', 'category', 'note', 'date', 'photo_uri', 'is_recurring', 'created_at'],
    primaryKey: 'id', required: true,
  },
  {
    table: 'income',
    // schedule_id and cycle_date say WHICH expected payday a row settled.
    // Without them a restore would leave every past payday looking unconfirmed.
    columns: ['id', 'amount', 'label', 'date', 'is_recurring', 'created_at', 'schedule_id', 'cycle_date'],
    primaryKey: 'id', required: true,
  },
  {
    // photo_uri was exported but never restored before.
    table: 'bills',
    columns: ['id', 'name', 'amount', 'frequency', 'due_day', 'due_weekday', 'category', 'is_paid', 'photo_uri', 'created_at'],
    primaryKey: 'id', required: true,
  },
  {
    // goal_type / pinned / custom_image_uri were all being dropped.
    table: 'savings_goals',
    columns: ['id', 'name', 'target_amount', 'current_amount', 'deadline', 'goal_type', 'pinned', 'custom_image_uri', 'created_at'],
    primaryKey: 'id', required: false,
  },
  {
    // monthly_payment / apr / notes were all being dropped.
    table: 'debts',
    columns: ['id', 'name', 'total_amount', 'amount_paid', 'minimum_payment', 'monthly_payment', 'apr', 'notes', 'created_at'],
    primaryKey: 'id', required: false,
  },
  {
    // is_paid / notes were being dropped.
    table: 'subscriptions',
    columns: ['id', 'name', 'amount', 'billing_day', 'is_paid', 'notes', 'created_at'],
    primaryKey: 'id', required: false,
  },
  {
    table: 'settings',
    columns: ['key', 'value'],
    primaryKey: 'key', required: false,
  },
  {
    // Was entirely absent from backups.
    table: 'custom_logos',
    columns: ['key', 'uri', 'updated_at'],
    primaryKey: 'key', required: false,
  },
  {
    // Was entirely absent from backups.
    table: 'merchant_memory',
    columns: ['name_key', 'display_name', 'doc_type', 'category', 'recurring', 'last_amount', 'avg_amount', 'due_day', 'times_seen', 'last_seen'],
    primaryKey: 'name_key', required: false,
  },
  {
    // Was entirely absent from backups.
    table: 'calendar_reminders',
    columns: ['id', 'date', 'time', 'title', 'created_at'],
    primaryKey: 'id', required: false,
  },
  {
    // Per-cycle payment state for recurring bills.
    table: 'bill_payments',
    columns: ['id', 'bill_id', 'source', 'cycle_date', 'paid', 'paid_at', 'amount'],
    primaryKey: 'id', required: false,
  },
  {
    table: 'income_schedules',
    columns: ['id', 'label', 'amount', 'frequency', 'day_of_month', 'weekday', 'active', 'created_at', 'anchor_date'],
    primaryKey: 'id',
    // Not required: databases created before recurring income existed have none,
    // and an older backup must still restore rather than be rejected.
    required: false,
  },
];

/**
 * IMAGE POLICY — deliberate, and stated so it is not mistaken for a bug.
 *
 * A backup is a JSON file. It stores the *path* of receipt photos, bill photos,
 * custom logos and the profile photo — not the image bytes. Those files live in
 * the app's own storage.
 *
 * Consequence, and it is a real limitation:
 *   - restoring onto the SAME device/install: paths still resolve, images appear
 *   - restoring onto a DIFFERENT device or after a reinstall: the paths are dead
 *     and the images will be missing, even though every other field restores
 *
 * So image references are BACKED UP; image FILES are INTENTIONALLY EXCLUDED.
 * Bundling images would require a zip/base64 archive format, which this backup
 * version does not implement. Restore therefore reports how many image
 * references could not be resolved rather than pretending they survived.
 */
export const IMAGE_REFERENCE_COLUMNS: { table: TableName; column: string }[] = [
  { table: 'expenses', column: 'photo_uri' },
  { table: 'bills', column: 'photo_uri' },
  { table: 'savings_goals', column: 'custom_image_uri' },
  { table: 'custom_logos', column: 'uri' },
];

/** Settings keys holding a file path (profile photo) — same caveat as above. */
export const IMAGE_SETTING_KEYS = ['profile_photo_uri'];

export const BACKUP_VERSION = 2;
