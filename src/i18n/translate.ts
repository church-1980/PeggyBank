import type { Locale } from '../core/localeFormat';

/**
 * THE TRANSLATION ENGINE.
 *
 * Small on purpose. A dictionary lookup, placeholder filling, and plural
 * selection — nothing else. No library, because the three things above are all
 * this app needs and a general i18n framework would bring a hundred features
 * PeggyBank will never use.
 *
 * PLURALS ARE NOT "ADD AN S"
 * --------------------------
 * The naive rule — n === 1 ? singular : plural — is wrong in three of the five
 * languages here:
 *
 *   French     treats ZERO as singular:  "0 facture", not "0 factures".
 *   Portuguese does the same:            "0 conta".
 *   Chinese    has no plural forms at all; adding one is simply an error.
 *
 * So each language declares which form a count takes, following the CLDR rules
 * those languages actually use.
 */

export type PluralForm = 'one' | 'other';

/** Which form does this count take in this language? */
export function pluralForm(n: number, locale: Locale): PluralForm {
  const i = Math.floor(Math.abs(n));
  switch (locale) {
    // No grammatical number. One form, always.
    case 'zh': return 'other';
    // Zero and one are both singular.
    case 'fr':
    case 'pt': return i === 0 || i === 1 ? 'one' : 'other';
    // One is singular; zero is plural.
    case 'en':
    case 'es':
    default:   return i === 1 ? 'one' : 'other';
  }
}

/** A string that changes shape with a count. */
export interface Plural { one: string; other: string }

export type Phrase = string | Plural;

/** Values dropped into {placeholders}. */
export type Vars = Record<string, string | number>;

/**
 * Fill {name} placeholders.
 *
 * A placeholder with no matching value is left visible rather than replaced
 * with "undefined" — a missing amount should look obviously broken to whoever
 * is testing, not quietly plausible to the person using the app.
 */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    vars[key] != null ? String(vars[key]) : whole);
}

/**
 * Look one phrase up and finish it.
 *
 * Falls back to English when a language is missing the key, and to the key
 * itself when English is too. A visible key beats a blank space: it says
 * exactly what is missing.
 */
export function translate(
  dict: Record<string, Phrase>,
  fallback: Record<string, Phrase>,
  key: string,
  locale: Locale,
  vars?: Vars,
): string {
  const phrase = dict[key] ?? fallback[key];
  if (phrase == null) return key;

  if (typeof phrase === 'string') return interpolate(phrase, vars);

  const n = typeof vars?.count === 'number' ? vars.count : 0;
  const form = pluralForm(n, locale);
  return interpolate(phrase[form] ?? phrase.other, vars);
}
