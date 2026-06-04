import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  exportExpenses, exportIncome, exportBills, exportGoals,
  exportDebts, exportSubscriptions, exportAll,
} from '../lib/csvExport';
import { exportBackup, importBackup } from '../lib/backup';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface ExportDef {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  action: () => Promise<void>;
  colorKey: 'primary' | 'spending' | 'income' | 'bills' | 'goals' | 'debt' | 'subs';
}

const CSV_EXPORT_DEFS: ExportDef[] = [
  { label: 'All Data',       icon: 'albums-outline',           description: 'Everything in one file',        action: exportAll,           colorKey: 'primary' },
  { label: 'Expenses',       icon: 'arrow-up-circle-outline',  description: 'All spending records',           action: exportExpenses,      colorKey: 'spending' },
  { label: 'Income',         icon: 'arrow-down-circle-outline',description: 'All income records',             action: exportIncome,        colorKey: 'income' },
  { label: 'Bills',          icon: 'receipt-outline',          description: 'Your recurring bills',           action: exportBills,         colorKey: 'bills' },
  { label: 'Savings Goals',  icon: 'flag-outline',             description: 'Goals and progress',             action: exportGoals,         colorKey: 'goals' },
  { label: 'Debts',          icon: 'trending-down-outline',    description: 'Debts and payments made',        action: exportDebts,         colorKey: 'debt' },
  { label: 'Subscriptions',  icon: 'repeat-outline',           description: 'Your subscriptions',             action: exportSubscriptions, colorKey: 'subs' },
];

export default function ExportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [loading, setLoading] = useState<string | null>(null);

  const CSV_EXPORTS = CSV_EXPORT_DEFS.map((d) => ({ ...d, color: C[d.colorKey] }));

  const run = async (key: string, action: () => Promise<void>) => {
    setLoading(key);
    try {
      await action();
    } catch (e) {
      Alert.alert('Could not export', String(e));
    } finally {
      setLoading(null);
    }
  };

  const handleImport = () => {
    Alert.alert(
      'Restore Backup',
      'This will replace all your current PeggyBank data with the backup file. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, restore',
          style: 'destructive',
          onPress: async () => {
            setLoading('import');
            try {
              const result = await importBackup();
              Alert.alert(result.success ? 'Done' : 'Could not restore', result.message);
            } catch (e) {
              Alert.alert('Error', String(e));
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Export & Backup</Text>
      <Text style={styles.subtitle}>Everything stays on your phone. Share files to save them elsewhere.</Text>

      <Text style={styles.sectionLabel}>FULL BACKUP</Text>
      <View style={styles.section}>
        <Text style={styles.sectionSub}>
          Saves everything in one file. Use this to move to a new phone or keep a safe copy.
        </Text>

        <TouchableOpacity
          style={styles.backupBtn}
          onPress={() => run('backup', exportBackup)}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === 'backup' ? (
            <ActivityIndicator color={C.textOnPrimary} />
          ) : (
            <>
              <View style={styles.backupIconWrap}>
                <Ionicons name="cloud-download-outline" size={22} color={C.textOnPrimary} />
              </View>
              <View style={styles.backupMiddle}>
                <Text style={styles.backupLabel}>Export Backup File</Text>
                <Text style={styles.backupDesc}>Saves a .json file you can share or email to yourself</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textOnPrimary} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.importBtn}
          onPress={handleImport}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === 'import' ? (
            <ActivityIndicator color={C.primary} />
          ) : (
            <>
              <View style={[styles.backupIconWrap, { backgroundColor: C.primary + '20' }]}>
                <Ionicons name="folder-open-outline" size={22} color={C.primary} />
              </View>
              <View style={styles.backupMiddle}>
                <Text style={styles.importLabel}>Restore from Backup</Text>
                <Text style={[styles.backupDesc, { color: C.textSecondary }]}>Choose a backup file to restore your data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textHint} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>EXPORT AS CSV</Text>
      <View style={styles.section}>
        <Text style={styles.sectionSub}>
          CSV files open in Excel, Google Sheets, or Numbers. Good for checking your numbers on a computer.
        </Text>

        {CSV_EXPORTS.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.exportRow, index === CSV_EXPORTS.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => run(item.label, item.action)}
            disabled={loading !== null}
            activeOpacity={0.7}
          >
            <View style={[styles.exportIconWrap, { backgroundColor: item.color + '18' }]}>
              {loading === item.label ? (
                <ActivityIndicator color={item.color} size="small" />
              ) : (
                <Ionicons name={item.icon} size={20} color={item.color} />
              )}
            </View>
            <View style={styles.exportMiddle}>
              <Text style={styles.exportLabel}>{item.label}</Text>
              <Text style={styles.exportDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textHint} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoTitleRow}>
          <Ionicons name="lock-closed-outline" size={16} color={C.primary} />
          <Text style={styles.infoTitle}>How this works</Text>
        </View>
        {[
          'Nothing is sent to the internet. Everything stays on your phone.',
          "When you tap Export, your phone's share sheet opens. You can email the file to yourself, save it to Google Drive, or send it anywhere.",
          'To restore a backup, tap "Restore from Backup" and choose the .json file you saved earlier.',
        ].map((tip) => (
          <View key={tip} style={styles.infoRow}>
            <View style={styles.infoDot} />
            <Text style={styles.infoText}>{tip}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:      { flex: 1, backgroundColor: C.bg },
    content:        { paddingHorizontal: Spacing.md },

    backRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: 4 },
    backText:       { ...Typography.small, color: C.textSecondary },

    title:          { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.xs },
    subtitle:       { ...Typography.small, color: C.textSecondary, lineHeight: 22, marginBottom: Spacing.lg },

    sectionLabel:   { ...Typography.caption, color: C.textHint, textTransform: 'uppercase', marginBottom: Spacing.xs, marginLeft: 4 },
    section: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border,
    },
    sectionSub:     { ...Typography.caption, color: C.textSecondary, lineHeight: 20, marginBottom: Spacing.md },

    backupBtn: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.primary, borderRadius: Radius.md,
      padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    },
    importBtn: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bg, borderRadius: Radius.md,
      padding: Spacing.md, borderWidth: 1, borderColor: C.primary + '50', gap: Spacing.sm,
    },
    backupIconWrap: {
      width: 40, height: 40, borderRadius: Radius.sm,
      backgroundColor: C.white + '26',
      alignItems: 'center', justifyContent: 'center',
    },
    backupMiddle:   { flex: 1 },
    backupLabel:    { ...Typography.bodyBold, color: C.textOnPrimary },
    importLabel:    { ...Typography.bodyBold, color: C.primary },
    backupDesc:     { ...Typography.caption, color: C.glassText, marginTop: 2 },

    exportRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: Spacing.sm,
    },
    exportIconWrap: { width: 42, height: 42, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    exportMiddle:   { flex: 1 },
    exportLabel:    { ...Typography.bodyBold, color: C.textPrimary },
    exportDesc:     { ...Typography.caption, color: C.textSecondary, marginTop: 2 },

    infoCard: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: C.border,
    },
    infoTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
    infoTitle:      { ...Typography.bodyBold, color: C.textPrimary },
    infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    infoDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginTop: 7 },
    infoText:       { ...Typography.small, color: C.textSecondary, flex: 1, lineHeight: 22 },

    closeBtn:       { backgroundColor: C.bgCard, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    closeBtnText:   { ...Typography.body, color: C.textSecondary },
  });
}
