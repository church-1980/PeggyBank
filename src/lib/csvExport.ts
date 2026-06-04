import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../database/database';

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

async function writeCsvFile(filename: string, csv: string): Promise<string> {
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}

async function shareFile(uri: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export async function exportExpenses(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT date, amount, category, note, is_recurring FROM expenses ORDER BY date DESC`
  );
  const csv = rowsToCsv(['date', 'amount', 'category', 'note', 'is_recurring'], rows);
  const uri = await writeCsvFile('peggybank_expenses.csv', csv);
  await shareFile(uri);
}

export async function exportIncome(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT date, amount, label FROM income ORDER BY date DESC`
  );
  const csv = rowsToCsv(['date', 'amount', 'label'], rows);
  const uri = await writeCsvFile('peggybank_income.csv', csv);
  await shareFile(uri);
}

export async function exportBills(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, amount, frequency, due_day, due_weekday, is_paid FROM bills ORDER BY name`
  );
  const csv = rowsToCsv(['name', 'amount', 'frequency', 'due_day', 'due_weekday', 'is_paid'], rows);
  const uri = await writeCsvFile('peggybank_bills.csv', csv);
  await shareFile(uri);
}

export async function exportGoals(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, target_amount, current_amount, deadline FROM savings_goals ORDER BY name`
  );
  const csv = rowsToCsv(['name', 'target_amount', 'current_amount', 'deadline'], rows);
  const uri = await writeCsvFile('peggybank_goals.csv', csv);
  await shareFile(uri);
}

export async function exportDebts(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, total_amount, amount_paid, minimum_payment FROM debts ORDER BY name`
  ).catch(() => [] as Record<string, unknown>[]);
  const csv = rowsToCsv(['name', 'total_amount', 'amount_paid', 'minimum_payment'], rows);
  const uri = await writeCsvFile('peggybank_debts.csv', csv);
  await shareFile(uri);
}

export async function exportSubscriptions(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, amount, billing_day FROM subscriptions ORDER BY name`
  ).catch(() => [] as Record<string, unknown>[]);
  const csv = rowsToCsv(['name', 'amount', 'billing_day'], rows);
  const uri = await writeCsvFile('peggybank_subscriptions.csv', csv);
  await shareFile(uri);
}

export async function exportAll(): Promise<void> {
  const db = await getDatabase();

  const expenses = await db.getAllAsync<Record<string, unknown>>(
    `SELECT date, amount, category, note FROM expenses ORDER BY date DESC`
  );
  const income = await db.getAllAsync<Record<string, unknown>>(
    `SELECT date, amount, label FROM income ORDER BY date DESC`
  );
  const bills = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, amount, frequency, due_day FROM bills`
  );
  const goals = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, target_amount, current_amount FROM savings_goals`
  );
  const debts = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, total_amount, amount_paid FROM debts`
  ).catch(() => []);
  const subs = await db.getAllAsync<Record<string, unknown>>(
    `SELECT name, amount, billing_day FROM subscriptions`
  ).catch(() => []);

  const sections = [
    '=== EXPENSES ===',
    rowsToCsv(['date', 'amount', 'category', 'note'], expenses),
    '',
    '=== INCOME ===',
    rowsToCsv(['date', 'amount', 'label'], income),
    '',
    '=== BILLS ===',
    rowsToCsv(['name', 'amount', 'frequency', 'due_day'], bills),
    '',
    '=== SAVINGS GOALS ===',
    rowsToCsv(['name', 'target_amount', 'current_amount'], goals),
    '',
    '=== DEBTS ===',
    rowsToCsv(['name', 'total_amount', 'amount_paid'], debts as Record<string, unknown>[]),
    '',
    '=== SUBSCRIPTIONS ===',
    rowsToCsv(['name', 'amount', 'billing_day'], subs as Record<string, unknown>[]),
  ];

  const uri = await writeCsvFile('peggybank_full_export.csv', sections.join('\n'));
  await shareFile(uri);
}
