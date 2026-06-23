import {
  monthlyGoalContribution,
  computeSafeToSpend,
  goalProgressPercent,
  getDaysUntil,
  getDaysUntilWeekday,
} from '../utils/helpers';

// ---------------------------------------------------------------------------
// monthlyGoalContribution
// ---------------------------------------------------------------------------
describe('monthlyGoalContribution', () => {
  it('spreads the remaining gap over 12 months', () => {
    expect(monthlyGoalContribution(1200, 0)).toBe(100);
  });

  it('uses only the unfunded portion', () => {
    expect(monthlyGoalContribution(1200, 600)).toBe(50);
  });

  it('returns 0 for a fully funded goal', () => {
    expect(monthlyGoalContribution(1000, 1000)).toBe(0);
  });

  it('never returns negative when overfunded', () => {
    expect(monthlyGoalContribution(1000, 1500)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeSafeToSpend — the app's core value calculation
// ---------------------------------------------------------------------------
describe('computeSafeToSpend', () => {
  it('matches the documented worked example (~$2300 minus goal savings)', () => {
    // $3000 income, $500 spent, $200 unpaid bill, no goals => 2300
    const result = computeSafeToSpend({
      totalIncome: 3000,
      totalSpending: 500,
      unpaidBillsTotal: 200,
      goals: [],
    });
    expect(result).toBe(2300);
  });

  it('subtracts monthly goal savings from the safe amount', () => {
    // Same as above but with a $1200 gap goal => minus $100/mo => 2200
    const result = computeSafeToSpend({
      totalIncome: 3000,
      totalSpending: 500,
      unpaidBillsTotal: 200,
      goals: [{ target_amount: 1200, current_amount: 0 }],
    });
    expect(result).toBe(2200);
  });

  it('clamps to 0 instead of going negative (spending exceeds income)', () => {
    const result = computeSafeToSpend({
      totalIncome: 1000,
      totalSpending: 1500,
      unpaidBillsTotal: 0,
      goals: [],
    });
    expect(result).toBe(0);
  });

  it('returns 0 for an empty budget (no income, no spending)', () => {
    const result = computeSafeToSpend({
      totalIncome: 0,
      totalSpending: 0,
      unpaidBillsTotal: 0,
      goals: [],
    });
    expect(result).toBe(0);
  });

  it('sums multiple goal contributions', () => {
    const result = computeSafeToSpend({
      totalIncome: 5000,
      totalSpending: 0,
      unpaidBillsTotal: 0,
      goals: [
        { target_amount: 1200, current_amount: 0 }, // 100/mo
        { target_amount: 2400, current_amount: 0 }, // 200/mo
      ],
    });
    expect(result).toBe(4700);
  });
});

// ---------------------------------------------------------------------------
// goalProgressPercent
// ---------------------------------------------------------------------------
describe('goalProgressPercent', () => {
  it('computes a normal percentage', () => {
    expect(goalProgressPercent(1000, 250)).toBe(25);
  });

  it('returns 0 for a zero target (no divide-by-zero / NaN)', () => {
    expect(goalProgressPercent(0, 100)).toBe(0);
  });

  it('caps at 100 when overfunded', () => {
    expect(goalProgressPercent(1000, 5000)).toBe(100);
  });

  it('never returns negative', () => {
    expect(goalProgressPercent(1000, -50)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Date edge cases — deterministic via fake timers.
// Covers the documented payday "day 31 in a short month" risk (IMPROVEMENT-006).
// ---------------------------------------------------------------------------
describe('getDaysUntil (deterministic)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns days until a later day in the same month', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 10, 12, 0, 0)); // Jan 10 2026
    expect(getDaysUntil(15)).toBe(5);
  });

  it('wraps to next month when the target day has already passed', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 20, 12, 0, 0)); // Jan 20 2026
    // Next 15th is Feb 15 => 26 days away
    expect(getDaysUntil(15)).toBe(26);
  });

  it('handles payday on day 31 during a 28-day month without going negative', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 1, 10, 12, 0, 0)); // Feb 10 2026 (28 days)
    const days = getDaysUntil(31);
    expect(days).toBeGreaterThan(0);
    expect(Number.isFinite(days)).toBe(true);
  });
});

describe('getDaysUntilWeekday (deterministic)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 7 (not 0) when the target weekday is today', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 7, 12, 0, 0)); // Jan 7 2026 is a Wednesday (3)
    expect(getDaysUntilWeekday(3)).toBe(7);
  });

  it('returns the correct forward distance to a later weekday', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 7, 12, 0, 0)); // Wednesday
    expect(getDaysUntilWeekday(5)).toBe(2); // Friday
  });
});
