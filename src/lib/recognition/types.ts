import { Category } from '../../types';

/**
 * Recognition-provider interface — the OCR engine is swappable.
 * MLKitRecognizer (on-device) is the default; ManualRecognizer is the fallback.
 * A cloud provider could later implement the same interface.
 */

export type DocType = 'expense' | 'bill' | 'unknown';

/** Per-field confidence. Kept simple + honest: we only surface high vs review. */
export type Confidence = 'high' | 'low' | 'none';

export interface ExtractedFields {
  docType: DocType;
  merchant?: string;      // merchant (expense) or payee (bill)
  amount?: number;        // total or amount due
  date?: string;          // transaction date, YYYY-MM-DD
  dueDate?: string;       // bill due date, YYYY-MM-DD
  category?: Category;
  recurring?: boolean;    // only when evidence supports it
  confidence: {
    docType: Confidence;
    merchant: Confidence;
    amount: Confidence;
    date: Confidence;
    dueDate: Confidence;
    category: Confidence;
  };
}

export interface RecognitionResult extends ExtractedFields {
  ok: boolean;            // false when OCR returned nothing / failed
  rawTextLength: number;  // for debugging only; raw text is NOT persisted
}

export interface Recognizer {
  recognize(imageUri: string): Promise<RecognitionResult>;
}

export const EMPTY_CONFIDENCE = {
  docType: 'none' as Confidence,
  merchant: 'none' as Confidence,
  amount: 'none' as Confidence,
  date: 'none' as Confidence,
  dueDate: 'none' as Confidence,
  category: 'none' as Confidence,
};
