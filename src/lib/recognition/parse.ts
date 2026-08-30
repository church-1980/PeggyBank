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
/**
 * A money-looking token. Accepts a decimal point OR a decimal comma, because
 * Quebec receipts print 23,45 as often as 23.45, and the old pattern demanded
 * a point and so read French receipts as having no amounts at all.
 */
/**
 * A money-looking token. Accepts a decimal point OR a decimal comma, because
 * Quebec receipts print 23,45 as often as 23.45. The old pattern demanded a
 * point, so a French receipt looked to it like a page with no amounts on it.
 */
const AMOUNT_RE = new RegExp('-?\\$?\\s?\\d{1,3}(?:[,\\s]\\d{3})*[.,]\\d{2}|-?\\$?\\s?\\d+[.,]\\d{2}', 'g');

/** "1 234,56" / "$1,234.56" / "-112.10" -> number. */
function toNumber(s: string): number {
  let v = s.replace(/[^0-9.,-]/g, '').trim();
  const lastDot = v.lastIndexOf('.');
  const lastComma = v.lastIndexOf(',');
  // Whichever separator comes last is the decimal one; the other groups thousands.
  if (lastComma > lastDot) v = v.split('.').join('').replace(',', '.');
  else v = v.split(',').join('');
  return parseFloat(v);
}

/**
 * Lines carrying a number that is NOT what the purchase cost.
 *
 * "sous-total" is why this exists. The old rule tested for the word "total"
 * with word boundaries, and a hyphen IS a word boundary, so "SOUS-TOTAL 41.60"
 * matched, was taken as the total, and the search stopped there. "TOTAL DES
 * TAXES" did the same.
 */
const NOT_THE_TOTAL: RegExp[] = [
  new RegExp('sous[-\s]?total', 'i'),
  new RegExp("\\bsub[-\\s]?total\\b", 'i'),
  new RegExp('total\s+des\s+taxes', 'i'),
  new RegExp("\\btotal\\s+tax(es)?\\b", 'i'),
  new RegExp("\\b(gst|hst|pst|qst|tps|tvq|tvh|taxes?)\\b", 'i'),
  new RegExp("\\b(change|monnaie)\\b", 'i'),
  new RegExp("\\b(cash|comptant|tendered|tender|especes)\\b", 'i'),
  new RegExp("\\b(litres?|price)\\b\\s*/?\\s*l?", 'i'),
  new RegExp('(previous balance|payment received|solde pr)', 'i'),
  new RegExp("\\b(points|loyalty|reward|carte|account)\\b", 'i'),
];

/** Lines whose number IS the purchase amount, strongest first. */
const IS_THE_TOTAL: RegExp[] = [
  new RegExp("\\b(grand\\s+total|total\\s+due|amount\\s+due|balance\\s+due|amount\\s+owing|montant\\s+d[uu])\\b", 'i'),
  new RegExp("\\b(total|montant|solde)\\b", 'i'),
];

/**
 * The amount actually paid.
 *
 * Scores every money token in context rather than taking the first line that
 * mentions "total" or, failing that, the biggest number on the page. The
 * biggest number is frequently the cash tendered, and the first "total" is
 * frequently the subtotal.
 */
function findAmount(lines: string[]): { value?: number; conf: Confidence } {
  type Cand = { value: number; score: number };
  const cands: Cand[] = [];

  lines.forEach((line, i) => {
    const matches = line.match(AMOUNT_RE);
    if (!matches) return;
    const excluded = NOT_THE_TOTAL.some(re => re.test(line));
    let label = -1;
    IS_THE_TOTAL.forEach((re, rank) => { if (label === -1 && re.test(line)) label = rank; });

    for (const raw of matches) {
      const value = toNumber(raw);
      if (!Number.isFinite(value) || value <= 0) continue;   // a negative is a credit
      let score = 0;
      if (label === 0) score += 100;                          // "amount due", "grand total"
      else if (label === 1) score += 60;                      // a plain "total"
      if (excluded) score -= 120;                             // subtotal, tax, change, cash
      score += (i / Math.max(1, lines.length)) * 10;          // later lines are likelier
      cands.push({ value, score });
    }
  });

  if (!cands.length) return { conf: 'none' };
  cands.sort((a, b) => b.score - a.score || b.value - a.value);
  const best = cands[0];

  // A labelled, non-excluded line is a real reading. Anything else is a guess,
  // and the person should be invited to check it rather than trust it.
  if (best.score >= 60) return { value: best.value, conf: 'high' };
  if (best.score >= 0) return { value: best.value, conf: 'low' };

  // Everything was excluded. Offer the largest positive figure, clearly marked
  // as unreliable rather than presented as though it had been read.
  const largest = cands.reduce((m, c) => (c.value > m.value ? c : m), cands[0]);
  return { value: largest.value, conf: 'low' };
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

/** Lines that are never the shop name. */
const NOT_A_MERCHANT: RegExp[] = [
  new RegExp("\\b(receipt|invoice|facture|tel|telephone|fax|www|http|store|magasin|order|commande|no|num)\\b", 'i'),
  new RegExp("^[0-9\\\\s#*.,:/-]+$", 'i'),                 // pure numbers, dividers
  new RegExp("\\b(boul|blvd|rue|street|st|ave|avenue|chemin|road|rd|suite|app)\\b[\\\\s.,]", 'i'),
  new RegExp("^(qc|on|bc|ab|quebec|ontario|canada)$", 'i'),
  new RegExp("\\b(merci|thank\\\\s?you|bienvenue|welcome)\\b", 'i'),
];

/**
 * Who the money went to.
 *
 * Three passes, strongest first:
 *   1. a bill payee (Bell, Hydro) -- these are unambiguous
 *   2. a brand the app already knows
 *   3. the structure of the receipt itself
 *
 * The old rule was "the first substantial line in the top four", which happily
 * returned a street address, a store number or "THANK YOU", and always at low
 * confidence -- so the review screen could not present it as read.
 */
function findMerchant(lines: string[]): { name?: string; conf: Confidence } {
  const joined = lines.join(" ");

  // 1. A known bill payee.
  for (const p of BILL_PAYEES) {
    if (p.re.test(joined)) return { name: p.name, conf: 'high' };
  }

  // 2. A brand we can name. Checked against the top of the receipt, where a
  //    shop puts its name, so a passing mention further down does not win.
  const header = lines.slice(0, 8).join(' ');
  for (const b of MERCHANT_BRANDS) {
    if (b.re.test(header)) return { name: b.name, conf: 'high' };
  }

  // 3. An unknown shop: score the top lines on how much they look like a name.
  let best: { name: string; score: number } | null = null;
  lines.slice(0, 6).forEach((raw, i) => {
    const line = raw.trim().replace(/\s{2,}/g, ' ');
    if (line.length < 3) return;
    if (NOT_A_MERCHANT.some(re => re.test(line))) return;
    const letters = (line.match(new RegExp('[A-Za-z]', 'g')) || []).length;
    if (letters < 3) return;

    let score = 10 - i * 2;                                  // higher up is likelier
    if (letters / line.length > 0.6) score += 4;             // mostly words, not digits
    if (line === line.toUpperCase()) score += 2;             // shop names are often shouted
    if (line.length <= 28) score += 2;                       // a name, not a sentence
    if (!best || score > best.score) best = { name: line.slice(0, 40), score };
  });

  if (best) return { name: (best as { name: string }).name, conf: 'low' };
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
