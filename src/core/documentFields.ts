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
 * SMART-CAPTURE-HYDRO-01 — A LABEL IS NOT JUST "MATCH" OR "NO MATCH".
 *
 * A real Hydro-Québec bill carries three legitimately-labelled amounts:
 *
 *   Montant dû immédiatement / Amount due immediately ........ $263.71
 *   Montant de la présente facture / Amount of this bill ...... $251.28
 *   Montant total dû / Total amount due ........................ $514.99
 *
 * All three used to match the same flat "final label" class, so the choice
 * fell back to page position — and a warning line or a detachable payment
 * stub prints BELOW the summary box, so the qualified, partial figure won,
 * confidently, every time. The bug was never "missing French words": the
 * French (and English) words for "due now" and "due immediately" were
 * already present, just not ranked BELOW the words for "the total".
 *
 * THE FIX IS A HIERARCHY, NOT A BIGGER LIST.
 *
 *   TRUE_TOTAL_LABEL   the grand/total/balance figure itself: "total
 *                       amount due", "montant total dû", "solde dû",
 *                       "grand total", "amount paid" -- outranks everything.
 *   PARTIAL_DUE_QUALIFIER
 *                       a word that turns an otherwise-strong label into a
 *                       COMPONENT of the total, never the total itself:
 *                       "immediately" / "immédiatement", "this bill" /
 *                       "présente facture", "current charges", "new
 *                       charges", "overdue", "past due". A row matching a
 *                       due-phrase AND one of these qualifiers is real
 *                       money, correctly labelled -- just not the field
 *                       PeggyBank is trying to fill.
 *   TOTAL_LABEL         a bare "total" / "montant" / "solde" with no
 *                       stronger phrase around it -- weak, generic evidence,
 *                       used only when nothing stronger is on the page.
 *
 * This generalises past Hydro-Québec: a phone bill's "previous balance +
 * current charges + total due", a credit card's "minimum payment +
 * statement balance + total balance", and an insurance bill's "installment
 * amount + overdue balance + total due" all have the same shape -- one
 * TRUE total surrounded by legitimately-labelled, legitimately-scored, but
 * subordinate figures.
 *
 * Deliberately not an English-only list: the app ships French, Spanish,
 * Portuguese and Chinese.
 */
const TRUE_TOTAL_LABEL = new RegExp(
  [
    'grand\\s*total', 'total\\s*amount\\s*due', 'current\\s*amount\\s*due',
    'amount\\s*due', 'amount\\s*owing', 'amount\\s*payable', 'balance\\s*due',
    'payment\\s*due', 'total\\s*due', 'total\\s*payable', 'net\\s*total',
    'total\\s*bill', 'new\\s*amount\\s*due', 'please\\s*pay', 'you\\s*owe',
    'total\\s*owing', 'amount\\s*paid', 'paid\\s*amount',
    // A card/statement figure: distinct from a bill's "amount due", but
    // still the one number that answers "what is the total?" for that
    // document -- never in the same row as "minimum payment".
    'statement\\s*balance', 'current\\s*balance', 'total\\s*balance', 'total\\s*account\\s*balance',
    // French
    'montant\\s*d[uû]', 'solde\\s*[aà]\\s*payer', 'total\\s*[aà]\\s*payer',
    'montant\\s*exigible', 'montant\\s*total', 'net\\s*[aà]\\s*payer', 'solde\\s*d[uû]',
    // Spanish / Portuguese
    'importe\\s*total', 'total\\s*a\\s*pagar', 'valor\\s*total',
    'saldo\\s*a\\s*pagar', 'importe\\s*a\\s*pagar',
    // Chinese
    '应付金额', '应缴金额', '合计金额', '总计',
  ].join('|'),
  'i',
);

/**
 * A word that means "this labelled figure is a PIECE of what is owed, not
 * the whole of it" -- present alongside a due-phrase, it demotes an
 * otherwise top-tier label to PARTIAL_DUE. Present alongside only a bare
 * "total"/"montant" (no due-phrase at all), it is what turns that bare word
 * into a recognisable partial-amount phrase on its own, e.g. "amount of
 * this bill" / "montant de la présente facture" / "new charges".
 */
