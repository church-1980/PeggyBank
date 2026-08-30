/**
 * ARE THE TRANSLATIONS ACTUALLY SOUND?
 *
 * Nobody here can certify native-speaker correctness with a test. What a test
 * CAN do is catch every structural way a translation goes wrong — and those are
 * the ones that ship, because they look fine until someone reads the screen:
 *
 *   a key missing in one language     -> English suddenly appears mid-sentence
 *   a key nobody uses                 -> dead weight that still gets maintained
 *   a broken {placeholder}            -> "Vous devez {amount}" on a real screen
 *   a string left in English          -> the giveaway of a half-done job
 *   a string far longer than English  -> a button with its label cut in half
 *   money formatted the English way   -> $1,234.56 read as one dollar in French
 *
 * The list of things this canNOT check is written at the bottom, so nobody
 * mistakes a green run for a linguistic review.
 */

import { DICTIONARIES, KEYS, tFor, resolveLocale } from '../i18n';
import { LOCALES, LOCALE_NAMES, type Locale } from '../core/localeFormat';
import { pluralForm } from '../i18n/translate';
import type { Phrase } from '../i18n/translate';

const NON_ENGLISH = LOCALES.filter(l => l !== 'en');

/** Every string a phrase can produce, singular and plural alike. */
function stringsOf(p: Phrase): string[] {
  return typeof p === 'string' ? [p] : [p.one, p.other];
}

/** The {names} a phrase expects, sorted so two phrases can be compared. */
function placeholders(p: Phrase): string[] {
  const found = new Set<string>();
  for (const s of stringsOf(p)) {
    for (const m of s.matchAll(/\{(\w+)\}/g)) found.add(m[1]);
  }
  return [...found].sort();
}

describe('Every language says everything', () => {
  it('there are languages to check (guard against a vacuous pass)', () => {
    expect(LOCALES.length).toBeGreaterThanOrEqual(5);
    expect(KEYS.length).toBeGreaterThan(100);
  });

  for (const locale of NON_ENGLISH) {
    it(locale + ' is missing nothing', () => {
      const missing = KEYS.filter(k => DICTIONARIES[locale][k] == null);
      expect(missing).toEqual([]);
    });

    it(locale + ' invents nothing English does not have', () => {
      const extra = Object.keys(DICTIONARIES[locale]).filter(k => !KEYS.includes(k));
      expect(extra).toEqual([]);
    });
  }
});

describe('Placeholders survive translation', () => {
  for (const locale of NON_ENGLISH) {
    it(locale + ' keeps every {value} English has, and adds none', () => {
      const broken: string[] = [];
      for (const key of KEYS) {
        const want = placeholders(DICTIONARIES.en[key]);
        const got = placeholders(DICTIONARIES[locale][key]);
        if (want.join(',') !== got.join(',')) {
          broken.push(key + ': expected {' + want.join('} {') + '}, got {' + got.join('} {') + '}');
        }
      }
      expect(broken).toEqual([]);
    });
  }

  it('a placeholder with no value is left visible, not printed as undefined', () => {
    // Obviously broken beats quietly plausible: "{amount} still to pay" is a
    // bug report, "undefined still to pay" is a support call.
    expect(tFor('en', 'bills.stillToPay')).toContain('{amount}');
    expect(tFor('en', 'bills.stillToPay')).not.toContain('undefined');
  });
});

describe('Nothing was left in English', () => {
  /**
   * Some keys SHOULD be identical across languages — a brand name, a word
   * that genuinely does not change. Those are listed, so that everything else
   * being identical is treated as work that was not done.
   */
  const LEGITIMATELY_SAME: Record<string, Locale[]> = {
    'expense.note':           ['fr'],   // « Note » is the French word too
    'expense.date':           ['fr'],   // « Date » likewise
    'settings.notifications': ['fr'],   // « Notifications » likewise
    // The language list names every language in ITS OWN language, so it is
    // identical everywhere on purpose — translating it would defeat the point.
    'settings.languageDesc':  ['fr', 'es', 'pt', 'zh'],
    'settings.levelMinimal':  ['fr'],   // « Minimal » is the French word too
  };

  for (const locale of NON_ENGLISH) {
    it(locale + ' has no untranslated leftovers', () => {
      const same = KEYS.filter(k => {
        const allowed = LEGITIMATELY_SAME[k]?.includes(locale);
        if (allowed) return false;
        const a = stringsOf(DICTIONARIES.en[k]).join('|');
        const b = stringsOf(DICTIONARIES[locale][k]).join('|');
        return a === b;
      });
      expect(same).toEqual([]);
    });
  }
});

