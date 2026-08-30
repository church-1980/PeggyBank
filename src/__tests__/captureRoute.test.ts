/**
 * WHICH ROAD DOES THIS PHOTOGRAPH TAKE?
 *
 * Smart Capture sent every receipt to the same review screen, so one PeggyBank
 * had read perfectly still cost four confirmations. Now it can save silently —
 * which makes the threshold a financial decision, not a UX one.
 *
 * The asymmetry these tests exist to protect: one extra tap costs a second, a
 * wrong expense costs trust and is invisible, because nobody audits a record
 * they never knew was created. So amount, merchant and date must be read with
 * HIGH confidence to pass unattended. Category need only be known.
 */

import { decideRoute, CRITICAL, MAX_QUESTIONS, type RouteInput } from '../core/captureRoute';

const HIGH = 'high' as const, LOW = 'low' as const, NONE = 'none' as const;

/** A receipt read perfectly. Individual tests spoil one thing at a time. */
const perfect = (over: Partial<RouteInput> = {}): RouteInput => ({
  ok: true,
  confidence: { merchant: HIGH, amount: HIGH, date: HIGH, category: HIGH },
  merchant: 'Tim Hortons', amount: 11.60, date: '2026-08-28', category: 'restaurant',
  ...over,
});

describe('Take picture, done', () => {
  it('a receipt read with confidence saves itself', () => {
    const d = decideRoute(perfect());
    expect(d.route).toBe('auto');
    expect(d.askFor).toEqual([]);
  });

  it('a category supplied by merchant memory is good enough to pass', () => {
    // The receipt never said "restaurant"; PeggyBank knows this vendor.
    const d = decideRoute(perfect({
      confidence: { merchant: HIGH, amount: HIGH, date: HIGH, category: NONE },
      categoryFromMemory: true,
    }));
    expect(d.route).toBe('auto');
  });
});

describe('The three fields that ARE the record', () => {
  for (const field of CRITICAL) {
    it('a merely LOW ' + field + ' is never saved unattended', () => {
      const d = decideRoute(perfect({
        confidence: { ...perfect().confidence, [field]: LOW } as any,
      }));
      expect(d.route).not.toBe('auto');
      expect(d.askFor).toContain(field);
    });

    it('a MISSING ' + field + ' is never saved unattended', () => {
      const d = decideRoute(perfect({ [field]: undefined } as any));
      expect(d.route).not.toBe('auto');
    });
  }

  it('an uncertain CATEGORY does not block the save on its own', () => {
    // Misfiling money is recoverable and correctable; miscounting it is not.
    const d = decideRoute(perfect({
      confidence: { merchant: HIGH, amount: HIGH, date: HIGH, category: LOW },
    }));
    expect(d.route).toBe('auto');
  });

  it('a category nothing supplies becomes the one question', () => {
    const d = decideRoute(perfect({
      confidence: { merchant: HIGH, amount: HIGH, date: HIGH, category: NONE },
      category: undefined,
    }));
    expect(d.route).toBe('ask');
    expect(d.askFor).toEqual(['category']);
  });
});

describe('Asking only about what is actually uncertain', () => {
  it('one shaky field means one question, not four', () => {
    const d = decideRoute(perfect({
      confidence: { merchant: HIGH, amount: LOW, date: HIGH, category: HIGH },
    }));
    expect(d.route).toBe('ask');
    expect(d.askFor).toEqual(['amount']);
    // The whole point: merchant, date and category are NOT re-asked.
    expect(d.askFor).not.toContain('merchant');
    expect(d.askFor).not.toContain('date');
  });

  it('two shaky fields means two questions', () => {
    const d = decideRoute(perfect({
      confidence: { merchant: LOW, amount: LOW, date: HIGH, category: HIGH },
    }));
    expect(d.route).toBe('ask');
    expect(d.askFor).toEqual(['merchant', 'amount']);
  });

  it('past two questions it is a form, so the review screen is kinder', () => {
    const d = decideRoute(perfect({
      confidence: { merchant: LOW, amount: LOW, date: LOW, category: HIGH },
    }));
    expect(d.route).toBe('review');
    expect(d.askFor).toEqual([]);
  });

  it('never asks more questions than the limit', () => {
    for (const m of [HIGH, LOW, NONE]) for (const a of [HIGH, LOW, NONE])
      for (const dt of [HIGH, LOW, NONE]) for (const c of [HIGH, LOW, NONE]) {
        const d = decideRoute(perfect({ confidence: { merchant: m, amount: a, date: dt, category: c } }));
        expect(d.askFor.length).toBeLessThanOrEqual(MAX_QUESTIONS);
      }
  });
});

describe('When PeggyBank should not pretend', () => {
  it('OCR failure goes straight to the review screen', () => {
    const d = decideRoute(perfect({ ok: false }));
    expect(d.route).toBe('review');
  });

  it('two missing essentials is a review, not two blank questions', () => {
    // A one-field question with an empty box is the review screen in disguise.
    const d = decideRoute(perfect({ merchant: undefined, amount: undefined }));
    expect(d.route).toBe('review');
  });

  it('an empty read never auto-saves, whatever the confidence claims', () => {
    const d = decideRoute({
      ok: true,
      confidence: { merchant: HIGH, amount: HIGH, date: HIGH, category: HIGH },
    });
    expect(d.route).not.toBe('auto');
  });

  it('every decision explains itself', () => {
    for (const input of [perfect(), perfect({ ok: false }), perfect({ amount: undefined })]) {
      expect(decideRoute(input).why.length).toBeGreaterThan(5);
    }
  });
});
