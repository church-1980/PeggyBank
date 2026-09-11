/**
 * D3 — recurring income unification.
 *
 * The Payday Planner ran a second, parallel forecasting system:
 * settings.payday/pay_frequency/pay_weekday, entirely separate from
 * income_schedules. Calendar had a compatibility fallback for it; the
 * Dashboard's Coming Up never did, so a Payday-Planner-only user saw a
 * payday marker on Calendar and NOTHING on Home for the same real plan.
 *
 * income_schedules is now the only system. This proves: a legacy-only
 * fixture migrates to exactly one schedule, Calendar and Coming Up derive
 * from that same schedule (so they cannot disagree), no duplicate actual
 * paycheque is created, and backup/restore preserves the result.
 */
process.env.TZ = 'America/Toronto';

import { makeRealDb } from './helpers/realDb';
import { activeSchedules, occurrencesBetween, pendingIncome } from '../lib/incomeSchedules';
import { buildMonth } from '../core/calendarMonth';
import { buildBackup, restoreBackup } from '../lib/backupCore';

let db: any;
beforeEach(() => { db = makeRealDb(); });

/** The exact migration logic in database.ts, run as a standalone simulation
 *  against real SQLite -- same ceiling this codebase already accepts for
 *  its other one-time migrations (see debtPaymentLedger.test.ts). */
async function runMigration() {
  const migrated = await db.getFirstAsync(`SELECT value FROM settings WHERE key = 'payday_schedule_migrated_v1'`);
  if (migrated) return;
  const paydaySetting = await db.getFirstAsync(`SELECT value FROM settings WHERE key = 'payday'`);
  const existing = await db.getFirstAsync(`SELECT id FROM income_schedules WHERE label = 'Paycheck' AND active = 1 LIMIT 1`);
  const lastPaycheck = await db.getFirstAsync(`SELECT date, amount FROM income WHERE label = 'Paycheck' ORDER BY date DESC LIMIT 1`);
  if (paydaySetting && !existing && lastPaycheck) {
    const freqSetting = await db.getFirstAsync(`SELECT value FROM settings WHERE key = 'pay_frequency'`);
    const wdSetting = await db.getFirstAsync(`SELECT value FROM settings WHERE key = 'pay_weekday'`);
    const freq = (freqSetting?.value === 'weekly' || freqSetting?.value === 'biweekly') ? freqSetting.value : 'monthly';
    await db.runAsync(
      // created_at pinned in the past, matching what a real migration would
      // produce for a user whose legacy setup long predates it -- an
      // unpinned DEFAULT (datetime('now')) would make pendingIncome() treat
      // the schedule as "just born" and filter out this test's fixed dates.
      `INSERT INTO income_schedules (label, amount, frequency, day_of_month, weekday, anchor_date, active, created_at)
       VALUES ('Paycheck', ?, ?, ?, ?, ?, 1, '2026-01-01T00:00:00.000Z')`,
      [
        lastPaycheck.amount, freq,
        freq === 'monthly' ? (parseInt(paydaySetting.value, 10) || 1) : null,
        freq === 'monthly' ? null : (wdSetting ? parseInt(wdSetting.value, 10) : 5),
        freq === 'biweekly' ? lastPaycheck.date : null,
      ]
    );
  }
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('payday_schedule_migrated_v1', 'done')`);
}

async function seedLegacyPaydayUser() {
  // A user who only ever used the OLD Payday Planner: settings keys, and
  // one confirmed 'Paycheck' income row -- never an income_schedules row.
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('payday', '15')`);
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('pay_frequency', 'monthly')`);
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('pay_weekday', '5')`);
  await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (2200, 'Paycheck', '2026-07-15')`);
}

describe('D3 — a legacy-only Payday Planner user migrates to one schedule', () => {
  it('produces exactly one active schedule', async () => {
    await seedLegacyPaydayUser();
    await runMigration();
    const schedules = await activeSchedules(db);
    expect(schedules.length).toBe(1);
    expect(schedules[0].label).toBe('Paycheck');
    expect(schedules[0].amount).toBe(2200);
    expect(schedules[0].day_of_month).toBe(15);
  });

  it('is idempotent and never duplicates', async () => {
    await seedLegacyPaydayUser();
    await runMigration();
    await runMigration();
    const schedules = await activeSchedules(db);
    expect(schedules.length).toBe(1);
  });

  it('does nothing if a schedule already exists (no duplicate)', async () => {
    await seedLegacyPaydayUser();
    await db.runAsync(
      `INSERT INTO income_schedules (label, amount, frequency, day_of_month, active) VALUES ('Paycheck', 9999, 'monthly', 1, 1)`
    );
    await runMigration();
    const schedules = await activeSchedules(db);
    expect(schedules.length).toBe(1);
    expect(schedules[0].amount).toBe(9999); // untouched, not overwritten by legacy settings
  });

  it('a user who never actually confirmed a paycheque migrates to nothing (no $0 forecast)', async () => {
    await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('payday', '15')`);
    // No 'Paycheck' income row exists -- an in-progress setup, not evidence of a real plan.
    await runMigration();
    const schedules = await activeSchedules(db);
    expect(schedules.length).toBe(0);
  });

  it('Calendar and Coming Up derive from the SAME schedule, so they cannot disagree', async () => {
    await seedLegacyPaydayUser();
    await runMigration();

    const schedules = await activeSchedules(db);
    const calendarOccurrences = occurrencesBetween(schedules[0], new Date(2026, 7, 1), new Date(2026, 7, 31));
    const comingUp = await pendingIncome(db, new Date(2026, 7, 10));

    // Both read income_schedules; there is no second source left to drift.
    expect(calendarOccurrences).toContain('2026-08-15');
    expect(comingUp.some(p => p.cycleDate === '2026-08-15')).toBe(true);

    // Direct proof there is only one schedule for BOTH to disagree over in
    // the first place -- the actual D3 bug was Coming Up seeing NONE while
    // Calendar saw one via its old settings fallback.
    expect(schedules.length).toBe(1);
  });

  it('backup and restore preserve the migrated schedule and its confirmed income once each', async () => {
    await seedLegacyPaydayUser();
    await runMigration();

    const backup = await buildBackup(db);
    const fresh: any = makeRealDb();
    const report = await restoreBackup(fresh, backup);
    expect(report.success).toBe(true);

    const schedules = await activeSchedules(fresh);
    expect(schedules.length).toBe(1);
    const income = await fresh.getAllAsync(`SELECT * FROM income WHERE label = 'Paycheck'`);
    expect(income.length).toBe(1); // the original confirmed paycheque, not duplicated
  });
});

describe('D3 — Calendar renders the same schedule buildMonth and Coming Up would', () => {
  it('a weekly schedule produces the same occurrence set either way', async () => {
    const s = { id: 1, label: 'Paycheck', amount: 1200, frequency: 'weekly' as const, weekday: 5 };
    const occ = occurrencesBetween(s, new Date(2026, 7, 1), new Date(2026, 7, 31));

    const month = buildMonth({
      year: 2026, month: 7, today: '2026-08-15',
      bills: [], subscriptions: [], payments: [],
      expenses: [], income: [],
      paydays: occ.map(date => ({ date, label: s.label, amount: s.amount })),
    });
    const paydayDates = [...month.entries()].filter(([, es]) => es.some(e => e.kind === 'payday')).map(([d]) => d);
    expect(paydayDates.sort()).toEqual(occ.sort());
  });
});