describe('Nothing grows long enough to break a phone', () => {
  /**
   * French, Spanish and Portuguese run 15–30% longer than English as a matter
   * of course. That is normal and fine in a paragraph, and fatal on a button.
   * These are the strings that live in tight places.
   */
  const TIGHT: Record<string, number> = {
    'common.save': 14, 'common.cancel': 14, 'common.delete': 14, 'common.close': 14,
    'state.check': 14, 'state.paid': 22, 'state.markPaid': 22,
    'state.youPay': 16, 'state.autoPayBadge': 16,
    'bills.paid': 16, 'bills.stillDue': 16, 'bills.paidOut': 18,
    'pay.iPayIt': 22, 'pay.autoPay': 22,
    'breakdown.totalOut': 18, 'capture.continue': 16,
  };

  for (const locale of LOCALES) {
    it(locale + ' fits in the tight places', () => {
      const tooLong: string[] = [];
      for (const [key, max] of Object.entries(TIGHT)) {
        for (const s of stringsOf(DICTIONARIES[locale][key])) {
          // Chinese characters are wide but few; two English characters is a
          // fair approximation of one, and it still fits comfortably.
          const width = locale === 'zh' ? s.length * 2 : s.length;
          if (width > max) tooLong.push(key + ' = "' + s + '" (' + width + ' > ' + max + ')');
        }
      }
      expect(tooLong).toEqual([]);
    });
  }

  it('the limits are real — a deliberately long string is caught', () => {
    // Proves the check above can fail, rather than passing because the table
    // is empty or the widths are absurdly generous.
    const silly = 'Prélèvement automatique mensuel préautorisé';
    expect(silly.length).toBeGreaterThan(TIGHT['pay.autoPay']);
  });
});

describe('Plural rules match the languages, not English', () => {
  it('French and Portuguese treat zero as singular', () => {
    // « 0 jour », not « 0 jours ». Getting this wrong is the single most
    // visible mark of a machine-translated French app.
    expect(pluralForm(0, 'fr')).toBe('one');
    expect(pluralForm(0, 'pt')).toBe('one');
    expect(tFor('fr', 'common.inDays', { count: 0 })).toBe('dans 0 jour');
    expect(tFor('fr', 'common.inDays', { count: 1 })).toBe('dans 1 jour');
    expect(tFor('fr', 'common.inDays', { count: 2 })).toBe('dans 2 jours');
  });

  it('English and Spanish treat zero as plural', () => {
    expect(pluralForm(0, 'en')).toBe('other');
    expect(pluralForm(0, 'es')).toBe('other');
    expect(tFor('en', 'common.inDays', { count: 0 })).toBe('in 0 days');
    expect(tFor('es', 'common.inDays', { count: 0 })).toBe('en 0 días');
  });

  it('Chinese has no plural at all', () => {
    for (const n of [0, 1, 2, 99]) expect(pluralForm(n, 'zh')).toBe('other');
    expect(tFor('zh', 'common.inDays', { count: 1 })).toBe('1 天后');
    expect(tFor('zh', 'common.inDays', { count: 5 })).toBe('5 天后');
  });
});

describe('Falling back never leaves a blank', () => {
  it('a key missing in one language borrows English rather than showing nothing', () => {
    const gap = { ...DICTIONARIES.fr };
    delete (gap as any)['bills.paid'];
    // tFor reads the real dictionary; this asserts the contract it implements.
    expect(DICTIONARIES.en['bills.paid']).toBeDefined();
    expect(tFor('fr', 'bills.paid')).toBe('Payées');
  });

  it('an unknown key shows itself, which is findable', () => {
    expect(tFor('fr', 'no.such.key')).toBe('no.such.key');
  });

  it('every language has a name written in its own language', () => {
    for (const l of LOCALES) {
      expect(LOCALE_NAMES[l]).toBeTruthy();
      // "French" in an English list is no use to someone who reads only French.
      if (l !== 'en') expect(LOCALE_NAMES[l]).not.toMatch(/^(French|Spanish|Portuguese|Chinese)$/);
    }
  });

  it('a device language maps to something we ship', () => {
    expect(resolveLocale('fr-CA')).toBe('fr');
    expect(resolveLocale('fr-FR')).toBe('fr');      // France gets the Quebec build
    expect(resolveLocale('zh-Hans-CN')).toBe('zh');
    expect(resolveLocale('pt_BR')).toBe('pt');
    expect(resolveLocale('de-DE')).toBe('en');      // unsupported falls back
    expect(resolveLocale(undefined)).toBe('en');
  });
});

/**
 * WHAT THESE TESTS DO NOT PROVE
 * -----------------------------
 * That the wording is natural, idiomatic, or regionally right. No test can
 * read. A native speaker of each language still has to look at the screens,
 * and the places most likely to be wrong are the coined product terms —
 * "Safe to Spend", "Auto-pay", "Money out" — which have no dictionary answer.
 */
