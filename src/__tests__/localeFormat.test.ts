/**
 * MONEY AND DATES, WRITTEN THE READER'S WAY.
 *
 * This is not a translation nicety. `formatCurrency` hardcoded "$1,234.56",
 * and to a French reader the comma IS the decimal point — so the app was
 * showing a twelve-hundred-dollar figure to someone who reads it as one
 * dollar twenty-three. That is a money app lying about money.
 */

import {
  formatMoney, formatNumber, formatLongDate, formatShortDate, formatMonthYear,
  monthName, weekdayName, LOCALES, LOCALE_NAMES,
} from '../core/localeFormat';

const AUG29 = new Date(2026, 7, 29);

describe('Money in each language', () => {
  it('English Canada: symbol first, comma thousands, period cents', () => {
    expect(formatMoney(1234.56, 'en')).toBe('$1,234.56');
  });

  it('French: symbol LAST, space thousands, comma cents', () => {
    // 1 234,56 $ — and the separators are the other way round from English,
    // which is exactly why showing the English form is unreadable, not untidy.
    expect(formatMoney(1234.56, 'fr')).toBe('1 234,56 $');
  });

  it('Brazilian Portuguese: dot thousands, comma cents, space after symbol', () => {
    expect(formatMoney(1234.56, 'pt')).toBe('$ 1.234,56');
  });

  it('Latin American Spanish follows the Americas, not Spain', () => {
    expect(formatMoney(1234.56, 'es')).toBe('$1,234.56');
  });

  it('Chinese: symbol first, no space', () => {
    expect(formatMoney(1234.56, 'zh')).toBe('$1,234.56');
  });

  it('the minus sign always leads, in every language', () => {
    // "1 234,56 -$" would read as a typo rather than a negative.
    for (const l of LOCALES) expect(formatMoney(-1234.56, l).startsWith('-')).toBe(true);
  });

  it('cents are never dropped', () => {
    for (const l of LOCALES) {
      expect(formatMoney(5, l)).toMatch(/[.,]00/);
      expect(formatMoney(0, l)).toMatch(/0[.,]00/);
    }
  });

  it('the separators never collide within one language', () => {
    // If thousands and decimals used the same character, 1,234,56 would be
    // unreadable. This is the check that a new locale cannot get wrong.
    for (const l of LOCALES) {
      const s = formatMoney(1234.56, l);
      const digitsOnly = s.replace(/[^\d]/g, '');
      expect(digitsOnly).toBe('123456');
    }
  });

  it('nonsense input does not produce NaN on a money screen', () => {
    for (const l of LOCALES) {
      expect(formatMoney(NaN, l)).not.toContain('NaN');
      expect(formatMoney(Infinity, l)).not.toContain('Infinity');
    }
  });

  it('large amounts group correctly in every language', () => {
    expect(formatMoney(1234567.89, 'en')).toBe('$1,234,567.89');
    expect(formatMoney(1234567.89, 'fr')).toBe('1 234 567,89 $');
    expect(formatMoney(1234567.89, 'pt')).toBe('$ 1.234.567,89');
  });
});

describe('Plain numbers', () => {
  it('group the same way money does', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(1234, 'fr')).toBe('1 234');
    expect(formatNumber(1234, 'pt')).toBe('1.234');
  });

  it('carry decimals when asked', () => {
    expect(formatNumber(12.5, 'fr', 1)).toBe('12,5');
    expect(formatNumber(12.5, 'en', 1)).toBe('12.5');
  });
});

describe('Dates in each language', () => {
  it('English: month first', () => {
    expect(formatLongDate(AUG29, 'en')).toBe('August 29, 2026');
  });

  it('French: day first, month lower case', () => {
    // « août », not « Août » — months are not proper nouns in French, and
    // capitalising them is an immediate tell.
    expect(formatLongDate(AUG29, 'fr')).toBe('29 août 2026');
  });

  it('Spanish and Portuguese need their "de"', () => {
    // "29 agosto 2026" is the almost-right that marks a machine translation.
    expect(formatLongDate(AUG29, 'es')).toBe('29 de agosto de 2026');
    expect(formatLongDate(AUG29, 'pt')).toBe('29 de agosto de 2026');
  });

  it('Chinese: year, month, day, with its own characters', () => {
    expect(formatLongDate(AUG29, 'zh')).toBe('2026年8月29日');
  });

  it('short dates stay short', () => {
    expect(formatShortDate(AUG29, 'en')).toBe('Aug 29');
    expect(formatShortDate(AUG29, 'fr')).toBe('29 août');
    expect(formatShortDate(AUG29, 'zh')).toBe('8月29日');
  });

  it('month and year', () => {
    expect(formatMonthYear(AUG29, 'en')).toBe('August 2026');
    expect(formatMonthYear(AUG29, 'fr')).toBe('août 2026');
    expect(formatMonthYear(AUG29, 'zh')).toBe('2026年8月');
  });

  it('every language has all twelve months and all seven days', () => {
    for (const l of LOCALES) {
      const months = new Set(Array.from({ length: 12 }, (_, i) => monthName(i, l)));
      const days = new Set(Array.from({ length: 7 }, (_, i) => weekdayName(i, l)));
      expect(months.size).toBe(12);     // no duplicates from a copy-paste slip
      expect(days.size).toBe(7);
      for (const m of months) expect(m).toBeTruthy();
    }
  });

  it('an out-of-range index is clamped rather than crashing a calendar', () => {
    for (const l of LOCALES) {
      expect(monthName(-1, l)).toBeTruthy();
      expect(monthName(99, l)).toBeTruthy();
      expect(weekdayName(99, l)).toBeTruthy();
    }
  });

  it('each language is named in its own language', () => {
    expect(LOCALE_NAMES.fr).toBe('Français');
    expect(LOCALE_NAMES.zh).toBe('中文');
    expect(LOCALE_NAMES.pt).toBe('Português');
  });
});
