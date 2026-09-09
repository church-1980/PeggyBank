/**
 * DIAGNOSTIC — does the receipt/bill parser understand French-language
 * documents? PeggyBank ships 5-language UI localization and its own test
 * fixtures reference Hydro-Québec and QST, so a French bill is a realistic
 * input, not a contrived one. Reproduction only; not a fix.
 */
import { parseDocument } from '../lib/recognition/parse';

describe('French-language documents (reproduction)', () => {
  it('REPRO: a French Hydro-Québec bill is not recognized as a bill', () => {
    const text = [
      'HYDRO-QUÉBEC',
      'Numéro de compte: 1234567890',
      "Date d'échéance: 28 juil. 2026",
      'Montant dû: 95,42 $',
      'Période de facturation: 2026-06-15 au 2026-07-14',
    ].join('\n');
    const r = parseDocument(text);
    // FINDING: docType stays 'unknown' — billSignals only matches English
    // phrases ("amount due", "due date", "account number", ...). A real
    // Québec electricity bill in French is not classified as a bill at all.
    expect(r.docType).toBe('unknown');
  });

  it('a French receipt using "TOTAL" still classifies — but only by English-word coincidence', () => {
    const text = ['MAXI', 'TPS 2,10 $', 'TVQ 4,20 $', 'TOTAL 48,40 $', 'COMPTANT 50,00 $'].join('\n');
    const r = parseDocument(text);
    expect(r.docType).toBe('expense'); // passes today, but only via the loanword "TOTAL"
  });

  it('REPRO: the same receipt with "MONTANT" instead of "TOTAL" is not recognized at all', () => {
    const text = ['MAXI', 'TPS 2,10 $', 'TVQ 4,20 $', 'MONTANT 48,40 $', 'COMPTANT 50,00 $'].join('\n');
    const r = parseDocument(text);
    // FINDING: with no English loanword present, receiptSignals matches
    // nothing. A receipt that is genuinely, entirely in French is not
    // recognized as a receipt at all, regardless of how clean the OCR text is.
    expect(r.docType).toBe('unknown');
  });
});
