import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Recognizer, RecognitionResult, EMPTY_CONFIDENCE } from './types';
import { parseDocument } from './parse';

export * from './types';
export { parseDocument } from './parse';

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
      const text = res?.text ?? '';
      if (!text.trim()) return failed();
      const fields = parseDocument(text);
      return { ok: true, rawTextLength: text.length, ...fields };
    } catch {
      return failed();
    }
  },
};

/** The active recognizer. Swap here to change engines app-wide. */
export const recognizer: Recognizer = mlkitRecognizer;
