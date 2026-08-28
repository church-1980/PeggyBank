import { Category } from '../../types';
import { RecognitionResult, DocType } from './index';
import { MerchantMemory } from '../merchantMemory';

/**
 * What the Smart Capture review screen believes right now.
 *
 * Three sources disagree about every field: what OCR read, what this vendor
 * usually looks like, and what the person just typed. Deciding between them
 * used to happen inline in the screen, where nothing could test it — and it
 * got the important case wrong: a correction typed on a document OCR had
 * failed to read was dropped on the way to the form.
 *
 * The rule is simple and worth stating once, in one place:
 *   a correction beats memory, and memory beats a guess.
 */

export type FieldKey = 'merchant' | 'amount' | 'date' | 'category';
export type Confidence = 'high' | 'low' | 'none';

export interface Corrections {
  merchant?: string;
  amount?: number;
  date?: string;
  category?: Category;
}

export interface ReviewState {
  merchant?: string;
  amount?: number;
  date?: string;
  category?: Category;
  /** Per-field certainty AFTER corrections are taken into account. */
  confidence: Record<FieldKey, Confidence>;
  /** Has the person typed anything on this screen? */
  corrected: boolean;
  /** Should Continue carry these values into the form? */
  shouldPrefill: boolean;
}

export function resolveReview(
  result: RecognitionResult | null,
  known: MerchantMemory | null,
  edits: Corrections,
): ReviewState {
  const merchant = edits.merchant ?? known?.displayName ?? result?.merchant;
  const amount   = edits.amount   ?? result?.amount ?? known?.lastAmount;
  const date     = edits.date     ?? result?.date;
  const category = (edits.category ?? known?.category ?? result?.category) as Category | undefined;

  // A field the person typed is certain, whatever the camera thought of it.
  const conf = (key: FieldKey, value: unknown): Confidence => {
    if ((edits as any)[key] != null) return 'high';
    if (value == null) return 'none';
    return result?.confidence?.[key] ?? 'low';
  };

  const corrected = Object.values(edits).some(v => v != null);

  return {
    merchant, amount, date, category,
    confidence: {
      merchant: conf('merchant', merchant),
      amount:   conf('amount', amount),
      date:     conf('date', date),
      category: conf('category', category),
    },
    corrected,
    // Even a document we could not read is worth prefilling once the person
    // has told us what it says.
    shouldPrefill: !!result?.ok || corrected,
  };
}

/**
 * The params handed to the Add Expense / Add Bill form. Kept here so that what
 * the review screen shows and what the form receives cannot drift apart.
 */
export function formParams(state: ReviewState, type: DocType, photoUri: string, prefill: boolean) {
  if (type === 'expense') {
    return {
      capturedPhoto: photoUri,
      amount:   prefill ? state.amount   : undefined,
      category: prefill ? state.category : undefined,
      note:     prefill ? state.merchant : undefined,
      date:     prefill ? state.date     : undefined,
    };
  }
  return {
    autoOpen: true,
    capturedPhoto: photoUri,
    billName:   prefill ? state.merchant : undefined,
    billAmount: prefill ? state.amount   : undefined,
  };
}
