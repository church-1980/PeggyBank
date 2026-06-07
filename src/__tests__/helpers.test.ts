import {
  formatCurrency,
  getMonthRange,
  getDaysUntil,
  getDaysUntilWeekday,
  formatDate,
  getTodayString,
} from '../utils/helpers';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a whole number', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('formats decimals', () => {
    expect(formatCurrency(25.5)).toBe('$25.50');
  });

  it('formats thousands with comma', () => {
    expect(formatCurrency(1500)).toBe('$1,500.00');
  });

  it('formats large amounts', () => {
    expect(formatCurrency(12345.67)).toBe('$12,345.67');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-50)).toBe('$-50.00');
  });
});

describe('getMonthRange', () => {
  it('returns start and end keys', () => {
    const { start, end } = getMonthRange();
    expect(start).toBeDefined();
    expect(end).toBeDefined();
  });

  it('start is first day of current month', () => {
    const { start } = getMonthRange();
    expect(start).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('end is last day of current month', () => {
    const { end } = getMonthRange();
    const day = parseInt(end.split('-')[2], 10);
    expect(day).toBeGreaterThanOrEqual(28);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('start and end are in the same month', () => {
    const { start, end } = getMonthRange();
    expect(start.substring(0, 7)).toBe(end.substring(0, 7));
  });
});

describe('getDaysUntil', () => {
  it('returns a non-negative number', () => {
    const days = getDaysUntil(15);
    expect(days).toBeGreaterThanOrEqual(0);
  });

  it('returns a number up to 31', () => {
    const days = getDaysUntil(15);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('handles day 1', () => {
    const days = getDaysUntil(1);
    expect(typeof days).toBe('number');
  });

  it('handles day 31', () => {
    const days = getDaysUntil(31);
    expect(typeof days).toBe('number');
  });
});

describe('getDaysUntilWeekday', () => {
  it('returns 1-7 for any weekday', () => {
    for (let w = 0; w <= 6; w++) {
      const days = getDaysUntilWeekday(w);
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(7);
    }
  });
});

describe('formatDate', () => {
  it('formats a known date string', () => {
    const result = formatDate('2024-03-15');
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('does not throw on valid date strings', () => {
    expect(() => formatDate('2025-12-01')).not.toThrow();
    expect(() => formatDate('2025-01-31')).not.toThrow();
  });
});

describe('getTodayString', () => {
  it('returns a YYYY-MM-DD string', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current date', () => {
    const today = getTodayString();
    const now = new Date().toISOString().split('T')[0];
    expect(today).toBe(now);
  });
});
