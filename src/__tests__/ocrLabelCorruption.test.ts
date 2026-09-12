/**
 * Section 11 — OCR mangles printed labels in specific, recurring ways: an O
 * misread as 0, an L misread as 1. "T0TAL" and "TOTA1" are the SAME word an
 * engine otherwise read correctly, not a different one. Before this fix
 * neither matched the total-label regexes at all, so a clearly-labelled
 * total quietly degraded to 'low' confidence "best guess" — and in a
 * document with a correctly-read Subtotal nearby, could lose to it.
 *
 * The fix must be narrow: it should recognise corrupted TOTAL/MONTANT
 * labels without becoming so permissive that a corrupted SUBTOTAL, tax
 * line, phone number or account number starts being misread as a total.
 */
import { chooseAmount } from '../core/documentFields';

const amount = (rows: string[]) => chooseAmount(rows);

describe('A corrupted TOTAL label is still recognised as a total', () => {
  it('T0TAL (zero for O) reads as high confidence', () => {
    const r = amount(['Subtotal   59.00', 'GST   2.95', 'T0TAL   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('TOTA1 (one for L) reads as high confidence', () => {
    const r = amount(['Subtotal   59.00', 'GST   2.95', 'TOTA1   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('both confusions at once (T0TA1) still reads as high confidence', () => {
    const r = amount(['Subtotal   59.00', 'T0TA1   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('a corrupted total still beats a correctly-read subtotal in split columns', () => {
    const r = amount(['Subtotal', 'GST', 'T0TAL', '59.00', '2.95', '61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('a corrupted French total (M0NTANT) is recognised', () => {
    const r = amount(['Sous-total   59.00', 'TPS   2.95', 'M0NTANT   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('a corrupted "amount due" (Am0unt Due) still earns final-label confidence', () => {
    const r = amount(['Am0unt Due', '$582.25', 'Due date Sep 12, 2026']);
    expect(r.value).toBe(582.25);
    expect(r.confidence).toBe('high');
  });
});

describe('Corruption does not make a non-total look like a total', () => {
  it('a corrupted SUBTOTAL (SUBT0TAL) is still excluded, not promoted', () => {
    const r = amount(['SUBT0TAL   59.00', 'GST   2.95', 'Total   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('a corrupted SOUS-TOTAL is still excluded', () => {
    const r = amount(['S0US-TOTAL   59.00', 'TPS   2.95', 'Montant   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('a tax line is never promoted by the same folding (TAXES already all-caps digits-free)', () => {
    const r = amount(['Total   61.95', 'TAXES   2.95']);
    expect(r.value).toBe(61.95);
  });

  it('a phone number is never reclassified as a label by the digit fold', () => {
    // Phone numbers are pure digit runs (no letters in the token), so
    // deOcrLabel must never touch them — proven by looksLikeIdentifier still
    // excluding this row's "money-shaped" digits entirely.
    const r = amount(['Tel 450-555-0142', 'Total   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });

  it('an account number containing letters is not accidentally folded into a label', () => {
    const r = amount(['Account A0B1C2345', 'Total   61.95']);
    expect(r.value).toBe(61.95);
    expect(r.confidence).toBe('high');
  });
});
