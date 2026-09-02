import { Category } from '../../types';
import { ExtractedFields, DocType, Confidence, EMPTY_CONFIDENCE } from './types';
import { chooseAmount, chooseMerchant, namePlausibility } from '../../core/documentFields';

/**
 * Heuristic extraction over OCR text. NO fabrication: every field is only set
 * when the text actually supports it; otherwise it stays undefined and its
 * confidence is 'none' (the UI shows "Please review").
 *
 * These rules are intentionally conservative — a wrong-but-confident guess is
 * worse than an empty field the user fills in.
 */

// ── Payee dictionary (Canadian telecom/utilities + common merchants) ──────────
const BILL_PAYEES: { name: string; re: RegExp; category: Category; recurring: boolean }[] = [
  { name: 'Bell',       re: /\bbell\b/i,                         category: 'home',  recurring: true },
  { name: 'Rogers',     re: /\brogers\b/i,                       category: 'home',  recurring: true },
  { name: 'Telus',      re: /\btelus\b/i,                        category: 'home',  recurring: true },
  { name: 'Videotron',  re: /\bvid[eé]otron\b/i,                 category: 'home',  recurring: true },
  { name: 'Hydro',      re: /\bhydro(?:[- ]?qu[eé]bec|[- ]?one)?\b/i, category: 'home', recurring: true },
  { name: 'Enbridge',   re: /\benbridge\b/i,                     category: 'home',  recurring: true },
  { name: 'Fido',       re: /\bfido\b/i,                         category: 'home',  recurring: true },
  { name: 'Koodo',      re: /\bkoodo\b/i,                        category: 'home',  recurring: true },
];

// ── Merchant → category keywords (expense receipts) ───────────────────────────
const CATEGORY_KEYWORDS: { re: RegExp; category: Category }[] = [
  { re: /\b(grocery|groceries|supermarket|market|walmart|costco|loblaws|metro|sobeys|no ?frills|food ?basics|iga|maxi|provigo|super ?c|farm ?boy|freshco|giant ?tiger|bulk ?barn|save ?on ?foods|safeway|whole ?foods|epicerie)\b/i, category: 'groceries' },
  { re: /\b(gas|fuel|petro|petro[- ]?canada|esso|shell|husky|ultramar|chevron|pioneer|irving|mobil|couche[- ]?tard)\b/i, category: 'gas' },
  { re: /\b(restaurant|cafe|coffee|starbucks|tim ?hortons|mcdonald|pizza|sushi|diner|bistro|grill|subway|harvey|swiss ?chalet|boston ?pizza|st[- ]?hubert|dairy ?queen|wendy|burger ?king|kfc|taco|poutine|brasserie)\b/i, category: 'restaurant' },
  { re: /\b(pharmacy|pharmacie|drug ?mart|shoppers|jean ?coutu|rexall|pharmaprix|uniprix|familiprix|clinic|clinique|dental|dentist|medical|health|hospital|physio|optometr|chiropract|prescription)\b/i, category: 'health' },
  { re: /\b(pet|petsmart|petland|mondou|veterinar|animal ?hospital)\b/i, category: 'pets' },
  { re: /\b(cinema|movie|theatre|game|steam|playstation|xbox|nintendo|netflix|spotify|disney|crave|entertain|concert|bowling)\b/i, category: 'fun' },
  { re: /\b(amazon|best ?buy|clothing|shoes|mall|retail|dollarama|winners|marshalls|ikea|staples|indigo|sportchek|simons)\b/i, category: 'shopping' },
  { re: /\b(hotel|motel|airbnb|flight|air ?canada|westjet|porter|expedia|booking|via ?rail|car ?rental)\b/i, category: 'travel' },
];

// ── Amount ────────────────────────────────────────────────────────────────────
// Scoring lives in core/documentFields, where it can be tested against text
// alone and where the label vocabulary is shared rather than duplicated.

function findAmount(lines: string[]): { value?: number; conf: Confidence } {
  const choice = chooseAmount(lines);
  return { value: choice.value, conf: choice.confidence };
}

// ── Dates ─────────────────────────────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
function pad(n: number) { return n < 10 ? '0' + n : '' + n; }

/** Parse the first date found in text → YYYY-MM-DD, or undefined. */
/**
 * Parse the first date found, and say how sure we are of it.
 *
 * The distinction existed in this code and was thrown away: every date was
 * reported as merely low, however plainly it was printed, so no receipt could
 * ever be confident enough to file itself. "AUG 28, 2026" has exactly one
 * reading. "03/04/2026" has two — as the comment below already said.
 */
