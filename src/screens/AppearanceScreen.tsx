import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useColors, AppearanceMode } from '../context/ThemeContext';
import { Spacing, Radius, Typography } from '../theme';

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
        <Text style={[styles.backText, { color: C.textSecondary }]}>Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: C.textPrimary }]}>Appearance</Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        Choose how PeggyBank looks. Both modes are designed to feel calm and easy to read.
      </Text>

      <View style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
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
                <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{opt.label}</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>{opt.sub}</Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={C.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.noteCard, { backgroundColor: C.primaryGlow, borderColor: C.borderLight }]}>
        <Ionicons name="information-circle-outline" size={16} color={C.primary} />
        <Text style={[styles.noteText, { color: C.textSecondary }]}>
          Your choice is saved on this phone and never shared.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingHorizontal: Spacing.md },

  backRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.lg },
  backText:  { ...Typography.small },
  title:     { ...Typography.h1, marginBottom: 6 },
  subtitle:  { ...Typography.small, lineHeight: 22, marginBottom: Spacing.lg },

  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
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
  rowLabel:  { ...Typography.bodyBold },
  rowSub:    { ...Typography.caption, marginTop: 2 },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md,
  },
  noteText: { ...Typography.small, flex: 1, lineHeight: 22 },
});
