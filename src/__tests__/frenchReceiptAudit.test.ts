/**
 * D4 — the receipt/bill parser understands French-language documents.
 *
 * PeggyBank ships 5-language UI localization and already has Hydro-Québec
 * and QST in its own test fixtures, so a French bill is a realistic input,
 * not a contrived one. The diagnostic proved classify()'s billSignals/
 * receiptSignals regexes were English-only: a French document stayed
 * docType 'unknown' regardless of how clean the OCR text was, unless an
 * English loanword happened to appear.
 *
 * French terms were added directly to classify() in parse.ts (not
 * core/documentFields.ts, which answers a different question — which
 * number is the total, not what kind of document this is). These tests now
 * assert the FIXED behaviour: PARSER VERIFIED against realistic Québec
 * vocabulary, not REAL ANDROID OCR VERIFIED — no physical device testing
 * has been done, and none of these claims stand in for it.
 */
import { parseDocument } from '../lib/recognition/parse';

describe('French-language documents — PARSER VERIFIED (not device-tested)', () => {
  it('a French Hydro-Québec bill classifies as a bill', () => {
    const text = [
      'HYDRO-QUÉBEC',
      'Numéro de compte: 1234567890',
      "Date d'échéance: 28 juil. 2026",
      'Montant dû: 95,42 $',
      'Période de facturation: 2026-06-15 au 2026-07-14',
    ].join('\n');
    const r = parseDocument(text);
    expect(r.docType).toBe('bill');
  });

  it('extracts the due date from "Date d\'échéance", not just "due"', () => {
    const text = ["Date d'échéance: 28 juillet 2026", 'Montant dû: 95,42 $'].join('\n');
    const r = parseDocument(text);
    expect(r.dueDate).toBe('2026-07-28');
  });

  it('a French receipt using "TOTAL" classifies as an expense', () => {
    const text = ['MAXI', 'TPS 2,10 $', 'TVQ 4,20 $', 'TOTAL 48,40 $', 'COMPTANT 50,00 $'].join('\n');
    const r = parseDocument(text);
    expect(r.docType).toBe('expense');
  });

  it('a receipt using "MONTANT" instead of "TOTAL" — no English loanword at all — still classifies', () => {
    const text = ['MAXI', 'TPS 2,10 $', 'TVQ 4,20 $', 'MONTANT 48,40 $', 'COMPTANT 50,00 $'].join('\n');
    const r = parseDocument(text);
    // FIXED: was 'unknown'. Recognized now purely from French receipt
    // structure (TPS/TVQ/COMPTANT), no coincidental English word needed.
    expect(r.docType).toBe('expense');
  });

  it('a restaurant receipt with TPS/TVQ and sous-total vs total picks the total, not the subtotal', () => {
    const text = ['RESTAURANT ST-HUBERT', 'SOUS-TOTAL 42,10 $', 'TPS 2,11 $', 'TVQ 4,20 $', 'TOTAL 48,41 $'].join('\n');
    const r = parseDocument(text);
    expect(r.docType).toBe('expense');
    expect(r.amount).toBe(48.41); // not the 42.10 sous-total
  });

  it('a bill distinguishes "montant dû" (owed now) from "solde précédent" (previous balance)', () => {
    const text = [
      'BELL CANADA',
      'Solde précédent: 120,00 $',
      'Paiement reçu: -120,00 $',
      'Montant dû: 95,42 $',
    ].join('\n');
    const r = parseDocument(text);
    expect(r.docType).toBe('bill');
    expect(r.amount).toBe(95.42); // not the previous balance or the payment
  });

  it('a genuinely unreadable document still stays unknown — French support does not fabricate a type', () => {
    const r = parseDocument('asdkj 12903 xkcd');
    expect(r.docType).toBe('unknown');
  });
});