function parseDate(text: string): string | undefined {
  return parseDateInner(text).date;
}

function parseDateInner(text: string): { date?: string; certain: boolean } {
  // 2026-07-28 or 2026/07/28
  let m = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (m) return { date: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`, certain: true };
  // 07/28/2026 (M/D/Y) or 28/07/2026 (D/M/Y). Disambiguate by which field can
  // only be a day; when both are ≤ 12 it's genuinely ambiguous → assume M/D/Y.
  m = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (m) {
    let month = +m[1], day = +m[2];
    const ambiguous = month <= 12 && day <= 12;   // 03/04 reads both ways
    if (month > 12 && day <= 12) { month = +m[2]; day = +m[1]; } // clearly D/M/Y
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { date: `${m[3]}-${pad(month)}-${pad(day)}`, certain: !ambiguous };
    }
  }
  // Jul 28, 2026  /  July 28 2026  /  28 Jul 2026
  m = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return { date: `${m[3]}-${pad(MONTHS[m[1].slice(0, 3).toLowerCase()])}-${pad(+m[2])}`, certain: true };
  m = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(20\d{2})\b/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return { date: `${m[3]}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(+m[1])}`, certain: true };
  return { certain: false };
}

function findDueDate(lines: string[]): string | undefined {
  for (const line of lines) {
    if (/\bdue\b/i.test(line)) {
      const d = parseDate(line);
      if (d) return d;
    }
  }
  return undefined;
}

// ── Merchant / payee ──────────────────────────────────────────────────────────
/**
 * Shops PeggyBank can name outright.
 *
 * The same brands it already recognised for CATEGORY purposes. That knowledge
 * existed but was only ever used to guess a category, never to name the shop --
 * which is why a Tim Hortons receipt could not report "Tim Hortons" even though
 * the app plainly knew what Tim Hortons was.
 *
 * This is a convenience layer, not the mechanism. Receipt STRUCTURE still names
 * shops that are not on the list, so PeggyBank does not depend on knowing brands.
 */
const MERCHANT_BRANDS: { name: string; re: RegExp }[] = [
  { name: "Tim Hortons", re: new RegExp("\\btim\\s?hortons\\b", 'i') },
  { name: "McDonald's", re: new RegExp("\\bmcdonald\\s?'?s?\\b", 'i') },
  { name: "Starbucks", re: new RegExp("\\bstarbucks\\b", 'i') },
  { name: "Subway", re: new RegExp("\\bsubway\\b", 'i') },
  { name: "A&W", re: new RegExp("\\ba\\&w\\b", 'i') },
  { name: "Harvey’s", re: new RegExp("\\bharveys?\\b", 'i') },
  { name: "St-Hubert", re: new RegExp("\\bst[-\\s]?hubert\\b", 'i') },
  { name: "Maxi", re: new RegExp("\\bmaxi\\b", 'i') },
  { name: "Metro", re: new RegExp("\\bmetro\\b", 'i') },
  { name: "IGA", re: new RegExp("\\biga\\b", 'i') },
  { name: "Provigo", re: new RegExp("\\bprovigo\\b", 'i') },
  { name: "Super C", re: new RegExp("\\bsuper\\s?c\\b", 'i') },
  { name: "Costco", re: new RegExp("\\bcostco\\b", 'i') },
  { name: "Walmart", re: new RegExp("\\bwal[-\\s]?mart\\b", 'i') },
  { name: "Loblaws", re: new RegExp("\\bloblaws\\b", 'i') },
  { name: "Sobeys", re: new RegExp("\\bsobeys\\b", 'i') },
  { name: "Dollarama", re: new RegExp("\\bdollarama\\b", 'i') },
  { name: "Canadian Tire", re: new RegExp("\\bcanadian\\s?tire\\b", 'i') },
  { name: "Shell", re: new RegExp("\\bshell\\b", 'i') },
  { name: "Esso", re: new RegExp("\\besso\\b", 'i') },
  { name: "Petro-Canada", re: new RegExp("\\bpetro[-\\s]?canada\\b", 'i') },
  { name: "Ultramar", re: new RegExp("\\bultramar\\b", 'i') },
  { name: "Couche-Tard", re: new RegExp("\\bcouche[-\\s]?tard\\b", 'i') },
  { name: "Jean Coutu", re: new RegExp("\\bjean\\s?coutu\\b", 'i') },
  { name: "Pharmaprix", re: new RegExp("\\bpharmaprix\\b", 'i') },
  { name: "Uniprix", re: new RegExp("\\buniprix\\b", 'i') },
  { name: "Familiprix", re: new RegExp("\\bfamiliprix\\b", 'i') },
  { name: "Amazon", re: new RegExp("\\bamazon\\b", 'i') },
  { name: "Best Buy", re: new RegExp("\\bbest\\s?buy\\b", 'i') },
  { name: "IKEA", re: new RegExp("\\bikea\\b", 'i') },
  { name: "Winners", re: new RegExp("\\bwinners\\b", 'i') },
  { name: "Simons", re: new RegExp("\\bsimons\\b", 'i') },
  { name: "Mondou", re: new RegExp("\\bmondou\\b", 'i') },
];

/**
 * Who the money went to.
 *
 * The brand and payee tables above are a CONVENIENCE, not the mechanism: they
 * are handed to the scorer as a lookup so that an unknown company is still
 * named by the structure of its own document. Real-phone testing produced a QR
 * payload where a company name belonged, so plausibility is now scored in
 * core/documentFields and an implausible string is not offered at all.
 */
function findMerchant(lines: string[]): { name?: string; conf: Confidence } {
  const joined = lines.join(' ');

  // A known bill payee anywhere on the page — these are unambiguous.
  for (const p of BILL_PAYEES) {
    if (p.re.test(joined)) return { name: p.name, conf: 'high' };
  }

  const choice = chooseMerchant(lines, (row) => {
    for (const b of MERCHANT_BRANDS) if (b.re.test(row)) return b.name;
    return undefined;
  });

  // A name we cannot believe in is worse than no name: the review screen can
  // ask a question, but it cannot un-save a wrong one.
  if (choice.name && namePlausibility(choice.name) === 0) {
    return { conf: 'none' };
  }
  return { name: choice.name, conf: choice.confidence };
}

// ── Doc type ──────────────────────────────────────────────────────────────────
function classify(text: string): { type: DocType; conf: Confidence } {
  const billSignals = /\b(amount due|due date|account number|statement|billing period|invoice|amount owing|total due|autopay)\b/i;
  const receiptSignals = /\b(total|subtotal|tax|gst|hst|pst|qst|change|cash|debit|visa|mastercard|approved)\b/i;
  const bill = billSignals.test(text);
  const receipt = receiptSignals.test(text);
  if (bill && !receipt) return { type: 'bill', conf: 'high' };
  if (receipt && !bill) return { type: 'expense', conf: 'high' };
  if (bill && receipt)  return { type: 'bill', conf: 'low' }; // "amount due" usually wins
  return { type: 'unknown', conf: 'none' };
}

function findCategory(text: string, payeeCategory?: Category): { category?: Category; conf: Confidence } {
  if (payeeCategory) return { category: payeeCategory, conf: 'high' };
  for (const k of CATEGORY_KEYWORDS) if (k.re.test(text)) return { category: k.category, conf: 'low' };
  return { conf: 'none' };
}

/** Main entry: turn OCR text into conservative, honest suggestions. */
export function parseDocument(rawText: string): ExtractedFields {
  const text = rawText || '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const cls = classify(text);
  const amt = findAmount(lines);
  const merch = findMerchant(lines);
  const due = cls.type === 'bill' ? findDueDate(lines) : undefined;
  const txRead = parseDateInner(text);
  const txDate = txRead.date;

  // Payee dictionary can also supply category + recurrence for bills.
  const payee = BILL_PAYEES.find((p) => merch.name && p.name === merch.name);
  const cat = findCategory(text, payee?.category);

  const conf = { ...EMPTY_CONFIDENCE };
  conf.docType = cls.conf;
  conf.amount = amt.conf;
  conf.merchant = merch.conf;
  conf.date = txDate ? (txRead.certain ? 'high' : 'low') : 'none';
  conf.dueDate = due ? 'high' : 'none';
  conf.category = cat.conf;

  return {
    docType: cls.type,
    merchant: merch.name,
    amount: amt.value,
    date: txDate,
    dueDate: due,
    category: cat.category,
    recurring: payee?.recurring || (cls.type === 'bill' && /\bmonthly\b/i.test(text)) || undefined,
    confidence: conf,
  };
}
