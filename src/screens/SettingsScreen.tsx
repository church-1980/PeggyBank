import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import {
  NotificationMode,
  getNotificationMode,
  saveNotificationMode,
  requestNotificationPermissions,
  rescheduleAll,
} from '../lib/notifications';

const APP_VERSION = '1.0.0';

interface RowItem {
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColorKey: keyof ColorPalette;
  screen: string;
}

const APP_ROWS: RowItem[] = [
  {
    label: 'Appearance',
    sub: 'Light, dark, or follow your device setting',
    icon: 'contrast-outline',
    iconColorKey: 'primary',
    screen: 'Appearance',
  },
  {
    label: 'Export & Backup',
    sub: 'Save or share a copy of your data',
    icon: 'cloud-download-outline',
    iconColorKey: 'textSecondary',
    screen: 'Export',
  },
];

const SHARE_ROWS: RowItem[] = [
  {
    label: 'Share with a Friend',
    sub: 'Let someone know about PeggyBank',
    icon: 'share-social-outline',
    iconColorKey: 'income',
    screen: 'Share',
  },
];

const MODE_LABELS: Record<NotificationMode, string> = {
  off:      'Off',
  minimal:  'Minimal',
  standard: 'Standard',
  detailed: 'Detailed',
};

const MODE_DESCRIPTIONS: Record<NotificationMode, string> = {
  off:      'No notifications',
  minimal:  'Bill reminders 2 days before due',
  standard: 'Bills, payday, and weekly check-in',
  detailed: 'Bills, payday, check-in, and mid-month',
};

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [notifMode, setNotifMode] = useState<NotificationMode>('minimal');

  useFocusEffect(useCallback(() => {
    getNotificationMode().then(setNotifMode);
  }, []));

  const handleNotifMode = () => {
    const options = (['off', 'minimal', 'standard', 'detailed'] as NotificationMode[]).map((m) => ({
      text: `${MODE_LABELS[m]}  —  ${MODE_DESCRIPTIONS[m]}`,
      onPress: async () => {
        if (m !== 'off') {
          const granted = await requestNotificationPermissions();
          if (!granted) {
            Alert.alert(
              'Notifications Blocked',
              'To receive reminders, allow notifications for PeggyBank in your device settings.',
            );
            return;
          }
        }
        await saveNotificationMode(m);
        await rescheduleAll(m);
        setNotifMode(m);
      },
    }));
    Alert.alert('Notification Level', 'Choose how often PeggyBank checks in with you.', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderRow = (item: RowItem, index: number, total: number) => {
    const iconColor = C[item.iconColorKey] as string;
    return (
      <TouchableOpacity
        key={item.label}
        style={[styles.row, index === 0 && styles.rowFirst, index === total - 1 && styles.rowLast]}
        onPress={() => navigation.navigate(item.screen)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={item.icon} size={20} color={iconColor} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowSub}>{item.sub}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textHint} />
      </TouchableOpacity>
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

      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>APP</Text>
      <View style={styles.section}>
        {APP_ROWS.map((item, i) => renderRow(item, i, APP_ROWS.length))}
      </View>

      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.section}>
        <TouchableOpacity style={[styles.row, styles.rowFirst, styles.rowLast]} onPress={handleNotifMode} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconWrap, { backgroundColor: C.primary + '18' }]}>
              <Ionicons name="notifications-outline" size={20} color={C.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Reminders</Text>
              <Text style={styles.rowSub}>{MODE_DESCRIPTIONS[notifMode]}</Text>
            </View>
          </View>
          <View style={styles.modeChip}>
            <Text style={styles.modeChipText}>{MODE_LABELS[notifMode]}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>SHARE</Text>
      <View style={styles.section}>
        {SHARE_ROWS.map((item, i) => renderRow(item, i, SHARE_ROWS.length))}
      </View>

      <View style={styles.aboutCard}>
        <View style={styles.aboutLogoRow}>
          <View style={styles.aboutLogoBox}>
            <Ionicons name="heart" size={28} color={C.primary} />
          </View>
          <View>
            <Text style={styles.aboutAppName}>PeggyBank</Text>
            <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
          </View>
        </View>

        <Text style={styles.aboutStory}>
          PeggyBank was created in memory of Peggy — a mother who taught her family
          that money doesn't have to be scary. Through everyday wisdom, quiet
          patience, and real care, she showed that financial peace is built one
          small, steady step at a time.
        </Text>

        <Text style={styles.aboutStory}>
          This app exists to make budgeting feel calmer, simpler, and more human —
          the way she always did.
        </Text>

        <View style={styles.divider} />

        <View style={styles.offlineRow}>
          <Ionicons name="lock-closed-outline" size={14} color={C.textHint} />
          <Text style={styles.philosophy}>
            Everything stays on your phone. No internet required. No accounts. No subscriptions.
            Your financial life is yours alone.
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.copyright}>© PeggyBank — All Rights Reserved</Text>
        <Text style={styles.legalNote}>
          This application, its branding, design, and source code are protected by copyright
          and intellectual property law. Unauthorized reproduction or distribution is prohibited.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    content:      { paddingHorizontal: Spacing.md },

    backRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: 4 },
    backText:     { ...Typography.small, color: C.textSecondary },
    title:        { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.lg },

    sectionLabel: {
      ...Typography.label,
      color: C.textHint,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: Spacing.sm,
      marginLeft: 4,
    },
    section: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    rowFirst:     { borderTopWidth: 0 },
    rowLast:      {},
    rowLeft:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    rowText:      { flex: 1 },
    iconWrap:     { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    rowLabel:     { ...Typography.bodyBold, color: C.textPrimary },
    rowSub:       { ...Typography.caption, color: C.textSecondary, marginTop: 2 },

    aboutCard: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    aboutLogoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
    aboutLogoBox: {
      width: 52,
      height: 52,
      borderRadius: Radius.md,
      backgroundColor: C.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aboutAppName: { ...Typography.h2, color: C.textPrimary },
    aboutVersion: { ...Typography.caption, color: C.textHint },
    aboutStory:   { ...Typography.small, color: C.textSecondary, lineHeight: 24, marginBottom: Spacing.md },
    divider:      { height: 1, backgroundColor: C.border, marginVertical: Spacing.md },
    offlineRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    philosophy:   { ...Typography.small, color: C.textSecondary, lineHeight: 22, fontStyle: 'italic', flex: 1 },
    copyright:    { ...Typography.smallBold, color: C.textSecondary, marginBottom: Spacing.xs },
    legalNote:    { ...Typography.caption, color: C.textHint, lineHeight: 18 },

    modeChip: {
      paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: Radius.full,
      backgroundColor: C.primary + '18',
      borderWidth: 1, borderColor: C.primary + '40',
    },
    modeChipText: { ...Typography.smallBold, color: C.primaryLight },
  });
}
