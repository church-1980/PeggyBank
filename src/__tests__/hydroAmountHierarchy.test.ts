/**
 * SMART-CAPTURE-HYDRO-01 — a real Hydro-Québec bill's amount could not be
 * read correctly. All three amounts on the bill were legitimately labelled
 * — this was never a missing-vocabulary problem. It was a missing
 * HIERARCHY problem: "montant total dû", "montant dû immédiatement" and
 * "montant de la présente facture" all matched the same flat "final label"
 * class, so the choice fell back to page position, and the qualified,
 * partial figure printed lowest on the page won with full confidence.
 *
 * ROOT CAUSE (see documentFields.ts's SMART-CAPTURE-HYDRO-01 comment):
 *   1. FINAL_LABEL had no internal ranking — a total and a "due now"
 *      subset scored identically.
 *   2. The last equal-scoring candidate won, and OCR reads a lower-printed
 *      qualifier line last.
 *   3. pairSplitColumns accepted a PARTIAL N-of-M zip when a split column
 *      had more amounts than labels, marrying the real total's label to a
 *      decoy amount.
 *
 * These tests are PURE PARSER VERIFIED and OCR-FIXTURE VERIFIED: real
 * SQLite is not involved, and no physical Android device ran the camera
 * for any of them. See Section 16's final report for what that does and
 * does not prove.
 */
import { chooseAmount, debugAmountCandidates } from '../core/documentFields';
import { parseDocument } from '../lib/recognition/parse';
import * as Hydro from './fixtures/hydroQuebecBill';

describe('The real Hydro-Québec bill — every OCR shape resolves to $514.99', () => {
  it('A. clean, logically-ordered OCR', () => {
    const r = parseDocument(Hydro.HYDRO_A_CLEAN);
    expect(r.amount).toBe(514.99);
    expect(r.confidence.amount).toBe('high');
    expect(r.docType).toBe('bill');
    expect(r.merchant).toBe('Hydro-Québec');
    expect(r.date).toBe('2026-09-03');
    expect(r.dueDate).toBe('2026-09-24');
  });

  it('B. split columns — every label first, then every amount', () => {
    const r = parseDocument(Hydro.HYDRO_B_SPLIT_COLUMNS);
    expect(r.amount).toBe(514.99);
    expect(r.confidence.amount).toBe('high');
  });

  it('C. noisy OCR — corrupted characters, doubled spaces, a garbled merchant name', () => {
    const r = parseDocument(Hydro.HYDRO_C_NOISY);
    expect(r.amount).toBe(514.99);
    expect(r.docType).toBe('bill');
    // The amount hierarchy survives corruption this heavy even though the
    // merchant name (a different field, a different mechanism) does not —
    // that is an honest limitation of name plausibility scoring on a badly
    // OCR'd brand string, not a claim this fix does not make.
  });

  it('D. French and English printed as separate physical blocks, not one bilingual line', () => {
    const r = parseDocument(Hydro.HYDRO_D_LANGUAGE_BLOCKS);
    expect(r.amount).toBe(514.99);
    expect(r.confidence.amount).toBe('high');
  });

  it('E. accents dropped entirely', () => {
    const r = parseDocument(Hydro.HYDRO_E_NO_ACCENTS);
    expect(r.amount).toBe(514.99);
    expect(r.confidence.amount).toBe('high');
  });

  it('F. O/0 and L/1 label corruption layered on this exact bill', () => {
    const r = parseDocument(Hydro.HYDRO_F_LABEL_CORRUPTION);
    expect(r.amount).toBe(514.99);
    expect(r.confidence.amount).toBe('high');
  });

  it('G. the actual photographed bill, transcribed line-for-line — not an invented approximation', () => {
    const r = parseDocument(Hydro.HYDRO_G_REAL_PHOTOGRAPHED_BILL);
    expect(r.amount).toBe(514.99);
    expect(r.confidence.amount).toBe('high');
    expect(r.docType).toBe('bill');
    expect(r.merchant).toBe('Hydro-Québec');
    expect(r.date).toBe('2026-09-03');
    expect(r.dueDate).toBe('2026-09-24');

    // Not a coin-flip: the true total must clearly outscore the stub's
    // own "due by" line for the SAME $251.28 figure, not merely win by
    // whichever row happened to print first.
    const cands = debugAmountCandidates(Hydro.HYDRO_G_REAL_PHOTOGRAPHED_BILL.split('\n'));
    const winner = cands[0];
    const runnerUp = cands.find(c => c !== winner)!;
    expect(winner.value).toBe(514.99);
    expect(winner.score - runnerUp.score).toBeGreaterThan(30);
  });
});

