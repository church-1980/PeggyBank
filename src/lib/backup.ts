import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../database/database';

interface BackupData {
  version: number;
  exportedAt: string;
  expenses: unknown[];
  income: unknown[];
  bills: unknown[];
  savings_goals: unknown[];
  debts: unknown[];
  subscriptions: unknown[];
  settings: unknown[];
}

export async function exportBackup(): Promise<void> {
  const db = await getDatabase();

  const expenses = await db.getAllAsync(`SELECT * FROM expenses`);
  const income = await db.getAllAsync(`SELECT * FROM income`);
  const bills = await db.getAllAsync(`SELECT * FROM bills`);
  const goals = await db.getAllAsync(`SELECT * FROM savings_goals`);
  const debts = await db.getAllAsync(`SELECT * FROM debts`).catch(() => []);
  const subs = await db.getAllAsync(`SELECT * FROM subscriptions`).catch(() => []);
  const settings = await db.getAllAsync(`SELECT * FROM settings`);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    expenses,
    income,
    bills,
    savings_goals: goals,
    debts,
    subscriptions: subs,
    settings,
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `peggybank_backup_${new Date().toISOString().split('T')[0]}.json`;
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save PeggyBank Backup',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export async function importBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { success: false, message: 'No file selected.' };
    }

    const fileUri = result.assets[0].uri;
    const json = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const backup = JSON.parse(json) as BackupData;

    if (!backup.version || !backup.expenses) {
      return { success: false, message: 'This file does not look like a PeggyBank backup.' };
    }

    const db = await getDatabase();

    // Clear existing data
    await db.execAsync(`
      DELETE FROM expenses;
      DELETE FROM income;
      DELETE FROM bills;
      DELETE FROM savings_goals;
      DELETE FROM settings;
    `);
    await db.execAsync(`DELETE FROM debts;`).catch(() => {});
    await db.execAsync(`DELETE FROM subscriptions;`).catch(() => {});

    // Restore expenses
    for (const row of backup.expenses as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO expenses (id, amount, category, note, date, photo_uri, is_recurring, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.amount, row.category, row.note, row.date, row.photo_uri, row.is_recurring, row.created_at]
      );
    }

    // Restore income
    for (const row of backup.income as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO income (id, amount, label, date, is_recurring, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, row.amount, row.label, row.date, row.is_recurring, row.created_at]
      );
    }

    // Restore bills
    for (const row of backup.bills as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO bills (id, name, amount, frequency, due_day, due_weekday, category, is_paid, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.name, row.amount, row.frequency, row.due_day, row.due_weekday, row.category, row.is_paid, row.created_at]
      );
    }

    // Restore goals
    for (const row of backup.savings_goals as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO savings_goals (id, name, target_amount, current_amount, deadline, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, row.name, row.target_amount, row.current_amount, row.deadline, row.created_at]
      );
    }

    // Restore debts
    for (const row of (backup.debts ?? []) as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO debts (id, name, total_amount, amount_paid, minimum_payment, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, row.name, row.total_amount, row.amount_paid, row.minimum_payment, row.created_at]
      ).catch(() => {});
    }

    // Restore subscriptions
    for (const row of (backup.subscriptions ?? []) as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR IGNORE INTO subscriptions (id, name, amount, billing_day, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [row.id, row.name, row.amount, row.billing_day, row.created_at]
      ).catch(() => {});
    }

    // Restore settings
    for (const row of backup.settings as Record<string, unknown>[]) {
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [row.key, row.value]
      );
    }

    return { success: true, message: `Backup restored from ${backup.exportedAt.split('T')[0]}.` };
  } catch (e) {
    return { success: false, message: `Could not restore backup. ${String(e)}` };
  }
}