const PARTIAL_DUE_QUALIFIER = new RegExp(
  [
    'immediat(?:e|ely)?', 'imm[ée]diatement',
    '\\bnow\\b', '\\btoday\\b', 'overdue', 'past\\s*due',
    'this\\s*bill', 'current\\s*bill', 'de\\s*la\\s*pr[ée]sente\\s*facture', 'pr[ée]sente\\s*facture',
    'new\\s*charges', 'current\\s*charges', 'this\\s*statement',
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
    // A card's minimum payment is a real, legitimately-labelled amount --
    // and never the total. Exists on the same statement as the figure this
    // engine should actually choose, so it must be excluded, not merely
    // outranked (Section 9/12/13 — statement/card decoys).
    'minimum\\s*payment', 'paiement\\s*minimum',
  ].join('|'),
  'i',
);

/**
 * A row that is nothing but a money value — the right half of a split column.
 *
 * The $ can lead ("$514.99") or trail ("514,99 $") — Québec French puts the
 * symbol after the number, the convention this Hydro-Québec bill's own
 * amount column uses. Only the leading form was recognised, so a
 * split-column French bill degraded every amount to an unlabelled,
 * position-only guess: the label run could never be confirmed to have
 * exactly as many amounts as labels, because BARE_AMOUNT said none of them
 * were amounts at all.
 */
const BARE_AMOUNT = new RegExp('^[\\s$]*-?\\d[\\d,\\s]*[.,]\\d{2}\\s*\\$?\\s*$');

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

/**
 * FOLD THE OCR CONFUSIONS THAT ACTUALLY HAPPEN ON PRINTED RECEIPTS.
 *
 * "T0TAL" and "TOTA1" are the same OCR engine misreading O as 0 and L as 1
 * inside a word it otherwise read correctly — a font artifact, not a
 * different word. Only ever applied to label MATCHING, and only within a
 * token that already contains a letter, so a bare amount like "61.95" is
 * never at risk: nothing here can turn a real number into a fake label,
 * only recognise a label OCR has quietly vandalised. "SUBT0TAL" still
 * folds to something containing "total", so it is still caught by
 * NOT_THE_TOTAL first — corruption does not make a subtotal look safer.
 */
function deOcrLabel(row: string): string {
  return row.replace(/[A-Za-z0-9]+/g, (word) =>
    /[A-Za-z]/.test(word) ? word.replace(/0/g, 'o').replace(/1/g, 'l') : word
  );
}

export type AmountRole = 'negative' | 'trueTotal' | 'partialDue' | 'weakTotal' | 'unlabelled';

/**
 * Classify what a row's LABEL claims about any money on it — independent of
 * whether money is actually present, so both isLabelOnlyRow (no money yet)
 * and chooseAmount (money in hand) read the exact same hierarchy. See the
 * SMART-CAPTURE-HYDRO-01 comment above TRUE_TOTAL_LABEL for what each role
 * means and why the qualifier check exists.
 */
function classifyLabel(row: string): AmountRole {
  const label = deOcrLabel(row);
  if (NOT_THE_TOTAL.test(label)) return 'negative';

  const strongPhrase = TRUE_TOTAL_LABEL.test(label);
  const qualified = PARTIAL_DUE_QUALIFIER.test(label);
  const weakWord = TOTAL_LABEL.test(label);
  // A qualifier alone ("this bill" / "immediately") only means something
  // MONEY-shaped beside it. "amount"/"due"/"bill"/"facture"/"charges" have
  // no home in TOTAL_LABEL's bare-word tier (adding them there would make
  // any row merely mentioning "amount" count as weak total evidence) but
  // are exactly what "Amount of this bill" is built from — the English
  // twin of "Montant de la présente facture", which already qualifies via
  // TOTAL_LABEL's bare "montant". Without this, the English phrase had no
  // positive match at all and silently fell to 'unlabelled'.
  const moneyContext = qualified && /\bamount\b|\bdue\b|\bd[uû]\b|\bbalance\b|\bfacture\b|\bbill\b|\bcharges?\b/i.test(label);

  if (strongPhrase && !qualified) return 'trueTotal';
  if (qualified && (strongPhrase || weakWord || moneyContext)) return 'partialDue';
  if (weakWord) return 'weakTotal';
  return 'unlabelled';
}

