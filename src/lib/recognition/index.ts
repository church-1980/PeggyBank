import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Recognizer, RecognitionResult, EMPTY_CONFIDENCE } from './types';
import { parseDocument } from './parse';
import { readableText } from './layout';
import { enhanceFields } from './enhance';

export * from './types';
export { parseDocument } from './parse';
export { readableText, rowsFromLines, flattenLines } from './layout';
export { setEnhancer, activeEnhancerName } from './enhance';
export type { RecognitionEnhancer } from './enhance';

function failed(): RecognitionResult {
  return { ok: false, rawTextLength: 0, docType: 'unknown', confidence: { ...EMPTY_CONFIDENCE } };
}

/**
 * On-device recognizer: Google ML Kit text recognition + PeggyBank parsing.
 * Returns ok:false on empty/failed OCR so the caller shows the manual fallback.
 * Raw OCR text is used only to parse fields and is never persisted.
 */
export const mlkitRecognizer: Recognizer = {
  async recognize(imageUri: string): Promise<RecognitionResult> {
    try {
      const res = await TextRecognition.recognize(imageUri);
      const flat = res?.text ?? '';
      if (!flat.trim()) return failed();

      // Rebuild the receipt into visual rows before reading it. ML Kit groups
      // text into blocks, and on a receipt the labels and the amounts are often
      // separate blocks -- so the flat text can list every label and then every
      // number, with nothing connecting them. Each line carries a bounding box,
      // which this pipeline used to discard. Falls back to the flat text when
      // there is no geometry to work with.
      const text = readableText(res?.blocks as any, flat);
      const fields = parseDocument(text);
      // Give a smarter classifier a chance to improve on the keyword guess.
      // Falls straight through until one is installed (see ./enhance).
      const refined = await enhanceFields(text, fields);
      return { ok: true, rawTextLength: text.length, ...refined };
    } catch {
      return failed();
    }
  },
};

/** The active recognizer. Swap here to change engines app-wide. */
export const recognizer: Recognizer = mlkitRecognizer;