describe('Two more root causes, found only by testing the real photographed bill', () => {
  it('a due DATE sharing a line with the real amount no longer reads as one long identifier', () => {
    // "...Sep. 24, 2026   251,28 $" used to be swallowed whole: the date's
    // digits plus the column whitespace before the amount looked exactly
    // like a 10+-digit account number to looksLikeIdentifier(), so the
    // entire row — amount included — was discarded before it ever reached
    // scoring. debugAmountCandidates() returning nothing for a row this
    // simple was the actual symptom (a bare "no money found").
    const row = 'Amount due by Sep. 24, 2026   251,28 $';
    const r = chooseAmount([row]);
    expect(r.value).toBe(251.28);
    expect(r.confidence).not.toBe('none');
  });

  it('"amount due BY [a date]" is a partial/component amount, not the total', () => {
    // The real payment stub names the $251.28 figure "Montant dû au plus
    // tard le 24 sept. 2026 / Amount due by Sep. 24, 2026" — not "amount
    // of this bill". "Amount due" alone is top-tier; without a qualifier
    // for "due by [date]" specifically, this line scored a near-tie with
    // the true total, decided only by which row happened to print first.
    const r = chooseAmount([
      'Montant total dû / Total amount due                            514,99 $',
      'Montant dû au plus tard le 24 sept. 2026 / Amount due by Sep. 24, 2026   251,28 $',
    ]);
    expect(r.value).toBe(514.99);
    // And the same when the stub's own line happens to print FIRST —
    // proving this is not merely inheriting the row-order tie-break.
    const reordered = chooseAmount([
      'Montant dû au plus tard le 24 sept. 2026 / Amount due by Sep. 24, 2026   251,28 $',
      'Montant total dû / Total amount due                            514,99 $',
    ]);
    expect(reordered.value).toBe(514.99);
  });
});

describe('The two named root causes, falsified directly', () => {
  it('a due-immediately label printed BELOW the total no longer wins on position', () => {
    // This is the literal failure mode: the qualified, partial figure sits
    // lower on the page than the true total.
    const r = chooseAmount([
      'Montant de la présente facture / Amount of this bill      251,28 $',
      'Montant total dû / Total amount due                       514,99 $',
      'Montant dû immédiatement / Amount due immediately          263,71 $',
    ]);
    expect(r.value).toBe(514.99);
    expect(r.confidence).toBe('high');
  });

  it('a split column with ONE MORE amount than labels no longer marries the wrong pair', () => {
    // pairSplitColumns used to accept "first N of M" and marry the total's
    // own label to a decoy — and used to let the label's own 1-2 row
    // lookahead reach past the failed run into the same decoy. Both are
    // closed: this declines to guess confidently, but still lands on the
    // correct value via the safer positional fallback.
    const r = chooseAmount([
      'Montant dû immédiatement', 'Montant de la présente facture', 'Montant total dû',
      '1 234,00 $', '263,71 $', '251,28 $', '514,99 $',
    ]);
    expect(r.value).toBe(514.99);
  });
});

describe('Bilingual labels for the SAME concept score the same, in either language', () => {
  it('the French-only and English-only forms of each role score identically', () => {
    const total = (label: string) => chooseAmount([`${label}   514,99 $`]);
    const frTotal = total('Montant total dû');
    const enTotal = total('Total amount due');
    expect(frTotal.confidence).toBe(enTotal.confidence);

    const partial = (label: string) => chooseAmount([`${label}   251,28 $`]);
    const frPartial = partial('Montant de la présente facture');
    const enPartial = partial('Amount of this bill');
    // Both are the SAME role (a real but partial/component amount) —
    // before this fix, the English form was a top-tier FINAL_LABEL hit
    // while the French form was only ever the generic weak-total tier, so
    // a bilingual pair could resolve to whichever LANGUAGE happened to be
    // read, not whichever amount was actually the total.
    expect(frPartial.why).toBe(enPartial.why);
  });

  it('a bilingual pair for the total does not lose to a bilingual pair for a partial amount', () => {
    const r = chooseAmount([
      'Montant total dû / Total amount due                       514,99 $',
      'Montant de la présente facture / Amount of this bill      251,28 $',
    ]);
    expect(r.value).toBe(514.99);
    expect(r.confidence).toBe('high');
  });
});

