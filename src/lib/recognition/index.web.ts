import { Recognizer, RecognitionResult, EMPTY_CONFIDENCE } from './types';

export * from './types';
export { parseDocument } from './parse';
export { setEnhancer, activeEnhancerName } from './enhance';
export type { RecognitionEnhancer } from './enhance';

/**
 * Web build of the recogniser.
 *
 * The phone reads receipts with Google ML Kit, which is a native module with no
 * browser equivalent — importing it on web crashes the bundle. This file is
 * picked up automatically for web (Metro resolves .web.ts first), so the browser
 * never loads it.
 *
 * A photo taken in the browser is therefore kept and the user fills in the
 * fields themselves, rather than the app pretending to read it. When browser OCR
 * arrives (Tesseract.js/WASM, or the AI enhancer in ./enhance), it plugs in here
 * and every screen benefits without changing.
 */
export const webRecognizer: Recognizer = {
  async recognize(_imageUri: string): Promise<RecognitionResult> {
    return {
      ok: false,               // honest: nothing was read
      rawTextLength: 0,
      docType: 'unknown',
      confidence: { ...EMPTY_CONFIDENCE },
    };
  },
};

export const recognizer: Recognizer = webRecognizer;
