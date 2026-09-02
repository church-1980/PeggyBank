import { localDateString } from '../core/datetime';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../database/database';
import {
  buildBackup, restoreBackup, summarizeBackup, countImageReferences,
  RestoreReport, BackupSummaryLine,
} from './backupCore';

/**
 * Export / restore, as the UI calls it. All database work lives in backupCore
 * so it can be tested without a file picker; this file only handles picking,
 * reading and sharing the file.
 */

export interface ExportResult {
  filename: string;
  summary: BackupSummaryLine[];
  /** Photos referenced by the data whose files are NOT inside the file. */
  photoRefs: number;
}

/**
 * A name the user will recognise in a year, in a folder full of other files.
 *
 * The .json extension stays. It is what the file honestly is, it is what the
 * restore picker filters on, and hiding it would trade a real restore failure
 * for a cosmetic gain.
 */
export function backupFilename(now: Date = new Date()): string {
  return `PeggyBank_Backup_${localDateString(now)}.json`;
}

export async function exportBackup(): Promise<ExportResult> {
  const db = await getDatabase();
  const backup = await buildBackup(db);

  const json = JSON.stringify(backup, null, 2);
  const filename = backupFilename();
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  // application/json is kept deliberately. It is the file's true type and it
  // is what the restore picker filters on; changing it to discourage Android
  // from previewing the contents would risk the user being unable to select
  // their own backup later.
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your PeggyBank backup',
  });

  return {
    filename,
    summary: summarizeBackup(backup),
    photoRefs: countImageReferences(backup),
  };
}

export async function importBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/octet-stream', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { success: false, message: 'No file selected.' };
    }

    const json = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      // Nothing has been touched at this point — the user's data is untouched.
      return { success: false, message: 'That file could not be read as a PeggyBank backup. Nothing was changed.' };
    }

    const db = await getDatabase();
    const report: RestoreReport = await restoreBackup(db, parsed);

    let message = report.message;
    if (report.success && report.missingImageRefs) {
      message += ` ${report.missingImageRefs} photo${report.missingImageRefs === 1 ? '' : 's'} could not be recovered — images are not stored inside a backup file.`;
    }
    return { success: report.success, message };
  } catch (e) {
    // The user is told plainly what happened and what it cost them: nothing.
    // The underlying error goes to the console for us, not to them.
    console.warn('[backup] restore failed:', e);
    return {
      success: false,
      message: "PeggyBank couldn't read that file. Nothing on your phone was changed.",
    };
  }
}

export { buildBackup, restoreBackup, validateBackup, summarizeBackup } from './backupCore';
