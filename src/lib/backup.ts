import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../database/database';
import { buildBackup, restoreBackup, RestoreReport } from './backupCore';

/**
 * Export / restore, as the UI calls it. All database work lives in backupCore
 * so it can be tested without a file picker; this file only handles picking,
 * reading and sharing the file.
 */

export async function exportBackup(): Promise<void> {
  const db = await getDatabase();
  const backup = await buildBackup(db);

  const json = JSON.stringify(backup, null, 2);
  const filename = `peggybank_backup_${new Date().toISOString().split('T')[0]}.json`;
  const uri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save PeggyBank Backup',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export async function importBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
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
    return { success: false, message: `Could not restore backup. Nothing was changed. ${String(e)}` };
  }
}

export { buildBackup, restoreBackup, validateBackup } from './backupCore';
