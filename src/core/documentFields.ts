/**
 * WHICH NUMBER DID THE PERSON ACTUALLY PAY, AND WHO DID THEY PAY IT TO?
 *
 * Real-phone testing found the previous rules answering two easier questions
 * instead: "which number looks important?" and "what text near the top looks
 * unusual?". Those produce a $60.00 line item on a $655.00 dinner, a subtotal
 * beating a printed TOTAL, and a QR payload — "ql=11tzk9dmupMga…" — presented
 * as the name of an electricity company.
 *
 * Pure: no React, no database, no platform imports, so every rule here is
 * testable against text alone.
 *
 * TWO IDEAS DO MOST OF THE WORK
 *
 * 1. A LABEL BEATS A POSITION. A number sitting beside the words "Amount due"
 *    is evidence. A number that merely happens to be last on the page is not.
 *    Where OCR has split the label and its number into separate rows — which
 *    is normal, because receipts are two columns — they are paired back up.
 *
 * 2. A NAME MUST LOOK LIKE A NAME. Confidence is earned by plausibility, not
 *    granted by position. A string that reads as machine output is never
 *    offered as a company, at any confidence, because the honest answer is to
 *    ask rather than to guess wrongly.
 */

export type Confidence = 'high' | 'low' | 'none';

// ─────────────────────────────────────────────────────────────────────────────
// MONEY
// ─────────────────────────────────────────────────────────────────────────────

/** A money-looking token: 1 234,56 / $1,234.56 / -112.10 / 61.95 */
const MONEY = new RegExp(
  '-?\\$?\\s?\\d{1,3}(?:[,\\s]\\d{3})+[.,]\\d{2}|-?\\$?\\s?\\d+[.,]\\d{2}',
  'g',
);

/** "1 234,56" / "$1,234.56" / "-112.10" -> number */
export function toNumber(s: string): number {
  let v = s.replace(new RegExp('[^0-9.,-]', 'g'), '').trim();
  const lastDot = v.lastIndexOf('.');
  const lastComma = v.lastIndexOf(',');
  if (lastComma > lastDot) v = v.split('.').join('').replace(',', '.');
  else v = v.split(',').join('');
  return parseFloat(v);
}

/**
 * The words that mean THIS IS THE FIGURE YOU OWE.
 *
 * Deliberately not an English-only list: the app ships French, Spanish,
 * Portuguese and Chinese, and a Quebec hydro bill says "montant dû" where an
 * Australian one says "total amount due".
 */
const FINAL_LABEL = new RegExp(
  [
    'grand\\s*total', 'total\\s*amount\\s*due', 'current\\s*amount\\s*due',
    'amount\\s*due', 'amount\\s*owing', 'amount\\s*payable', 'balance\\s*due',
    'payment\\s*due', 'total\\s*due', 'total\\s*payable', 'net\\s*total',
    'total\\s*bill', 'amount\\s*of\\s*this\\s*bill', 'new\\s*amount\\s*due',
    'new\\s*charges', 'please\\s*pay', 'you\\s*owe', 'total\\s*owing',
    // French
    'montant\\s*d[uû]', 'solde\\s*[aà]\\s*payer', 'total\\s*[aà]\\s*payer',
    'montant\\s*exigible', 'montant\\s*total', 'net\\s*[aà]\\s*payer',
    // Spanish / Portuguese
    'importe\\s*total', 'total\\s*a\\s*pagar', 'valor\\s*total',
    'saldo\\s*a\\s*pagar', 'importe\\s*a\\s*pagar',
    // Chinese
    '应付金额', '应缴金额', '合计金额', '总计',
  ].join('|'),
  'i',
);

/** A plain "total" — good evidence, but weaker than an explicit amount due. */
const TOTAL_LABEL = new RegExp(
  ['\\btotal\\b', '\\bmontant\\b', '\\bsolde\\b', '\\bimporte\\b', '\\btotale?\\b', '合计'].join('|'),
  'i',
);

/**
 * The words that mean THIS NUMBER IS NOT WHAT YOU OWE.
 *
 * Order matters only in that these are checked before the positive labels:
 * "SUBTOTAL" contains "TOTAL", and "TOTAL DES TAXES" contains "TOTAL".
 */
