import type { Confidence } from '../lib/recognition/types';

/**
 * TAKE PICTURE → DONE, BUT ONLY WHEN THAT IS HONEST.
 *
 * Smart Capture used to send every photograph to the same review screen, so a
 * receipt PeggyBank had read perfectly still cost four confirmations. This
 * decides which of three roads a photo takes.
 *
 * THE ASYMMETRY THAT SHAPES EVERYTHING HERE
 * -----------------------------------------
 * One extra tap costs a second. A wrong financial record costs trust, and it
 * is invisible — nobody audits an expense they never knew was created. So the
 * thresholds are deliberately not symmetric:
 *
 *   AMOUNT, MERCHANT, DATE   must be read with HIGH confidence to pass
 *                            unattended. These three ARE the record.
 *   CATEGORY                 may be merely known. It is trivially correctable,
 *                            merchant memory improves it over time, and
 *                            getting it wrong misfiles money rather than
 *                            miscounting it.
 *
 * PURE. No database, no React. It decides a road; the screen drives it.
 */

export type CaptureRoute = 'auto' | 'ask' | 'review';

export type FieldKey = 'merchant' | 'amount' | 'date' | 'category';

export interface RouteInput {
  /** Did OCR produce anything at all? */
  ok: boolean;
  confidence: { merchant: Confidence; amount: Confidence; date: Confidence; category: Confidence };
  /** The values actually resolved, corrections and memory included. */
  merchant?: string;
  amount?: number;
  date?: string;
  category?: string;
  /** True when merchant memory supplied the category rather than the receipt. */
  categoryFromMemory?: boolean;
}

export interface RouteDecision {
  route: CaptureRoute;
  /** For 'ask': exactly the fields worth a question. Never more. */
  askFor: FieldKey[];
  /** Plain reason, for the report and for anyone debugging a surprise. */
  why: string;
}

/** The three fields that ARE the financial record. */
export const CRITICAL: FieldKey[] = ['merchant', 'amount', 'date'];

/**
 * At most this many questions before it stops being "one small question" and
 * becomes a form. Past two, the review screen is the kinder answer.
 */
export const MAX_QUESTIONS = 2;

export function decideRoute(input: RouteInput): RouteDecision {
  if (!input.ok) {
    return { route: 'review', askFor: [], why: 'nothing could be read' };
  }

  // A missing value is not a low-confidence value. Nothing to confirm means
  // nothing to show, and a one-field question with an empty box is just the
  // review screen wearing a disguise.
  const missing = CRITICAL.filter(f => valueOf(input, f) == null);
  if (missing.length > 1) {
    return { route: 'review', askFor: [], why: 'too little was read: ' + missing.join(', ') };
  }

  const shaky = CRITICAL.filter(f => input.confidence[f] !== 'high' || valueOf(input, f) == null);

  // Category counts only when nothing at all supplies it.
  const needCategory = input.category == null;
  const questions: FieldKey[] = needCategory ? [...shaky, 'category'] : [...shaky];

  if (questions.length === 0) {
    return { route: 'auto', why: 'every field read with confidence', askFor: [] };
  }

  if (questions.length <= MAX_QUESTIONS) {
    return {
      route: 'ask',
      askFor: questions,
      why: 'confident except: ' + questions.join(', '),
    };
  }

  return { route: 'review', askFor: [], why: 'too many fields uncertain' };
}

function valueOf(input: RouteInput, f: FieldKey): unknown {
  switch (f) {
    case 'merchant': return input.merchant;
    case 'amount':   return input.amount;
    case 'date':     return input.date;
    case 'category': return input.category;
  }
}
