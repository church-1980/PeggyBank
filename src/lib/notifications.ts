import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDatabase } from '../database/database';
import { currentCycleDate, paidCyclesFor } from './billCycles';
import { nextMonthlyOccurrence } from '../core/datetime';

export type NotificationMode = 'off' | 'minimal' | 'standard' | 'detailed' | 'aggressive';

const CHANNEL_ID = 'peggybank-reminders';

/**
 * How many days before a bill is due we warn, per mode:
 *   minimal    — on the day only
 *   standard   — 1 day before + on the day
 *   detailed   — 3 days before, 1 day before + on the day
 *   aggressive — every single day for the week before, plus the day itself.
 *                For people who need repeated nudges to not miss a payment.
 */
const LEAD_DAYS: Record<NotificationMode, number[]> = {
  off:        [],
  minimal:    [0],
  standard:   [1, 0],
  detailed:   [3, 1, 0],
  aggressive: [7, 6, 5, 4, 3, 2, 1, 0],
};

// Reminders fire at 9am local time on the chosen day.
const REMIND_HOUR = 9;

/** Foreground behaviour: show reminders even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Bill reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (e) {
    console.warn('[notifications] channel setup failed:', e);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // Android 13+ and iOS both need an explicit ask.
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (e) {
    console.warn('[notifications] permission request failed:', e);
    return false;
  }
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

/** Next calendar date a monthly item falls due, given its day-of-month. */
// Exported so the cross-system consistency test can check that the date a
// reminder fires on matches the date the Bills screen and Calendar show.
export function nextMonthlyDue(dueDay: number, from = new Date()): Date {
  // This used to clamp every due day to the 28th "to keep it valid in every
  // month". That made the reminder wrong in every month longer than February: a
  // bill due on the 31st of May was announced on 28 May, three days early, and
  // disagreed with the date the Calendar showed for the same bill.
  //
  // The shared helper gives the real effective date -- the 28th only when the
  // month genuinely ends there.
  const due = nextMonthlyOccurrence(dueDay, from);
  const d = new Date(due.getFullYear(), due.getMonth(), due.getDate(), REMIND_HOUR, 0, 0, 0);
  // If today IS the due day but the reminder hour has already gone by, the next
  // one belongs to the following month.
  if (d.getTime() <= from.getTime()) {
    const next = nextMonthlyOccurrence(dueDay, new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1));
    return new Date(next.getFullYear(), next.getMonth(), next.getDate(), REMIND_HOUR, 0, 0, 0);
  }
  return d;
}

/** Next date a weekly item falls due, given its weekday (0 = Sunday). */
function nextWeeklyDue(weekday: number, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(REMIND_HOUR, 0, 0, 0);
  const delta = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (delta === 0 && d.getTime() <= from.getTime() ? 7 : delta));
  return d;
}

function whenText(daysAway: number): string {
  return daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
}

function bodyFor(mode: NotificationMode, name: string, amount: number, daysAway: number): string {
  const when = whenText(daysAway);
  // Detailed and aggressive both carry the amount — if you are being reminded
  // daily, knowing how much it is matters as much as when.
  if (mode === 'detailed' || mode === 'aggressive') {
    return `${name} — $${amount.toFixed(2)} is due ${when}.`;
  }
  if (mode === 'standard') {
    return `${name} is due ${when}.`;
  }
  return `${name} is due today.`;
}

function titleFor(daysAway: number): string {
  if (daysAway === 0) return 'Bill due today';
  if (daysAway === 1) return 'Bill due tomorrow';
  return `Bill due in ${daysAway} days`;
}

// iOS only keeps 64 pending notifications and silently drops the rest; Android
// degrades with very large queues too. Aggressive mode schedules 8 per bill, so
// cap the queue and keep the SOONEST reminders — the ones that matter next.
const MAX_SCHEDULED = 60;

/**
 * Rebuild every scheduled reminder from what is currently in the database.
 * Always clears first, so this is safe to call after any change.
 */
export async function rescheduleAll(mode: NotificationMode): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (mode === 'off') return;

    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await setupNotificationChannel();

    const db = await getDatabase();
    const now = new Date();
    const leads = LEAD_DAYS[mode] ?? [0];

    type Due = { name: string; amount: number; date: Date };
    const dues: Due[] = [];

    // Suppress only the occurrence that was actually paid — reading is_paid off
    // the bill silenced every future reminder for that bill, permanently.
    const paidBillCycles = await paidCyclesFor(db, 'bill');
    const paidSubCycles = await paidCyclesFor(db, 'subscription');

    const bills = await db.getAllAsync<{
      id: number; name: string; amount: number; frequency: string;
      due_day: number | null; due_weekday: number | null;
    }>(`SELECT id, name, amount, frequency, due_day, due_weekday FROM bills`);

    for (const b of bills) {
      if (paidBillCycles.get(b.id)?.has(currentCycleDate(b, now))) continue;
      const date = b.frequency === 'weekly' && b.due_weekday != null
        ? nextWeeklyDue(b.due_weekday, now)
        : nextMonthlyDue(b.due_day ?? 1, now);
      dues.push({ name: b.name, amount: b.amount, date });
    }

    const subs = await db.getAllAsync<{ id: number; name: string; amount: number; billing_day: number }>(
      `SELECT id, name, amount, billing_day FROM subscriptions`
    );
    for (const s of subs) {
      if (paidSubCycles.get(s.id)?.has(currentCycleDate(s, now))) continue;
      dues.push({ name: s.name, amount: s.amount, date: nextMonthlyDue(s.billing_day, now) });
    }

    // Build the full set first, then schedule soonest-first up to the cap, so a
    // long tail of far-off reminders can never crowd out this week's.
    const planned: { fireAt: Date; title: string; body: string }[] = [];
    for (const due of dues) {
      for (const lead of leads) {
        const fireAt = new Date(due.date);
        fireAt.setDate(fireAt.getDate() - lead);
        if (fireAt.getTime() <= Date.now()) continue; // never schedule in the past
        planned.push({
          fireAt,
          title: titleFor(lead),
          body: bodyFor(mode, due.name, due.amount, lead),
        });
      }
    }
    planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

    for (const p of planned.slice(0, MAX_SCHEDULED)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: p.title,
          body: p.body,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: p.fireAt,
        },
      });
    }
  } catch (e) {
    console.warn('[notifications] rescheduleAll failed:', e);
  }
}

/** How many reminders are currently queued — used by the test screen. */
export async function scheduledCount(): Promise<number> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.length;
  } catch {
    return 0;
  }
}

/**
 * Fire a reminder a few seconds from now so notifications can be verified
 * end-to-end on a real device without waiting for a due date.
 */
export async function sendTestNotification(seconds = 5): Promise<boolean> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return false;
    await setupNotificationChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'PeggyBank test reminder',
        body: 'Notifications are working. This is what a bill reminder looks like.',
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    return true;
  } catch (e) {
    console.warn('[notifications] test notification failed:', e);
    return false;
  }
}