const NOT_THE_TOTAL = new RegExp(
  [
    'sub[\\s-]*total', 'sous[\\s-]*total', 'sub[\\s-]*totale',
    'total\\s*des\\s*taxes', 'total\\s*tax(es)?', 'total\\s*savings', 'total\\s*discount',
    '\\b(gst|hst|pst|qst|tps|tvq|tvh|vat|iva|tax|taxes|impuesto)\\b',
    '\\b(tip|gratuity|pourboire|propina)\\b',
    '\\b(change|monnaie|cambio)\\b',
    '\\b(cash|comptant|tendered|tender|especes|esp[eè]ces|efectivo)\\b',
    'previous\\s*balance', 'solde\\s*pr[eé]c[eé]dent', 'ancien\\s*solde', 'balance\\s*forward',
    'payment\\s*received', 'paiement\\s*re[cç]u', 'pago\\s*recibido', '\\bpayments?\\b',
    '\\b(credit|cr[eé]dit|adjustment|rajustement|refund|remboursement)\\b',
    '\\b(discount|rabais|descuento|savings)\\b',
    'unit\\s*price', 'prix\\s*unitaire', '\\b(qty|quantity|quantit[eé])\\b',
    '\\b(deposit|d[eé]p[oô]t)\\b',
    '\\b(points|loyalty|reward|carte)\\b',
    'account\\s*(number|no|#)', 'customer\\s*(number|no|#)', 'invoice\\s*(number|no|#)',
    '\\b(tel|phone|fax|t[eé]l[eé]phone)\\b',
    '\\bper\\s*(litre|liter|l|gal|kwh|kg)\\b', '\\b(litres?|liters?|kwh)\\b',
  ].join('|'),
  'i',
);

/** A row that is nothing but a money value — the right half of a split column. */
const BARE_AMOUNT = new RegExp('^[\\s$]*-?\\d[\\d,\\s]*[.,]\\d{2}\\s*$');

/**
 * Digits that belong to an identifier rather than to money.
 *
 * "Account 4021-1188-9930" and "Tel 450-555-0142" both contain things that a
 * money pattern is happy to read as 55.01 or 88.99.
 */
function looksLikeIdentifier(row: string): boolean {
  if (new RegExp('\\b\\d[\\d\\s-]{9,}\\b').test(row)) return true;      // long digit run
  if (new RegExp('\\b\\d{3}[-.\\s]\\d{3}[-.\\s]\\d{4}\\b').test(row)) return true; // phone
  return false;
}

/** Is this a money label sitting on a row with no money on it? */
function isLabelOnlyRow(row: string): boolean {
  if (MONEY.test(row)) { MONEY.lastIndex = 0; return false; }
  MONEY.lastIndex = 0;
  return FINAL_LABEL.test(row) || TOTAL_LABEL.test(row) || NOT_THE_TOTAL.test(row);
}

/**
 * PUT THE TWO COLUMNS BACK TOGETHER.
 *
 * When the geometry pass cannot rebuild rows, OCR hands over every label and
 * then every amount:
 *
 *     Subtotal          Subtotal   59.00
 *     GST        -->    GST         2.95
 *     Total             Total      61.95
 *     59.00
 *     2.95
 *     61.95
 *
 * Pairing "the next amount after a label" is wrong — it marries the LAST label
 * to the FIRST amount, which is precisely how a printed Total came back as the
 * subtotal on a real phone. A run of N labels followed by exactly N bare
 * amounts is zipped position by position, or left alone.
 */
export function pairSplitColumns(rows: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j < rows.length && isLabelOnlyRow(rows[j])) j++;
    const runLength = j - i;

    if (runLength >= 2) {
      let matched = 0;
      while (
        j + matched < rows.length &&
        matched < runLength &&
        BARE_AMOUNT.test(rows[j + matched].trim())
      ) matched++;

      if (matched === runLength) {
        for (let k = 0; k < runLength; k++) out.push(rows[i + k].trim() + '   ' + rows[j + k].trim());
        i = j + runLength;
        continue;
      }
    }
    out.push(rows[i]);
    i++;
  }
  return out;
}

export interface AmountChoice {
  value?: number;
  confidence: Confidence;
  /** Plain reason, for tests and for anyone debugging a surprise. */
  why: string;
}

interface Cand { value: number; score: number; why: string }

/**
 * Choose the figure the person owes or paid.
 *
 * Never "the largest number" and never "the last number": a bill that reads
 * previous balance 1500 / payment -1000 / new amount due 500 must answer 500,
 * and a dinner receipt whose last line is the cash tendered must not answer
 * with the cash.
 */
