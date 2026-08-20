import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useColors, AppearanceMode } from '../context/ThemeContext';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { PeggyScreen, PeggyHeader } from '../components/peggy';

interface Option {
  mode:  AppearanceMode;
  label: string;
  sub:   string;
  icon:  keyof typeof Ionicons.glyphMap;
}

const OPTIONS: Option[] = [
  { mode: 'light',  label: 'Light',        sub: 'Warm off-white — easy on the eyes in daylight', icon: 'sunny-outline' },
  { mode: 'dark',   label: 'Dark',         sub: 'Warm slate — calm and easy at night',            icon: 'moon-outline' },
  { mode: 'system', label: 'Follow Device', sub: 'Matches your phone\'s current setting',         icon: 'phone-portrait-outline' },
];

export default function AppearanceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useTheme();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <PeggyScreen>
      <PeggyHeader title="Appearance" onBack={() => navigation.goBack()} />

      
      <Text style={styles.subtitle}>
        Choose how PeggyBank looks. Both modes are designed to feel calm and easy to read.
      </Text>

      <View style={[styles.card, { backgroundColor: C.bgCard }]}>
        {OPTIONS.map((opt, i) => {
          const active = mode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[
                styles.row,
                i === 0 && styles.rowFirst,
                { borderTopColor: C.border },
                active && { backgroundColor: C.primaryGlow },
              ]}
              onPress={() => setMode(opt.mode)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, { backgroundColor: active ? C.primary + '20' : C.bgElevated }]}>
                <Ionicons name={opt.icon} size={20} color={active ? C.primary : C.textSecondary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{opt.label}</Text>
                <Text style={styles.rowSub}>{opt.sub}</Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={C.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.noteCard, { backgroundColor: C.primaryGlow }]}>
        <Ionicons name="information-circle-outline" size={16} color={C.primary} />
        <Text style={styles.noteText}>
          Your choice is saved on this phone and never shared.
        </Text>
      </View>
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({

    backRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.lg },
    backText:  { ...Typography.small, color: C.textSecondary },
    title:     { ...Typography.h1, color: C.textPrimary, marginBottom: 6 },
    subtitle:  { ...Typography.small, color: C.textSecondary, lineHeight: 22, marginBottom: Spacing.lg },

    card: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.md, paddingVertical: 14,
      borderTopWidth: 1, gap: Spacing.sm,
    },
    rowFirst:  { borderTopWidth: 0 },
    iconWrap:  { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    rowText:   { flex: 1 },
    rowLabel:  { ...Typography.bodyBold, color: C.textPrimary },
    rowSub:    { ...Typography.caption, color: C.textSecondary, marginTop: 2 },

    noteCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderRadius: Radius.md, borderWidth: 1, borderColor: C.borderLight,
      padding: Spacing.md,
    },
    noteText: { ...Typography.small, color: C.textSecondary, flex: 1, lineHeight: 22 },
  });
}