/** Is this a money label sitting on a row with no money on it? */
function isLabelOnlyRow(row: string): boolean {
  if (MONEY.test(row)) { MONEY.lastIndex = 0; return false; }
  MONEY.lastIndex = 0;
  return classifyLabel(row) !== 'unlabelled';
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
 *
 * EXACTLY N, NOT "AT LEAST N". A run of 3 labels followed by 4 bare amounts
 * (a stray meter reading or a stub total ahead of the real column) used to
 * take the first 3 amounts and call it done — marrying "Montant total dû" to
 * a decoy and leaving the real total as a bare, unlabelled row. If the
 * amount run does not end exactly where the label run's count says it
 * should, the correspondence is not established: decline to zip rather
 * than guess which N of the amounts belong to these labels.
 *
 * A DECLINED RUN MUST NOT LEAK INTO THE PER-LABEL LOOKAHEAD EITHER.
 * chooseAmount() also has its own fallback for a lone label immediately
 * followed by a bare amount 1-2 rows down — needed for the ordinary "Amount
 * due \n $582.25" case, where there was never a run to zip. But if a whole
 * run of labels just failed to pair here, letting each of ITS labels reach
 * for "whichever bare amount happens to be within 2 rows" is the exact same
 * mistake in a smaller box: on the Hydro bill this is precisely how "Montant
 * total dû" reached past its own column into a stray earlier number. Every
 * label in a run that could not be cleanly zipped is returned in
 * `ambiguous`, so chooseAmount can decline the per-label guess for them too.
 */
export interface SplitColumnResult {
  rows: string[];
  /** Indices into `rows` whose label was part of a run this function could
   * not confidently pair with amounts — a per-label guess for these would
   * be exactly the "one stray number decides everything" mistake above. */
  ambiguous: Set<number>;
}

export function pairSplitColumns(rows: string[]): SplitColumnResult {
  const out: string[] = [];
  const ambiguous = new Set<number>();
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

      const nextIsAlsoAnAmount =
        j + matched < rows.length && BARE_AMOUNT.test(rows[j + matched].trim());

      if (matched === runLength && !nextIsAlsoAnAmount) {
        for (let k = 0; k < runLength; k++) out.push(rows[i + k].trim() + '   ' + rows[j + k].trim());
        i = j + runLength;
        continue;
      }

      // The whole run failed to pair — push every label in it unchanged,
      // but mark all of them, not just leave the last one looking like an
      // ordinary lone label with amounts nearby.
      for (let k = 0; k < runLength; k++) { ambiguous.add(out.length); out.push(rows[i + k]); }
      i = j;
      continue;
    }
    out.push(rows[i]);
    i++;
  }
  return { rows: out, ambiguous };
}

export interface AmountChoice {
  value?: number;
  confidence: Confidence;
  /** Plain reason, for tests and for anyone debugging a surprise. */
  why: string;
}

interface Cand { value: number; score: number; why: string; role: AmountRole }

/**
 * Every money candidate on the page, with the evidence behind each one.
 *
 * Not used by the app itself — chooseAmount() below only needs the winner.
 * This exists so a real-phone failure can be diagnosed from its OCR text
 * alone: which candidates existed, what role each one's label earned, and
 * why one outscored the rest. See ocrCandidateDiagnostics.test.ts.
 */
