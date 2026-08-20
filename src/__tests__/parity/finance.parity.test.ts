/**
 * CROSS-PLATFORM PARITY (audit section 8).
 *
 * This file runs TWICE -- once under Android module resolution, once under web
 * -- via jest.parity.config.js. Each run:
 *   1. asserts its own numbers against the hand-computed golden expectations, and
 *   2. writes those numbers to .audit/parity-<platform>.json so the two
 *      platforms can afterwards be compared to each other.
 *
 * Both halves matter. Checking only Android-vs-web would pass happily if both
 * platforms shared one wrong calculation.
 */

process.env.TZ = 'America/Toronto';

import * as fs from 'fs';
import * as path from 'path';
import { Platform } from 'react-native';

import { computeFinanceSummary, spendingByCategory, goalProgressPercent, debtPayoffMonths, unpaidBills, currentCycleDateFor, inRange } from '../../core/finance';
import { localDateString, localMonthRange, localWeekRange, clampDueDay } from '../../core/datetime';
import {
  GOLDEN_INPUT, GOLDEN_NOW, GOLDEN_BILLS, GOLDEN_GOALS, GOLDEN_EXPENSES,
  GOLDEN_MONTH_START, GOLDEN_MONTH_END, GOLDEN_PAID_CYCLES, GOLDEN_DEBT_CASES,
  GOLDEN_EXPECTED, GOLDEN_EXPECTED_CYCLES, GOLDEN_EXPECTED_CATEGORIES,
  GOLDEN_EXPECTED_GOAL_PERCENTS, GOLDEN_EXPECTED_UNPAID_NAMES,
} from '../../core/golden';

const PLATFORM = Platform.OS; // 'android' or 'web', decided by the preset

/** Everything this platform computed, in a stable shape the comparer can diff. */
const computed = {
  summary: computeFinanceSummary(GOLDEN_INPUT),
  cycles: Object.fromEntries(GOLDEN_BILLS.map(b => [b.name!, currentCycleDateFor(b, GOLDEN_NOW)])),
  unpaidNames: unpaidBills(GOLDEN_BILLS, GOLDEN_PAID_CYCLES, GOLDEN_NOW).map(b => b.name).sort(),
  categories: spendingByCategory(inRange(GOLDEN_EXPENSES, GOLDEN_MONTH_START, GOLDEN_MONTH_END)),
  goalPercents: GOLDEN_GOALS.map(g => goalProgressPercent(g.target_amount, g.current_amount)),
  debtMonths: GOLDEN_DEBT_CASES.map(c => debtPayoffMonths(c.balance, c.apr, c.payment)),
  dates: {
    today: localDateString(GOLDEN_NOW),
    month: localMonthRange(GOLDEN_NOW),
    week: localWeekRange(GOLDEN_NOW),
    lateEvening: localDateString(new Date(2026, 7, 31, 23, 59)),
    clampedDueDays: [29, 30, 31].map(clampDueDay),
  },
};

beforeAll(() => {
  const dir = path.join(__dirname, '..', '..', '..', '.audit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'parity-' + PLATFORM + '.json'),
    JSON.stringify(computed, null, 2)
  );
});

describe(PLATFORM + ' — matches the KNOWN CORRECT answers', () => {
  it('produces every headline number correctly', () => {
    expect(computed.summary).toEqual(expect.objectContaining({ ...GOLDEN_EXPECTED }));
  });

  it('assigns bills to the right cycles', () => {
    expect(computed.cycles).toEqual(GOLDEN_EXPECTED_CYCLES);
  });

  it('owes exactly the right bills', () => {
    expect(computed.unpaidNames).toEqual([...GOLDEN_EXPECTED_UNPAID_NAMES].sort());
  });

  it('breaks spending down correctly', () => {
    expect(computed.categories).toEqual([...GOLDEN_EXPECTED_CATEGORIES]);
  });

  it('computes goal progress correctly', () => {
    expect(computed.goalPercents).toEqual([...GOLDEN_EXPECTED_GOAL_PERCENTS]);
  });

  it('computes debt payoff correctly', () => {
    expect(computed.debtMonths).toEqual(GOLDEN_DEBT_CASES.map(c => c.expectedMonths));
  });

  it('reads the calendar in Toronto time, not UTC', () => {
    expect(computed.dates.today).toBe('2026-08-19');
    expect(computed.dates.lateEvening).toBe('2026-08-31'); // 11:59pm, still August
    expect(computed.dates.month).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    expect(computed.dates.week).toEqual({ start: '2026-08-16', end: '2026-08-22' });
    expect(computed.dates.clampedDueDays).toEqual([28, 28, 28]);
  });
});
