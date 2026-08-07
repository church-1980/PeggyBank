import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../database/database';

/**
 * Custom merchant logos — a user can attach their OWN picture to any named item
 * (a bill, subscription, debt, expense, goal). Logos are keyed by the item's
 * NAME (normalized), so setting a logo for "Bell" shows it on every "Bell" item
 * on every screen, and it stays editable wherever it appears.
 *
 * Images are copied into the app's private documentDirectory/logos/ folder; we
 * only ever delete files inside that folder.
 */

const LOGOS_DIR = FileSystem.documentDirectory + 'logos/';

/** Normalize an item name into a stable logo key. */
export function logoKey(name?: string | null): string {
  return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(LOGOS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(LOGOS_DIR, { intermediates: true });
}

function uniqueName(): string {
  return `logo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;
}

export function isOwnedLogo(uri?: string | null): boolean {
  return !!uri && uri.startsWith(LOGOS_DIR);
}

/** All custom logos as { key: uri } for fast lookup while rendering lists. */
export async function getAllCustomLogos(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; uri: string }>(`SELECT key, uri FROM custom_logos`);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.uri;
  return out;
}

/**
 * Attach (or replace) a custom logo for an item name. Copies the picked image
 * into owned storage, removes any previous owned logo for that key, and upserts
 * the row. Returns the persistent URI.
 */
export async function setCustomLogo(name: string, tempUri: string): Promise<string> {
  const key = logoKey(name);
  if (!key) throw new Error('Cannot set a logo for an unnamed item.');
  await ensureDir();
  const dest = LOGOS_DIR + uniqueName();
  await FileSystem.copyAsync({ from: tempUri, to: dest });

  const db = await getDatabase();
  // clean up the previous owned file for this key, if any
  const prev = await db.getFirstAsync<{ uri: string }>(`SELECT uri FROM custom_logos WHERE key = ?`, [key]);
  if (prev?.uri && isOwnedLogo(prev.uri) && prev.uri !== dest) {
    try { await FileSystem.deleteAsync(prev.uri, { idempotent: true }); } catch {}
  }
  await db.runAsync(
    `INSERT OR REPLACE INTO custom_logos (key, uri, updated_at) VALUES (?, ?, ?)`,
    [key, dest, Date.now()]
  );
  return dest;
}

/** Remove the custom logo for a name (reverts to the built-in matte icon). */
export async function removeCustomLogo(name: string): Promise<void> {
  const key = logoKey(name);
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ uri: string }>(`SELECT uri FROM custom_logos WHERE key = ?`, [key]);
  if (row?.uri && isOwnedLogo(row.uri)) {
    try { await FileSystem.deleteAsync(row.uri, { idempotent: true }); } catch {}
  }
  await db.runAsync(`DELETE FROM custom_logos WHERE key = ?`, [key]);
}

/** Wipe the whole logos folder (used by delete-all-data). */
export async function wipeAllLogos(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(LOGOS_DIR);
    if (info.exists) await FileSystem.deleteAsync(LOGOS_DIR, { idempotent: true });
  } catch {}
}
