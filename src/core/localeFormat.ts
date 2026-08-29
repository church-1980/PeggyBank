/**
 * MONEY AND DATES IN THE READER'S LANGUAGE.
 *
 * Translating the words is the easy half. The half that actually goes wrong is
 * the numbers: `formatCurrency` hardcoded "$1,234.56", which is correct in
 * English Canada and wrong everywhere else. A Quebec reader writes 1 234,56 $
 * — comma for the decimal, space for thousands, and the dollar sign AFTER the
 * amount. Showing them "$1,234.56" is not a style choice; the comma reads as a
 * decimal point, so $1,234.56 can be read as one dollar twenty-three.
 *
 * WHY THIS IS HAND-ROLLED RATHER THAN Intl
 * ----------------------------------------
 * React Native's JavaScript engine ships without full ICU data on some Android
 * builds, so Intl.NumberFormat silently falls back to English there — the exact
 * failure this file exists to prevent, and one that would never show up on a
 * developer's machine. Explicit rules are also pure and testable with no device.
 *
 * RULES FOR THIS FILE
 *  1. PURE. No React, no database, no Date.now().
 *  2. It formats what it is given. It never decides an AMOUNT — that is
 *     finance.ts's job, and there is exactly one of those.
 */

export type Locale = 'en' | 'fr' | 'es' | 'pt' | 'zh';

export const LOCALES: Locale[] = ['en', 'fr', 'es', 'pt', 'zh'];

/** What the language is called IN that language — never translated. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  zh: '中文',
};

interface NumberRules {
  /** Character between dollars and cents. */
  decimal: string;
  /** Character between thousands. */
  group: string;
  /** Does the currency symbol come before the number? */
  symbolFirst: boolean;
  /** Space between symbol and number. */
  symbolSpace: string;
}

/**
 * A non-breaking space. A plain space would let "1 234,56 $" wrap between the
 * amount and its sign at the end of a line, which is how a price becomes two
 * unrelated numbers.
 */
const NBSP = ' ';

const NUMBER_RULES: Record<Locale, NumberRules> = {
  // $1,234.56
  en: { decimal: '.', group: ',', symbolFirst: true,  symbolSpace: '' },
  // 1 234,56 $ — Quebec and France both put the sign last.
  fr: { decimal: ',', group: NBSP, symbolFirst: false, symbolSpace: NBSP },
  // $1,234.56 — Latin America broadly follows the US pattern; Spain does not,
  // and this app targets the Americas.
  es: { decimal: '.', group: ',', symbolFirst: true,  symbolSpace: '' },
  // $ 1.234,56 — Brazil groups with dots and puts a space after the sign.
  pt: { decimal: ',', group: '.', symbolFirst: true,  symbolSpace: NBSP },
  // $1,234.56
  zh: { decimal: '.', group: ',', symbolFirst: true,  symbolSpace: '' },
};

/**
 * Money, written the way this reader writes money.
 *
 * The minus sign always leads, in every locale here: "-1 234,56 $". Putting it
 * next to the symbol produces "1 234,56 -$", which reads as a typo.
 */
export function formatMoney(amount: number, locale: Locale, symbol = '$'): string {
  const r = NUMBER_RULES[locale];
  const safe = Number.isFinite(amount) ? amount : 0;
  const negative = safe < 0;

  const fixed = Math.abs(safe).toFixed(2);
  const [whole, cents] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, r.group);
  const n = grouped + r.decimal + cents;

  const body = r.symbolFirst
    ? symbol + r.symbolSpace + n
    : n + r.symbolSpace + symbol;

  return (negative ? '-' : '') + body;
}

/** A plain number — counts, percentages — grouped for this reader. */
export function formatNumber(value: number, locale: Locale, decimals = 0): string {
  const r = NUMBER_RULES[locale];
  const safe = Number.isFinite(value) ? value : 0;
  const negative = safe < 0;
  const fixed = Math.abs(safe).toFixed(decimals);
  const [whole, rest] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, r.group);
  return (negative ? '-' : '') + grouped + (rest ? r.decimal + rest : '');
}

/**
 * ── DATES ──────────────────────────────────────────────────────────────────
 *
 * Twelve files called toLocaleDateString('en-US', …), which pins the app to
 * English regardless of what the reader chose. Month names and word order are
 * not interchangeable: English writes "August 29, 2026", French "29 août 2026",
 * Chinese "2026年8月29日". The order carries meaning, so it is per-locale data
 * rather than a template with the pieces swapped.
 */

const MONTHS_LONG: Record<Locale, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
       'July', 'August', 'September', 'October', 'November', 'December'],
  // Lower case is correct in French: months are not proper nouns.
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
       'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
       'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  zh: ['1月', '2月', '3月', '4月', '5月', '6月',
       '7月', '8月', '9月', '10月', '11月', '12月'],
};

const MONTHS_SHORT: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
};

/** Sunday first, matching JavaScript's getDay(). */
const WEEKDAYS_LONG: Record<Locale, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  pt: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
  zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
};

const WEEKDAYS_SHORT: Record<Locale, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  fr: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
  es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  zh: ['日', '一', '二', '三', '四', '五', '六'],
};

export function monthName(month: number, locale: Locale, short = false): string {
  const table = short ? MONTHS_SHORT : MONTHS_LONG;
  return table[locale][Math.max(0, Math.min(11, month))];
}

export function weekdayName(day: number, locale: Locale, short = false): string {
  const table = short ? WEEKDAYS_SHORT : WEEKDAYS_LONG;
  return table[locale][Math.max(0, Math.min(6, day))];
}

/** "August 2026" · "août 2026" · "2026年8月" */
export function formatMonthYear(d: Date, locale: Locale): string {
  const m = monthName(d.getMonth(), locale);
  if (locale === 'zh') return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
  return m + ' ' + d.getFullYear();
}

/**
 * "August 29, 2026" · "29 août 2026" · "29 de agosto de 2026" · "2026年8月29日"
 *
 * Spanish and Portuguese need "de" between the parts; leaving it out gives
 * "29 agosto 2026", which is the kind of almost-right that marks an app as
 * machine-translated.
 */
export function formatLongDate(d: Date, locale: Locale): string {
  const day = d.getDate();
  const m = monthName(d.getMonth(), locale);
  const y = d.getFullYear();
  switch (locale) {
    case 'zh': return y + '年' + (d.getMonth() + 1) + '月' + day + '日';
    case 'fr': return day + ' ' + m + ' ' + y;
    case 'es':
    case 'pt': return day + ' de ' + m + ' de ' + y;
    default:   return m + ' ' + day + ', ' + y;
  }
}

/** "Aug 29" · "29 août" · "8月29日" — for tight rows. */
export function formatShortDate(d: Date, locale: Locale): string {
  const day = d.getDate();
  const m = monthName(d.getMonth(), locale, true);
  switch (locale) {
    case 'zh': return (d.getMonth() + 1) + '月' + day + '日';
    case 'fr':
    case 'es':
    case 'pt': return day + ' ' + m;
    default:   return m + ' ' + day;
  }
}
