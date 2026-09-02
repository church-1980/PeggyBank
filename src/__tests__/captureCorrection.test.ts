/**
 * NO FIELD MAY TRAP THE USER.
 *
 * Observed on a real phone: PeggyBank read a hydro bill, asked for the amount
 * to be checked, accepted the tap and the keyboard — and then offered no way
 * to accept the correction and carry on. The amount editor was built on a
 * component that had no onBlur, no onSubmitEditing and no return key, because
 * a decimal keypad does not have one. Editing could be started and could not
 * be finished.
 *
 * Two of these tests read the screen source. That is deliberate: the defect
 * was the ABSENCE of a control, and absence is not something a unit test of
 * the pure logic can see.
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveReview, formParams } from '../lib/recognition/review';
import { decideRoute } from '../core/captureRoute';
import type { RecognitionResult } from '../lib/recognition/types';

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'screens', 'QuickCaptureScreen.tsx'), 'utf8',
);
const CURRENCY = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'peggy', 'PeggyCurrencyInput.tsx'), 'utf8',
);

const read = (over: Partial<RecognitionResult> = {}): RecognitionResult => ({
  ok: true,
  rawTextLength: 120,
  docType: 'bill',
  merchant: 'NORTHWIND POWER LTD',
  amount: 310.63,
  date: '2026-09-02',
  confidence: {
    docType: 'high', merchant: 'high', amount: 'low',
    date: 'high', dueDate: 'none', category: 'high',
  },
  category: 'home',
  ...over,
});

describe('Every editable field can actually be finished', () => {
  it('the amount editor can be committed by keyboard AND by tapping', () => {
    // Declaring the prop is not wiring it. Deleting the handler from the
    // TextInput left the interface untouched, so a looser check passed while
    // the field was once again impossible to finish.
    const input = CURRENCY.slice(CURRENCY.indexOf('<TextInput'), CURRENCY.indexOf('</View>'));
    expect(input).toContain('onSubmitEditing={onSubmitEditing}');
    expect(input).toContain('onBlur={onBlur}');
    expect(input).toContain('returnKeyType="done"');
    expect(SCREEN).toContain('capture-amount-done');
  });

  it('the merchant editor can be committed by keyboard AND by tapping', () => {
    expect(SCREEN).toContain('capture-merchant-done');
  });

  it('there is a visible Done control, not only a keyboard key', () => {
    // A decimal keypad has no return key at all, so a keyboard-only exit is
    // no exit.
    expect(SCREEN).toContain('function DoneButton');
    expect(SCREEN).toContain('accessibilityLabel="Done editing"');
  });

  it('the Done control is big enough for a thumb', () => {
    const at = SCREEN.indexOf('function DoneButton');
    const body = SCREEN.slice(at, at + 700);
    expect(body).toContain('height: 48');
  });
});

describe('A correction is never silently discarded', () => {
  it('continuing commits whatever is still being typed', () => {
    // Continue used to navigate with the pre-edit values because setEdits does
    // not apply until the next render.
    expect(SCREEN).toContain('editsWithDraft');
    const at = SCREEN.indexOf('const merged = editsWithDraft()');
    expect(at).toBeGreaterThan(-1);
    expect(SCREEN.slice(at, at + 300)).toContain('goToForm(chosenType, finalReview.shouldPrefill, finalReview)');
  });

  it('goToForm uses the state it is handed, not a stale one', () => {
    expect(SCREEN).toContain('state: ReviewState = review');
    expect(SCREEN).toContain('formParams(state, type, ownedUri, prefill)');
  });
});

describe('A correction is trusted, and it clears the warning', () => {
  it('a typed amount becomes certain, whatever OCR thought', () => {
    const state = resolveReview(read(), null, { amount: 61.95 });
    expect(state.amount).toBe(61.95);
    expect(state.confidence.amount).toBe('high');
  });

  it('a typed merchant becomes certain', () => {
    const state = resolveReview(read({ merchant: undefined }), null, { merchant: 'Cornwall Electric' });
    expect(state.merchant).toBe('Cornwall Electric');
    expect(state.confidence.merchant).toBe('high');
  });

  it('a typed date becomes certain', () => {
    const state = resolveReview(read({ date: undefined }), null, { date: '2026-09-01' });
    expect(state.confidence.date).toBe('high');
  });

  it('a chosen category becomes certain', () => {
    const state = resolveReview(read({ category: undefined }), null, { category: 'home' });
    expect(state.confidence.category).toBe('high');
  });

  it('correcting the one shaky field is enough to stop the questions', () => {
    const before = resolveReview(read(), null, {});
    expect(decideRoute({ ok: true, ...before, confidence: before.confidence }).route).not.toBe('auto');

    const after = resolveReview(read(), null, { amount: 310.63 });
    const decision = decideRoute({ ok: true, ...after, confidence: after.confidence });
    expect(decision.route).toBe('auto');
    expect(decision.askFor).toEqual([]);
  });

  it('a correction on a document OCR could not read at all still prefills', () => {
    const state = resolveReview(null, null, { merchant: 'Corner Shop', amount: 12.5 });
    expect(state.shouldPrefill).toBe(true);
    expect(state.corrected).toBe(true);
  });
});

describe('The photo survives every correction', () => {
  it('an expense keeps the receipt after fields are edited', () => {
    const state = resolveReview(read({ docType: 'expense' }), null, { amount: 61.95, merchant: 'The Keg' });
    const params = formParams(state, 'expense', 'file:///receipts/a.jpg', true) as any;
    expect(params.capturedPhoto).toBe('file:///receipts/a.jpg');
    expect(params.amount).toBe(61.95);
  });

  it('a bill keeps the photo too', () => {
    const state = resolveReview(read(), null, { amount: 310.63 });
    const params = formParams(state, 'bill', 'file:///receipts/b.jpg', true) as any;
    expect(params.capturedPhoto).toBe('file:///receipts/b.jpg');
  });

  it('the photo survives even when the user declines to prefill anything', () => {
    const state = resolveReview(read(), null, {});
    const params = formParams(state, 'expense', 'file:///receipts/c.jpg', false) as any;
    expect(params.capturedPhoto).toBe('file:///receipts/c.jpg');
    expect(params.amount).toBeUndefined();
  });
});

describe('Uncertainty is never presented as certainty', () => {
  it('a document that could not be read goes to full review', () => {
    expect(decideRoute({ ok: false, confidence: { merchant: 'none', amount: 'none', date: 'none', category: 'none' } }).route)
      .toBe('review');
  });

  it('a merchant PeggyBank could not name is asked about, not invented', () => {
    const state = resolveReview(read({ merchant: undefined, confidence: { ...read().confidence, merchant: 'none' } }), null, {});
    expect(state.merchant).toBeUndefined();
    expect(state.confidence.merchant).toBe('none');
  });
});

describe('Every entry point uses the one canonical pipeline', () => {
  const NAV = fs.readFileSync(path.join(__dirname, '..', 'navigation', 'AppNavigator.tsx'), 'utf8');
  const ADD_EXPENSE = fs.readFileSync(path.join(__dirname, '..', 'screens', 'AddExpenseScreen.tsx'), 'utf8');

  it('the Camera tab opens Smart Capture', () => {
    expect(NAV).toContain("navigation.navigate('QuickCapture')");
  });

  it('the Add Expense camera reads the receipt instead of only keeping it', () => {
    // This entry point used to attach the photo and read nothing, so the same
    // receipt behaved differently depending on where the camera was opened.
    expect(ADD_EXPENSE).toContain("from '../lib/recognition'");
    expect(ADD_EXPENSE).toContain('readIntoBlanks');
  });

  it('both Add Expense photo routes read, not just the camera one', () => {
    const calls = ADD_EXPENSE.split('readIntoBlanks(result.assets[0].uri)').length - 1;
    expect(calls).toBe(2);   // take a photo, and choose from the gallery
  });

  it('reading never overwrites something the person already typed', () => {
    const at = ADD_EXPENSE.indexOf('const readIntoBlanks');
    const body = ADD_EXPENSE.slice(at, ADD_EXPENSE.indexOf('const takePhoto', at));
    expect(body).toContain('if (!amount &&');
    expect(body).toContain('if (!note.trim() &&');
  });

  it('a failure to read still keeps the photo', () => {
    const at = ADD_EXPENSE.indexOf('const readIntoBlanks');
    const body = ADD_EXPENSE.slice(at, ADD_EXPENSE.indexOf('const takePhoto', at));
    expect(body).toContain('catch');
    // setPhotoUri happens before reading is attempted.
    expect(ADD_EXPENSE.indexOf('setPhotoUri(result.assets[0].uri)'))
      .toBeLessThan(ADD_EXPENSE.indexOf('await readIntoBlanks(result.assets[0].uri)'));
  });

  it('exactly one screen implements the review flow', () => {
    // Counting occurrences of a filename proved nothing (the import path is
    // one of them). What matters is that the review logic has a single home:
    // a second screen resolving its own review is a second Smart Capture.
    const screens = fs.readdirSync(path.join(__dirname, '..', 'screens'))
      .filter(n => n.endsWith('.tsx'));
    const owners = screens.filter(n =>
      fs.readFileSync(path.join(__dirname, '..', 'screens', n), 'utf8').includes('resolveReview('),
    );
    expect(owners).toEqual(['QuickCaptureScreen.tsx']);
  });
});