export function chooseAmount(input: string[]): AmountChoice {
  const rows = pairSplitColumns(input);
  const cands: Cand[] = [];
  const n = Math.max(1, rows.length);

  rows.forEach((row, i) => {
    if (looksLikeIdentifier(row)) return;

    const matches = row.match(MONEY);
    const negative = NOT_THE_TOTAL.test(row);
    const isFinal = !negative && FINAL_LABEL.test(row);
    const isTotal = !negative && !isFinal && TOTAL_LABEL.test(row);

    if (matches) {
      for (const raw of matches) {
        const value = toNumber(raw);
        // A credit is a real number on the page but never the thing owed.
        if (!Number.isFinite(value) || value <= 0) continue;
        let score = 0;
        let why = 'unlabelled';
        if (isFinal) { score += 120; why = 'final label on the same row'; }
        else if (isTotal) { score += 70; why = 'total on the same row'; }
        if (negative) { score -= 160; why = 'row says this is not the total'; }
        score += (i / n) * 6;                    // a mild nod to later rows
        cands.push({ value, score, why });
      }
      return;
    }

    // A LABEL WITH NO NUMBER ON ITS ROW.
    //
    // This is the split-column case that made a printed TOTAL lose to a
    // subtotal on a real phone: OCR put every label in one block and every
    // amount in another, so nothing was ever "labelled" and the choice fell
    // back to position. Look ahead a couple of rows for a bare amount and
    // pair them, scoring the pair slightly below a same-row hit.
    if (!isFinal && !isTotal) return;
    for (let j = i + 1; j <= Math.min(i + 2, rows.length - 1); j++) {
      const ahead = rows[j];
      if (!BARE_AMOUNT.test(ahead.trim())) continue;
      const value = toNumber(ahead);
      if (!Number.isFinite(value) || value <= 0) break;
      cands.push({
        value,
        score: (isFinal ? 105 : 55) + (i / n) * 6,
        why: isFinal ? 'final label, amount on the next row' : 'total label, amount on the next row',
      });
      break;
    }
  });

  if (!cands.length) return { confidence: 'none', why: 'no money found' };

  // Highest score wins. Among equals prefer the LAST one seen, because a
  // document that prints the same label twice is restating its conclusion.
  let best = cands[0];
  for (const c of cands) if (c.score >= best.score) best = c;

  // Confidence is earned by a label, not by being the biggest number present.
  if (best.score >= 55) return { value: best.value, confidence: 'high', why: best.why };
  if (best.score >= 0) return { value: best.value, confidence: 'low', why: 'no label; best guess' };

  // Everything on the page was explicitly not-the-total. Offer the largest as
  // a starting point, clearly marked as unread rather than presented as read.
  const largest = cands.reduce((m, c) => (c.value > m.value ? c : m), cands[0]);
  return { value: largest.value, confidence: 'low', why: 'every candidate was excluded' };
}

// ─────────────────────────────────────────────────────────────────────────────
// WHO ISSUED THIS
// ─────────────────────────────────────────────────────────────────────────────

const VOWELS = new RegExp('[aeiouyàâäéèêëïîôöùûüæœ]', 'i');

/**
 * Does this string read like something a human would print as a name?
 *
 * Returns 0 for machine output and 1 for a clean name. This exists because a
 * QR payload once outranked a visible company logo: the old rule asked only
 * whether a line was near the top and had a few letters in it, and
 * "ql=11tzk9dmupMga MJHN2kd93ndkw" satisfies both.
 */
export function namePlausibility(raw: string): number {
  const s = (raw || '').trim();
  if (s.length < 2 || s.length > 60) return 0;

  // Machine addresses are never the issuer's name.
  if (new RegExp('https?://|www\\.|\\.com\\b|\\.ca\\b|@', 'i').test(s)) return 0;
  if (s.includes('=') || s.includes('|') || s.includes('\\')) return 0;

  const letters = (s.match(new RegExp('[A-Za-zÀ-ÿ]', 'g')) || []).length;
  const digits = (s.match(new RegExp('[0-9]', 'g')) || []).length;
  const symbols = (s.match(new RegExp('[^A-Za-zÀ-ÿ0-9\\s&\'’.,()-]', 'g')) || []).length;
  // A&W and BP are real names. Two letters is the floor; the junk in the
  // reported case is rejected by the symbol, digit and braiding rules instead.
  if (letters < 2) return 0;
  if (symbols > 0) return 0;
  if (digits > letters * 0.5) return 0;

  let score = 1;

  // A word with no vowel at all is not a word. Company initialisms are short,
  // so only judge tokens long enough to need one.
  const words = s.split(new RegExp('[\\s.,()-]+')).filter(Boolean);
  for (const w of words) {
    if (w.length >= 5 && !VOWELS.test(w)) return 0;
  }

  // Letters and digits braided together is what an identifier looks like.
  const braided = words.filter(w =>
    w.length >= 6 &&
    new RegExp('[A-Za-z]').test(w) &&
    new RegExp('[0-9]').test(w),
  ).length;
  if (braided) return 0;

  if (digits > 0) score -= 0.3;
  const vowelRatio = (s.match(new RegExp('[aeiouAEIOU]', 'g')) || []).length / Math.max(1, letters);
  if (vowelRatio < 0.2) score -= 0.5;
  return Math.max(0, Math.min(1, score));
}

