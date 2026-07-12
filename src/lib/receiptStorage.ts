import * as FileSystem from 'expo-file-system/legacy';

/**
 * Receipt/bill image storage — PeggyBank-owned files only.
 *
 * Accepted images are copied into the app's private documentDirectory/receipts/
 * folder with a unique name. We only ever delete files that live inside that
 * folder, so we can never remove a shared or unrelated device file.
 */

const RECEIPTS_DIR = FileSystem.documentDirectory + 'receipts/';

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
  }
}

function uniqueName(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `receipt_${Date.now()}_${rand}.jpg`;
}

/** Is this URI a PeggyBank-owned receipt file? (Guards every delete.) */
export function isOwnedReceipt(uri?: string | null): boolean {
  return !!uri && uri.startsWith(RECEIPTS_DIR);
}

/**
 * Copy an accepted capture (temp cache URI) into owned private storage.
 * Returns the new persistent URI to store in photo_uri.
 */
export async function saveAcceptedImage(tempUri: string): Promise<string> {
  await ensureDir();
  const dest = RECEIPTS_DIR + uniqueName();
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

/** Delete a single owned receipt image. No-op for non-owned URIs (safety). */
export async function deleteReceiptImage(uri?: string | null): Promise<void> {
  if (!isOwnedReceipt(uri)) return;
  try {
    const info = await FileSystem.getInfoAsync(uri!);
    if (info.exists) await FileSystem.deleteAsync(uri!, { idempotent: true });
  } catch {
    // Cleanup failures are non-fatal; caller may surface them.
  }
}

/** Delete a discarded temporary capture (camera/cache file), if it's a temp. */
export async function deleteTempImage(uri?: string | null): Promise<void> {
  if (!uri) return;
  // Only touch cache-dir temp files; never the gallery or owned storage.
  const cache = FileSystem.cacheDirectory ?? '';
  if (!cache || !uri.startsWith(cache)) return;
  try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
}

/** Remove the entire PeggyBank receipts folder (wipe-all-data). */
export async function wipeAllReceipts(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
    if (info.exists) await FileSystem.deleteAsync(RECEIPTS_DIR, { idempotent: true });
  } catch {
    // Non-fatal; reported by the caller if needed.
  }
}
