import { en } from './locales/en';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { zh } from './locales/zh';
import { translate, type Phrase, type Vars } from './translate';
import type { Locale } from '../core/localeFormat';

export { LOCALES, LOCALE_NAMES } from '../core/localeFormat';
export type { Locale } from '../core/localeFormat';
export type { Phrase, Vars } from './translate';
export { pluralForm, interpolate } from './translate';

/** Every dictionary, keyed by language. English is the fallback for all. */
export const DICTIONARIES: Record<Locale, Record<string, Phrase>> = { en, fr, es, pt, zh };

/** The set of keys that legitimately exist. Tests compare every language to this. */
export const KEYS = Object.keys(en);

/**
 * Look up one phrase.
 *
 * Missing keys fall back to English, then to the key itself. A visible
 * "bills.title" on screen is ugly, and that is the point — it is findable,
 * where a blank space is not.
 */
export function tFor(locale: Locale, key: string, vars?: Vars): string {
  return translate(DICTIONARIES[locale] ?? en, en, key, locale, vars);
}

/**
 * Pick the best supported language for a device.
 *
 * Device tags look like "fr-CA", "zh-Hans-CN", "pt_BR". Only the base language
 * is matched: this app ships one variant of each, chosen deliberately, so
 * fr-FR and fr-CA both get the Quebec dictionary rather than nothing.
 */
export function resolveLocale(tag: string | undefined | null): Locale {
  if (!tag) return 'en';
  const base = tag.toLowerCase().replace('_', '-').split('-')[0];
  return (['en', 'fr', 'es', 'pt', 'zh'] as const).find(l => l === base) ?? 'en';
}
