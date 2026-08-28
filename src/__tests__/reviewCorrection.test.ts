/**
 * CORRECTING A FIELD WITHOUT LEAVING SMART CAPTURE.
 *
 * The failure this file exists for is a real one, seen on a real phone with a
 * real Tim Hortons receipt: OCR missed the merchant and the total, the screen
 * said "Please review", and the only way forward was to abandon the photo and
 * rebuild the transaction on another screen by hand. At that point the camera
 * saved nobody anything.
 *
 * So: a correction typed here must win over what was read, must survive the
 * trip to the form, and must not leak into the NEXT receipt.
 */

import { resolveReview, formParams, Corrections } from '../lib/recognition/review';
import { RecognitionResult } from '../lib/recognition';
import { MerchantMemory } from '../lib/merchantMemory';

/** What the phone actually produced: date read, merchant and amount missed. */
const TIMS_AS_READ: RecognitionResult = {
  ok: true, docType: 'expense', text: '',
  merchant: undefined, amount: undefined, date: '2026-08-28', category: undefined,
  confidence: { merchant: 'none', amount: 'none', date: 'high', category: 'none' },
} as any;

const READ_NOTHING: RecognitionResult = {
  ok: false, docType: 'unknown', text: '',
  confidence: { merchant: 'none', amount: 'none', date: 'none', category: 'none' },
} as any;

const CLEAN_READ: RecognitionResult = {
  ok: true, docType: 'expense', text: '',
  merchant: 'Maxi', amount: 47.83, date: '2026-08-28', category: 'groceries',
  confidence: { merchant: 'high', amount: 'high', date: 'high', category: 'high' },
} as any;

const NONE: Corrections = {};

describe('A correction wins over what the camera read', () => {
  it('typing the merchant replaces "not read" with the name', () => {
    const r = resolveReview(TIMS_AS_READ, null, { merchant: 'Tim Hortons' });
    expect(r.merchant).toBe('Tim Hortons');
    expect(r.confidence.merchant).toBe('high');
  });

  it('typing the amount replaces "not read" with the number', () => {
    const r = resolveReview(TIMS_AS_READ, null, { amount: 11.60 });
    expect(r.amount).toBe(11.60);
    expect(r.confidence.amount).toBe('high');
  });

  it('a correction overrides even a HIGH-confidence wrong reading', () => {
    // OCR was sure it read 47.83. It was wrong. The person wins.
    const r = resolveReview(CLEAN_READ, null, { amount: 52.10 });
    expect(r.amount).toBe(52.10);
  });

  it('a field left alone keeps what was read, at its honest confidence', () => {
    const r = resolveReview(TIMS_AS_READ, null, { merchant: 'Tim Hortons' });
    expect(r.date).toBe('2026-08-28');
    expect(r.confidence.date).toBe('high');
    expect(r.confidence.amount).toBe('none');    // still not read, still says so
  });

  it('an unread field is reported as none, not quietly invented', () => {
    const r = resolveReview(TIMS_AS_READ, null, NONE);
    expect(r.merchant).toBeUndefined();
    expect(r.amount).toBeUndefined();
    expect(r.confidence.merchant).toBe('none');
  });
});

describe('Memory fills gaps, corrections still beat memory', () => {
  const memory: MerchantMemory = {
    displayName: 'Tim Hortons', docType: 'expense', category: 'restaurant',
    lastAmount: 9.45, avgAmount: 9.45, timesSeen: 4,
  } as any;

  it('what this vendor usually is fills a field OCR missed', () => {
    const r = resolveReview(TIMS_AS_READ, memory, NONE);
    expect(r.merchant).toBe('Tim Hortons');
    expect(r.category).toBe('restaurant');
    expect(r.amount).toBe(9.45);
  });

  it('a correction beats memory', () => {
    const r = resolveReview(TIMS_AS_READ, memory, { amount: 11.60, category: 'groceries' });
    expect(r.amount).toBe(11.60);
    expect(r.category).toBe('groceries');
  });

  it('what was actually READ beats what the vendor usually costs', () => {
    const r = resolveReview(CLEAN_READ, memory, NONE);
    expect(r.amount).toBe(47.83);   // this receipt, not the usual one
  });
});

describe('Continue carries the corrections into the form', () => {
  const PHOTO = 'file:///receipts/tims.jpg';

  it('a corrected expense arrives at the form filled in, photo attached', () => {
    const r = resolveReview(TIMS_AS_READ, null, { merchant: 'Tim Hortons', amount: 11.60, category: 'restaurant' });
    const p: any = formParams(r, 'expense', PHOTO, r.shouldPrefill);
    expect(p.note).toBe('Tim Hortons');
    expect(p.amount).toBe(11.60);
    expect(p.category).toBe('restaurant');
    expect(p.date).toBe('2026-08-28');       // the date OCR got right is not thrown away
    expect(p.capturedPhoto).toBe(PHOTO);
  });

  it('THE BUG: corrections on an UNREADABLE document still reach the form', () => {
    // OCR failed completely, so the old screen refused to prefill anything and
    // silently discarded everything the person had just typed.
    const r = resolveReview(READ_NOTHING, null, { merchant: 'Tim Hortons', amount: 11.60 });
    expect(r.shouldPrefill).toBe(true);
    const p: any = formParams(r, 'expense', PHOTO, r.shouldPrefill);
    expect(p.note).toBe('Tim Hortons');
    expect(p.amount).toBe(11.60);
  });

  it('an unreadable document with NO corrections prefills nothing but keeps the photo', () => {
    const r = resolveReview(READ_NOTHING, null, NONE);
    expect(r.shouldPrefill).toBe(false);
    const p: any = formParams(r, 'expense', PHOTO, r.shouldPrefill);
    expect(p.amount).toBeUndefined();
    expect(p.note).toBeUndefined();
    expect(p.capturedPhoto).toBe(PHOTO);     // the paper is still saved
  });

  it('"Enter manually" deliberately discards the reading but keeps the photo', () => {
    const r = resolveReview(CLEAN_READ, null, NONE);
    const p: any = formParams(r, 'expense', PHOTO, false);
    expect(p.amount).toBeUndefined();
    expect(p.capturedPhoto).toBe(PHOTO);
  });

  it('switching the same receipt to Bill carries the same corrected values', () => {
    const r = resolveReview(TIMS_AS_READ, null, { merchant: 'Hydro Quebec', amount: 210.44 });
    const p: any = formParams(r, 'bill', PHOTO, r.shouldPrefill);
    expect(p.billName).toBe('Hydro Quebec');
    expect(p.billAmount).toBe(210.44);
    expect(p.capturedPhoto).toBe(PHOTO);
    expect(p.autoOpen).toBe(true);
  });
});

describe('Corrections do not leak between documents', () => {
  it('clearing edits returns the screen to what was actually read', () => {
    const corrected = resolveReview(CLEAN_READ, null, { amount: 99.99 });
    expect(corrected.amount).toBe(99.99);
    // Retake / Use Photo resets edits to {} — the next receipt starts honest.
    const fresh = resolveReview(TIMS_AS_READ, null, NONE);
    expect(fresh.amount).toBeUndefined();
    expect(fresh.merchant).toBeUndefined();
    expect(fresh.corrected).toBe(false);
  });

  it('an empty correction set is not mistaken for real work', () => {
    expect(resolveReview(CLEAN_READ, null, {}).corrected).toBe(false);
    expect(resolveReview(CLEAN_READ, null, { merchant: undefined }).corrected).toBe(false);
    expect(resolveReview(CLEAN_READ, null, { merchant: 'X' }).corrected).toBe(true);
  });
});
