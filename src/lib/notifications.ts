import { getDatabase } from '../database/database';

export type NotificationMode = 'off' | 'minimal' | 'standard' | 'detailed';

export async function setupNotificationChannel(): Promise<void> {}

export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

export async function getNotificationMode(): Promise<NotificationMode> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'notification_mode'`
    );
    return (row?.value ?? 'minimal') as NotificationMode;
  } catch {
    return 'minimal';
  }
}

export async function saveNotificationMode(mode: NotificationMode): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('notification_mode', ?)`,
      [mode]
    );
  } catch {}
}

export async function rescheduleAll(_mode: NotificationMode): Promise<void> {}
