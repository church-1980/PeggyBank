/**
 * WHAT DID THE PERSON MEAN BY THAT?
 *
 * People do not type search syntax. They type "tims", "$20", "august 12",
 * "bell" — and they expect the app to work out which of those is a name, an
 * amount and a date. This file does that, and only that: it turns one line of
 * typing into a description of what to look for.
 *
 * PURE. No database, no React. It decides MEANING; activity.ts does the finding.
 *
 * The rule that keeps it honest: an ambiguous word stays ambiguous. "12" could
 * be twelve dollars or the twelfth of the month, so it is treated as BOTH and
 * anything matching either is shown. Guessing one and silently discarding the
 * other is how a search quietly hides the thing you were looking for.
 */

export interface ParsedQuery {
  /** The raw words, for matching against names and categories. */
  text: string;
  /** An amount the person may have typed. Matched to the cent. */
  amount?: number;
  /**
   * A day of the month they may have named ("august 12" -> 12).
   * Kept apart from `month` so "the 12th" works with no month given.
   */
  day?: number;
  /** A month they may have named, 0-11. */
  month?: number;
  /** A four-digit year, when given. */
  year?: number;
  /** True when the line held nothing worth searching for. */
  empty: boolean;
  /**
   * True when ONE token could be either an amount or a day — "20" is both
   * twenty dollars and the twentieth. The finder must then match EITHER; a
   * search requiring both finds nothing at all.
   */
  ambiguousNumber: boolean;
}

const MONTH_WORDS: { names: string[]; index: number }[] = [
  { names: ['january', 'jan', 'janvier', 'enero', 'janeiro'], index: 0 },
  { names: ['february', 'feb', 'février', 'fevrier', 'febrero', 'fevereiro'], index: 1 },
  { names: ['march', 'mar', 'mars', 'marzo', 'março', 'marco'], index: 2 },
  { names: ['april', 'apr', 'avril', 'abril'], index: 3 },
  { names: ['may', 'mai', 'mayo', 'maio'], index: 4 },
  { names: ['june', 'jun', 'juin', 'junio', 'junho'], index: 5 },
  { names: ['july', 'jul', 'juillet', 'julio', 'julho'], index: 6 },
  { names: ['august', 'aug', 'août', 'aout', 'agosto'], index: 7 },
  { names: ['september', 'sep', 'sept', 'septembre', 'septiembre', 'setembro'], index: 8 },
  { names: ['october', 'oct', 'octobre', 'octubre', 'outubro'], index: 9 },
  { names: ['november', 'nov', 'novembre', 'noviembre', 'novembro'], index: 10 },
  { names: ['december', 'dec', 'déc', 'decembre', 'décembre', 'diciembre', 'dezembro'], index: 11 },
];

/**
 * Read one line of typing.
 *
 * Month words are recognised in all five of PeggyBank's languages, because
 * someone reading the app in French will type "août", not "august".
 */
export function parseQuery(raw: string): ParsedQuery {
  const text = (raw ?? '').trim();
  if (!text) return { text: '', empty: true, ambiguousNumber: false };

  const lower = text.toLowerCase();
  const out: ParsedQuery = { text, empty: false, ambiguousNumber: false };

  // An amount, with or without a dollar sign, comma or period decimal.
  let rest = lower;
  const money = lower.match(/\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+[.,]\d{2})\b/);
  if (money) {
    const n = parseFloat((money[1] ?? money[2]).replace(',', '.'));
    if (Number.isFinite(n)) out.amount = n;
    // Blank out the digits the amount claimed. A decimal is money and
    // nothing else, so its leading number must not resurface as a day.
    rest = rest.replace(money[0], ' ');
  }

  for (const m of MONTH_WORDS) {
    if (m.names.some(n => new RegExp('\\b' + n + '\\b').test(lower))) { out.month = m.index; break; }
  }

  const year = lower.match(/\b(20\d{2})\b/);
  if (year) out.year = parseInt(year[1], 10);

  // A bare number is a day only when it could be one, and only when it was not
  // already claimed as the amount.
  for (const m of rest.matchAll(/\b(\d{1,2})\b/g)) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 31 && n !== out.amount) { out.day = n; break; }
  }

  // A plain number with no decimal is ALSO a candidate amount: "20" should
  // find a $20 lunch, not only the 20th of the month.
  if (out.amount == null) {
    const bare = rest.match(/^\s*(\d{1,6})\s*$/);
    if (bare) out.amount = parseInt(bare[1], 10);
  }

  // The same token read two ways, with no month to settle it.
  out.ambiguousNumber =
    out.amount != null && out.day != null && out.amount === out.day && out.month == null;

  return out;
}

/** The words left once amounts and dates are taken out — what to match names on. */
export function searchTerms(q: ParsedQuery): string[] {
  return q.text
    .toLowerCase()
    .replace(/[$,]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !/^[0-9]+([.,][0-9]+)?$/.test(w))
    .filter(w => !MONTH_WORDS.some(m => m.names.includes(w)));
}