/** Rows that describe the reader, not the writer. */
const IS_THE_CUSTOMER = new RegExp(
  // A bill does not always punctuate: 'Customer Mary Tremblay' is as common as
  // 'Customer: Mary Tremblay', and only the second shape was being caught.
  ['^customer\\b', '^client\\b', 'customer\\s*(name|:)', 'bill\\s*to', 'sold\\s*to', 'ship\\s*to', 'account\\s*holder',
   'client\\s*:', 'nom\\s*du\\s*client', 'service\\s*address', 'delivered\\s*to'].join('|'),
  'i',
);

/** Rows that name the document rather than the company that sent it. */
const GENERIC_HEADING = new RegExp(
  ['^your\\s+', '^my\\s+', '\\b(bill|invoice|facture|statement|receipt|re[cç]u|account\\s*summary)\\b\\s*$',
   'tax\\s*invoice', 'electricity\\s*account', 'phone\\s*bill', 'utility\\s*bill',
   'monthly\\s*statement', 'billing\\s*statement', 'page\\s*\\d'].join('|'),
  'i',
);

/** Rows that are furniture: addresses, contact details, pleasantries. */
const NOT_A_NAME = new RegExp(
  [
    '\\b(tel|phone|fax|t[eé]l|www|http|email|courriel)\\b',
    '^[0-9\\s#*.,:/-]+$',
    '\\b(boul|blvd|rue|street|st|ave|avenue|chemin|road|rd|suite|app|unit|po\\s*box)\\b',
    '^(qc|on|bc|ab|mb|sk|ns|nb|quebec|ontario|canada|usa)$',
    '\\b(merci|thank\\s*you|thanks|bienvenue|welcome|gracias)\\b',
    '\\b(order|commande|table|server|serveur|cashier|caissier)\\b',
    '\\b(subtotal|total|amount|balance|due|date)\\b',
    '\\b(gst|hst|pst|qst|tps|tvq|vat)\\b',
    '\\b\\d{4}[-\\s]?\\d{4}\\b',
  ].join('|'),
  'i',
);

/** Corporate suffixes: strong evidence a line names a company. */
const COMPANY_SUFFIX = new RegExp(
  ['\\b(inc|inc\\.|ltd|ltd\\.|ltee|lt[eé]e|limited|corp|corp\\.|corporation|llc|llp|plc',
   'co\\.|company|pty|gmbh|s\\.?a\\.?|s\\.?l\\.?|bv|nv|ag|srl|enterprises|holdings|group)\\b'].join('|'),
  'i',
);

export interface MerchantChoice {
  name?: string;
  confidence: Confidence;
  why: string;
}

/**
 * Who issued this document.
 *
 * `known` lets the caller supply names it can already recognise (brands,
 * remembered vendors) WITHOUT this module owning a brand list: hardcoding
 * companies would pass the reported cases while teaching the parser nothing.
 */
export function chooseMerchant(
  rows: string[],
  known?: (row: string) => string | undefined,
): MerchantChoice {
  const cleaned = rows.map(r => r.trim().replace(new RegExp('\\s{2,}', 'g'), ' ')).filter(Boolean);
  if (!cleaned.length) return { confidence: 'none', why: 'nothing to read' };

  // 1. Something the caller already recognises, anywhere on the page.
  if (known) {
    for (const row of cleaned) {
      const hit = known(row);
      if (hit) return { name: hit, confidence: 'high', why: 'recognised name' };
    }
  }

  // 2. Score the header. The issuer puts its name at the top; everything else
  //    up there is address, document title or the customer.
  const header = cleaned.slice(0, 8);
  let best: { name: string; score: number; why: string } | null = null;

  header.forEach((line, i) => {
    const plaus = namePlausibility(line);
    if (plaus === 0) return;                          // machine output, never a name
    if (IS_THE_CUSTOMER.test(line)) return;           // that is the reader
    if (NOT_A_NAME.test(line)) return;                // furniture
    if (GENERIC_HEADING.test(line)) return;           // names the document

    let score = plaus * 10 - i * 1.5;
    let why = 'header line that reads like a name';

    if (COMPANY_SUFFIX.test(line)) { score += 6; why = 'company suffix'; }

    // Said twice on the same page — header and footer, or header and the
    // remittance slip — is the document confirming its own identity.
    const repeats = cleaned.filter(r => r.toLowerCase().includes(line.toLowerCase())).length;
    if (repeats > 1 && line.length >= 4) { score += 4; why = 'name repeated on the page'; }

    if (line === line.toUpperCase() && line.length <= 30) score += 1.5;
    if (line.length <= 28) score += 1;

    if (!best || score > best.score) best = { name: line.slice(0, 40), score, why };
  });

  if (!best) return { confidence: 'none', why: 'no plausible name in the header' };

  const chosen = best as { name: string; score: number; why: string };
  // Earned, not granted: only strong structural evidence reads as confident.
  const conf: Confidence = chosen.score >= 14 ? 'high' : 'low';
  return { name: chosen.name, confidence: conf, why: chosen.why };
}
