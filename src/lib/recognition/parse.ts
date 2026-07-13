import { Category } from '../../types';
import { ExtractedFields, DocType, Confidence, EMPTY_CONFIDENCE } from './types';

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
  { re: /\b(grocery|groceries|supermarket|market|walmart|costco|loblaws|metro|sobeys|no ?frills|food ?basics|iga)\b/i, category: 'groceries' },
  { re: /\b(gas|fuel|petro|esso|shell|husky|ultramar|chevron)\b/i, category: 'gas' },
  { re: /\b(restaurant|cafe|caf[eé]|coffee|starbucks|tim ?hortons|mcdonald|pizza|sushi|diner|bar ?&|grill)\b/i, category: 'restaurant' },
  { re: /\b(pharmacy|drug ?mart|shoppers|jean ?coutu|clinic|dental|medical|health)\b/i, category: 'health' },
  { re: /\b(pet|petsmart|petland|veterinar)\b/i, category: 'pets' },
  { re: /\b(cinema|movie|game|steam|playstation|xbox|netflix|spotify|entertain)\b/i, category: 'fun' },
  { re: /\b(amazon|best ?buy|clothing|shoes|mall|store|retail)\b/i, category: 'shopping' },
  { re: /\b(hotel|airbnb|flight|air ?canada|westjet|expedia|booking)\b/i, category: 'travel' },
];

// ── Amount ────────────────────────────────────────────────────────────────────
const AMOUNT_RE = /\$?\s?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})/g;

function toNumber(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, ''));
}

function findAmount(lines: string[]): { value?: number; conf: Confidence } {
  // Prefer a value on a line that mentions total / amount due / balance.
  const strong = /\b(total|amount due|balance due|amount owing|grand total|total due)\b/i;
  let best: number | undefined;
  for (const line of lines) {
    if (strong.test(line)) {
      const m = line.match(AMOUNT_RE);
      if (m && m.length) { best = toNumber(m[m.length - 1]); break; }
    }
  }
  if (best !== undefined && !isNaN(best)) return { value: best, conf: 'high' };

  // Fallback: the largest currency-looking number in the document.
  const all: number[] = [];
  for (const line of lines) {
    const m = line.match(AMOUNT_RE);
    if (m) m.forEach((x) => { const n = toNumber(x); if (!isNaN(n)) all.push(n); });
  }
  if (all.length) return { value: Math.max(...all), conf: 'low' };
  return { conf: 'none' };
}

// ── Dates ─────────────────────────────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
function pad(n: number) { return n < 10 ? '0' + n : '' + n; }

/** Parse the first date found in text → YYYY-MM-DD, or undefined. */
function parseDate(text: string): string | undefined {
  // 2026-07-28 or 2026/07/28
  let m = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  // 07/28/2026 (M/D/Y) or 28/07/2026 (D/M/Y). Disambiguate by which field can
  // only be a day; when both are ≤ 12 it's genuinely ambiguous → assume M/D/Y.
  m = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (m) {
    let month = +m[1], day = +m[2];
    if (month > 12 && day <= 12) { month = +m[2]; day = +m[1]; } // clearly D/M/Y
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${m[3]}-${pad(month)}-${pad(day)}`;
  }
  // Jul 28, 2026  /  July 28 2026  /  28 Jul 2026
  m = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].slice(0, 3).toLowerCase()])}-${pad(+m[2])}`;
  m = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(20\d{2})\b/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(+m[1])}`;
  return undefined;
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
function findMerchant(lines: string[]): { name?: string; conf: Confidence } {
  // Known payee wins.
  const joined = lines.join(' ');
  for (const p of BILL_PAYEES) if (p.re.test(joined)) return { name: p.name, conf: 'high' };
  // Otherwise the first substantial top line (likely the store name).
  for (const line of lines.slice(0, 4)) {
    const t = line.trim();
    if (t.length >= 3 && /[A-Za-z]/.test(t) && !/\b(receipt|invoice|tel|www|http|store #)\b/i.test(t)) {
      return { name: t.replace(/\s{2,}/g, ' ').slice(0, 40), conf: 'low' };
    }
  }
  return { conf: 'none' };
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
  const txDate = parseDate(text);

  // Payee dictionary can also supply category + recurrence for bills.
  const payee = BILL_PAYEES.find((p) => merch.name && p.name === merch.name);
  const cat = findCategory(text, payee?.category);

  const conf = { ...EMPTY_CONFIDENCE };
  conf.docType = cls.conf;
  conf.amount = amt.conf;
  conf.merchant = merch.conf;
  conf.date = txDate ? 'low' : 'none';
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
