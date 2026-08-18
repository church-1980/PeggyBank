import { ExtractedFields } from './types';

/**
 * EXTENSION POINT FOR A FUTURE AI CLASSIFIER (post-launch).
 *
 * Today the parser matches words from a fixed list. It handles the everyday
 * cases (restaurant, groceries, pharmacy, Netflix, hydro) but cannot reason:
 * "boat muffler replacement" means nothing to it because "muffler" is not on
 * the list, whereas a model would infer automotive from context.
 *
 * Rather than rebuild the pipeline later, recognition already routes its result
 * through an *enhancer* — a plain interface that receives the OCR text plus the
 * keyword-based guess and may return a better one. Shipping an AI classifier
 * later means writing one implementation of this and calling setEnhancer at
 * startup. No screen, parser, or database code has to change.
 *
 * Deliberate constraints for whatever plugs in here:
 *  - It must be OPTIONAL. The app is offline-first; if the enhancer is absent,
 *    slow, or fails, recognition keeps working on keywords alone.
 *  - It must never lower confidence or erase a field the parser was sure about;
 *    it only fills gaps or upgrades a low-confidence guess.
 *  - Anything sending receipt text off-device needs explicit user consent —
 *    receipts contain personal detail and this app promises local-only data.
 */
export interface RecognitionEnhancer {
  /** Short name for logs and settings copy, e.g. "on-device model". */
  readonly name: string;
  /** Given the raw text and the keyword result, return a refined result. */
  enhance(rawText: string, base: ExtractedFields): Promise<ExtractedFields>;
}

/** Default: change nothing. Keyword matching stands on its own. */
const passthrough: RecognitionEnhancer = {
  name: 'keywords-only',
  async enhance(_rawText, base) {
    return base;
  },
};

let active: RecognitionEnhancer = passthrough;

/** Install a smarter classifier (future AI build). */
export function setEnhancer(enhancer: RecognitionEnhancer): void {
  active = enhancer;
}

export function activeEnhancerName(): string {
  return active.name;
}

/**
 * Run the active enhancer, guarding the app against a slow or broken one:
 * any throw, or anything past the timeout, falls back to the keyword result.
 */
export async function enhanceFields(
  rawText: string,
  base: ExtractedFields,
  timeoutMs = 4000,
): Promise<ExtractedFields> {
  if (active === passthrough) return base;
  try {
    const timeout = new Promise<ExtractedFields>((resolve) =>
      setTimeout(() => resolve(base), timeoutMs)
    );
    return await Promise.race([active.enhance(rawText, base), timeout]);
  } catch {
    return base;
  }
}