describe('Structural analogues — the same shape, different documents (Section 12)', () => {
  it('UTILITY BILL: current charges + immediate balance + total due', () => {
    const r = chooseAmount([
      'Current charges                       88.40',
      'Amount due immediately                45.00',
      'Total amount due                      133.40',
    ]);
    expect(r.value).toBe(133.40);
    expect(r.confidence).toBe('high');
  });

  it('PHONE BILL: previous balance + current charges + total due', () => {
    const r = chooseAmount([
      'Previous balance                      60.00',
      'Current charges                       75.20',
      'Total amount due                     135.20',
    ]);
    expect(r.value).toBe(135.20);
    expect(r.confidence).toBe('high');
  });

  it('CREDIT CARD: statement balance + minimum payment + total account balance', () => {
    const r = chooseAmount([
      'Minimum payment                       35.00',
      'Statement balance                    842.17',
    ]);
    // Minimum payment is excluded outright — never the field PeggyBank means
    // by "what do I owe", regardless of how the rest of the statement reads.
    expect(r.value).toBe(842.17);
    expect(r.confidence).toBe('high');
  });

  it('INSURANCE BILL: installment amount + overdue balance + total due', () => {
    const r = chooseAmount([
      'Overdue balance                       50.00',
      'Installment amount due immediately    80.00',
      'Total amount due                     130.00',
    ]);
    expect(r.value).toBe(130.00);
    expect(r.confidence).toBe('high');
  });

  it('RESTAURANT RECEIPT: subtotal + taxes + tip + total (unaffected by the bill hierarchy)', () => {
    const r = chooseAmount([
      'Subtotal      50.00',
      'Tax            2.50',
      'Tip            8.00',
      'Total         60.50',
    ]);
    expect(r.value).toBe(60.50);
    expect(r.confidence).toBe('high');
  });
});

describe('Section 14 — forcing semantic ranking to be necessary', () => {
  const rows = [
    'Montant de la présente facture / Amount of this bill      251,28 $',
    'Montant dû immédiatement / Amount due immediately          263,71 $',
    'Montant total dû / Total amount due                       514,99 $',
  ];

  it('is not solved by "first money value wins"', () => {
    const firstValueWins = parseFloat(rows[0].match(/[\d,]+\.\d{2}|\d+,\d{2}/)![0].replace(',', '.'));
    expect(firstValueWins).not.toBe(514.99);
    expect(chooseAmount(rows).value).toBe(514.99);
  });

  it('is not solved by "largest money value wins" (Section 6 — must not become the rule)', () => {
    // On THIS bill largest happens to also be correct, so prove the engine
    // is not secretly doing that: a bill where the largest number is a
    // previous balance must still choose the smaller, correctly-labelled
    // total (already covered by prior fixtures), and the scoring here comes
    // from role, not magnitude — shown by a smaller amount outranking a
    // larger, unlabelled one.
    const r = chooseAmount(['9999.99', 'Total amount due   514,99 $']);
    expect(r.value).toBe(514.99);
  });

  it('is not solved by "nearest amount due phrase wins" (position-only)', () => {
    const reordered = [rows[2], rows[0], rows[1]]; // total printed FIRST this time
    expect(chooseAmount(reordered).value).toBe(514.99);
    expect(chooseAmount(rows).value).toBe(514.99); // and printed LAST
  });

  it('is not solved by English-label-only reasoning', () => {
    const frenchOnly = [
      'Montant de la présente facture      251,28 $',
      'Montant dû immédiatement            263,71 $',
      'Montant total dû                    514,99 $',
    ];
    expect(chooseAmount(frenchOnly).value).toBe(514.99);
  });

  it('is not solved by French-label-only reasoning', () => {
    const englishOnly = [
      'Amount of this bill      251,28 $',
      'Amount due immediately   263,71 $',
      'Total amount due         514,99 $',
    ];
    expect(chooseAmount(englishOnly).value).toBe(514.99);
  });

  it('is not solved by flattened-OCR-order-only reasoning (order must not matter)', () => {
    const shuffled = [rows[1], rows[2], rows[0]];
    expect(chooseAmount(shuffled).value).toBe(514.99);
  });

  it('is not solved by top-of-page bias (the total is NOT printed first here)', () => {
    expect(rows[0]).not.toContain('total');
    expect(chooseAmount(rows).value).toBe(514.99);
  });
});

describe('Section 17 — debug diagnostics (dev/test only, never shown to a user)', () => {
  it('ranks the true total above the two partial amounts, with the reason why', () => {
    const cands = debugAmountCandidates([
      'Montant dû immédiatement / Amount due immediately          263,71 $',
      'Montant de la présente facture / Amount of this bill      251,28 $',
      'Montant total dû / Total amount due                       514,99 $',
    ]);
    expect(cands[0]).toMatchObject({ value: 514.99, role: 'TOTAL_AMOUNT_DUE' });
    expect(cands[1].role).toBe('PARTIAL_OR_COMPONENT_AMOUNT');
    expect(cands[2].role).toBe('PARTIAL_OR_COMPONENT_AMOUNT');
    expect(cands[0].score).toBeGreaterThan(cands[1].score);
    expect(cands[0].score).toBeGreaterThan(cands[2].score);
  });

  it('marks an excluded decoy (minimum payment) distinctly from a real partial amount', () => {
    const cands = debugAmountCandidates(['Minimum payment   35.00', 'Statement balance   842.17']);
    expect(cands.find(c => c.value === 35)?.role).toBe('EXCLUDED');
    expect(cands.find(c => c.value === 842.17)?.role).toBe('TOTAL_AMOUNT_DUE');
  });
});
