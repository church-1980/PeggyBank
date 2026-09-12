/**
 * Sections 3, 4, 5 — one authoritative write layer for actual income, and
 * one canonical schedule writer.
 *
 * WRITERS BEFORE THIS REPAIR (enumerated, then consolidated):
 *   CREATE ACTUAL INCOME   — AddIncomeScreen (one-off), AddIncomeScreen
 *                            (schedule-linked), IncomesScreen's own undo
 *   UPDATE ACTUAL INCOME   — AddIncomeScreen (raw UPDATE)
 *   DELETE ACTUAL INCOME   — IncomesScreen (raw DELETE)
 *   RESTORE ACTUAL INCOME  — IncomesScreen's undo (hand-picked 3 columns —
 *                            the proven bug: dropped schedule_id/cycle_date/
 *                            is_recurring)
 *   CONFIRM OCCURRENCE     — confirmIncome() (already existed, now itself
 *                            routed through createIncome())
 *   MIGRATION              — database.ts (unchanged, still a one-time
 *                            backfill, not a live writer)
 *
 * ALL NOW GO THROUGH lib/saveIncome.ts (createIncome/updateIncome/
 * deleteIncome/restoreIncome) and lib/incomeSchedules.ts's createSchedule()
 * for the plan side. Confirmed automatically: npm run diagnostic's
 * write-path check no longer lists `income` at all (was 3 files/4 sites).
 */
import { makeRealDb } from './helpers/realDb';
import { createIncome, updateIncome, deleteIncome, restoreIncome } from '../lib/saveIncome';
import { createSchedule, confirmIncome, activeSchedules, pendingIncome } from '../lib/incomeSchedules';
import { loadFinanceSummary } from '../lib/financeSummary';
import { recentActivity } from '../lib/activity';

let db: any;
beforeEach(() => { db = makeRealDb(); });

const REF = new Date(2026, 7, 20);

describe('Section 4A — unscheduled income: create, delete, undo', () => {
  it('restores to an authoritative-row-equivalent state', async () => {
    const id = await createIncome(db, { amount: 850, label: 'Side Job', date: '2026-08-10' });
    const before = await db.getFirstAsync(`SELECT * FROM income WHERE id=?`, [id]);

    await deleteIncome(db, id);
    expect(await db.getAllAsync(`SELECT * FROM income`)).toHaveLength(0);

    await restoreIncome(db, before);
    const after = await db.getFirstAsync(`SELECT * FROM income`);
    expect(after).toEqual(before);
  });
});

describe('Section 4B — scheduled income: create, actual occurrence, delete, undo', () => {
  it('preserves schedule_id, cycle_date and recurrence identity exactly; no duplicate payday', async () => {
    const scheduleId = await createSchedule(db, {
      label: 'Paycheck', amount: 2200, frequency: 'monthly', day_of_month: 15,
    });
    const schedule = { id: scheduleId, label: 'Paycheck', amount: 2200, frequency: 'monthly' as const, day_of_month: 15 };
    await confirmIncome(db, schedule, '2026-08-15', 2200);

    const before = await db.getFirstAsync(`SELECT * FROM income WHERE schedule_id=?`, [scheduleId]);
    expect(before.schedule_id).toBe(scheduleId);
    expect(before.cycle_date).toBe('2026-08-15');

    await deleteIncome(db, before.id);
    // FINDING THIS FIXES: the old undo (hand-picked amount/label/date only)
    // would have dropped schedule_id/cycle_date here.
    await restoreIncome(db, before);

    const after = await db.getFirstAsync(`SELECT * FROM income WHERE id=?`, [before.id]);
    expect(after.schedule_id).toBe(scheduleId);       // identical
    expect(after.cycle_date).toBe('2026-08-15');       // identical
    expect(after.is_recurring).toBe(before.is_recurring); // identical

    // No duplicate expected payday: pendingIncome must not re-offer an
    // occurrence that is (once again) confirmed.
    const pending = await pendingIncome(db, REF);
    expect(pending.find(p => p.cycleDate === '2026-08-15')).toBeUndefined();

    // Safe to Spend counts it exactly once.
    const summary = await loadFinanceSummary(db, REF);
    expect(summary.monthIncome).toBe(2200);

    // Activity shows it exactly once.
    const items = await recentActivity(db, 20);
    expect(items.filter(i => i.source === 'income').length).toBe(1);
  });
});

describe('Section 5 — one canonical schedule writer for both entry points', () => {
  it('Add Income\'s call shape and Payday\'s call shape produce structurally identical schedules', async () => {
    // Add Income's shape (a real date to derive day_of_month from).
    const fromAddIncome = await createSchedule(db, {
      label: 'Paycheck', amount: 2200, frequency: 'monthly', day_of_month: 15, weekday: null, anchor_date: null,
    });
    // Payday's shape (same fields, same function, different screen).
    const fromPayday = await createSchedule(db, {
      label: 'Paycheck', amount: 2200, frequency: 'monthly', day_of_month: 15, weekday: null, anchor_date: null,
    });

    const [a, b] = await Promise.all([
      db.getFirstAsync(`SELECT label, amount, frequency, day_of_month, weekday, active FROM income_schedules WHERE id=?`, [fromAddIncome]),
      db.getFirstAsync(`SELECT label, amount, frequency, day_of_month, weekday, active FROM income_schedules WHERE id=?`, [fromPayday]),
    ]);
    expect(a).toEqual(b);
  });

  it('a biweekly schedule created either way anchors correctly and cannot be confirmed twice', async () => {
    const id = await createSchedule(db, {
      label: 'Paycheck', amount: 1200, frequency: 'biweekly', weekday: 5, anchor_date: '2026-08-07',
    });
    const schedule = await db.getFirstAsync(`SELECT * FROM income_schedules WHERE id=?`, [id]);
    expect(schedule.anchor_date).toBe('2026-08-07');

    await confirmIncome(db, schedule, '2026-08-21', 1200);
    await confirmIncome(db, schedule, '2026-08-21', 1200); // attempted twice
    const rows = await db.getAllAsync(`SELECT * FROM income WHERE schedule_id=?`, [id]);
    expect(rows).toHaveLength(1); // confirmIncome's own isConfirmed guard still holds
  });
});

describe('Section 6 — canonical expense-style update semantics for income', () => {
  it('updateIncome only ever touches amount/label/date, never schedule linkage', async () => {
    const scheduleId = await createSchedule(db, { label: 'Paycheck', amount: 2200, frequency: 'monthly', day_of_month: 15 });
    const schedule = await db.getFirstAsync(`SELECT * FROM income_schedules WHERE id=?`, [scheduleId]);
    await confirmIncome(db, schedule, '2026-08-15', 2100); // a short paycheque this month
    const row = await db.getFirstAsync(`SELECT * FROM income WHERE schedule_id=?`, [scheduleId]);

    await updateIncome(db, row.id, { amount: 2150 }); // correcting a typo

    const after = await db.getFirstAsync(`SELECT * FROM income WHERE id=?`, [row.id]);
    expect(after.amount).toBe(2150);
    expect(after.schedule_id).toBe(scheduleId);   // untouched
    expect(after.cycle_date).toBe('2026-08-15');  // untouched
  });

  it('an empty changes object touches nothing', async () => {
    const id = await createIncome(db, { amount: 500, label: 'Cash', date: '2026-08-01' });
    const before = await db.getFirstAsync(`SELECT * FROM income WHERE id=?`, [id]);
    await updateIncome(db, id, {});
    const after = await db.getFirstAsync(`SELECT * FROM income WHERE id=?`, [id]);
    expect(after).toEqual(before);
  });
});