function amountCandidates(input: string[]): Cand[] {
  const { rows, ambiguous } = pairSplitColumns(input);
  const cands: Cand[] = [];
  const n = Math.max(1, rows.length);

  rows.forEach((row, i) => {
    if (looksLikeIdentifier(row)) return;

    const matches = row.match(MONEY);
    const role = classifyLabel(row);

    if (matches) {
      for (const raw of matches) {
        const value = toNumber(raw);
        // A credit is a real number on the page but never the thing owed.
        if (!Number.isFinite(value) || value <= 0) continue;
        let score = 0;
        let why = 'unlabelled';
        switch (role) {
          case 'trueTotal': score += 150; why = 'total label on the same row'; break;
          case 'partialDue': score += 90; why = 'a real but partial/component amount on the same row'; break;
          case 'weakTotal': score += 70; why = 'generic total word on the same row'; break;
          case 'negative': score -= 160; why = 'row says this is not the total'; break;
        }
        score += (i / n) * 6;                    // a mild nod to later rows
        cands.push({ value, score, why, role });
      }
      return;
    }

    // A LABEL WITH NO NUMBER ON ITS ROW.
    //
    // This is the split-column case that made a printed TOTAL lose to a
    // subtotal on a real phone: OCR put every label in one block and every
    // amount in another, so nothing was ever "labelled" and the choice fell
    // back to position. Look ahead a couple of rows for a bare amount and
    // pair them, scoring the pair slightly below a same-row hit, at the
    // same tier gap the same-row scores above use.
    //
    // Never for a label pairSplitColumns already tried and failed to zip:
    // guessing "whichever bare amount is within 2 rows" for it is the same
    // mistake in miniature (see the comment on `ambiguous` above).
    if (ambiguous.has(i)) return;
    if (role !== 'trueTotal' && role !== 'partialDue' && role !== 'weakTotal') return;
    for (let j = i + 1; j <= Math.min(i + 2, rows.length - 1); j++) {
      const ahead = rows[j];
      if (!BARE_AMOUNT.test(ahead.trim())) continue;
      const value = toNumber(ahead);
      if (!Number.isFinite(value) || value <= 0) break;
      const base = role === 'trueTotal' ? 135 : role === 'partialDue' ? 75 : 55;
      cands.push({
        value,
        score: base + (i / n) * 6,
        why: role === 'trueTotal'
          ? 'total label, amount on the next row'
          : role === 'partialDue'
            ? 'a real but partial/component label, amount on the next row'
            : 'generic total word, amount on the next row',
        role,
      });
      break;
    }
  });

  return cands;
}

/**
 * Choose the figure the person owes or paid.
 *
 * Never "the largest number" and never "the last number": a bill that reads
 * previous balance 1500 / payment -1000 / new amount due 500 must answer 500,
 * and a dinner receipt whose last line is the cash tendered must not answer
 * with the cash.
 */
export function chooseAmount(input: string[]): AmountChoice {
  const cands = amountCandidates(input);
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

export interface AmountCandidateDebug {
  value: number;
  /** TOTAL_AMOUNT_DUE-style name, for a debug log or a failing-fixture readout. */
  role: 'TOTAL_AMOUNT_DUE' | 'PARTIAL_OR_COMPONENT_AMOUNT' | 'WEAK_GENERIC_TOTAL' | 'EXCLUDED' | 'UNLABELLED';
  score: number;
  why: string;
}

const ROLE_NAME: Record<AmountRole, AmountCandidateDebug['role']> = {
  trueTotal: 'TOTAL_AMOUNT_DUE',
  partialDue: 'PARTIAL_OR_COMPONENT_AMOUNT',
  weakTotal: 'WEAK_GENERIC_TOTAL',
  negative: 'EXCLUDED',
  unlabelled: 'UNLABELLED',
};

/**
 * DEV/TEST DIAGNOSTIC ONLY — never called from production UI or console.
 *
 * Every candidate chooseAmount() considered, ranked highest first, with the
 * role and score behind each one. Exists so a real-phone failure like
 * SMART-CAPTURE-HYDRO-01 can be debugged from its raw OCR text alone: which
 * amounts were seen, what each one's label was read as, and why the winner
 * won — without exposing any of this to a real user.
 */
export function debugAmountCandidates(input: string[]): AmountCandidateDebug[] {
  return amountCandidates(input)
    .map(c => ({ value: c.value, role: ROLE_NAME[c.role], score: Math.round(c.score * 100) / 100, why: c.why }))
    .sort((a, b) => b.score - a.score);
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
