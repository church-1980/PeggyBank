import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import { IconKey } from '../data/iconRegistry';

/**
 * MoreScreen — reproduces the approved visual spec. Content tools carry their
 * matte concept icon (via the registry → PeggyIconFrame); system/chrome tools
 * use a single consistent line-icon treatment. One card, one grid, one rhythm.
 */

interface ToolItem {
  label: string;
  description: string;
  iconKey?: IconKey;                               // matte concept art (content tools)
  icon?: keyof typeof Ionicons.glyphMap;           // line affordance (system/chrome tools)
  colorKey: 'goals' | 'primary' | 'subs' | 'debt' | 'income' | 'bills' | 'primaryLight' | 'textSecondary' | 'spending';
  screen: string;
  params?: object;
}

// One destination per row. Actions that already exist inside a screen (add a
// bill/goal/expense) or inside Settings (Export & Backup, Share) do NOT get a
// duplicate tile here. Ordered by purpose: money → planning → insights → tools →
// account.
const TOOLS: ToolItem[] = [
  // ── Money in & out ──
  { label: 'Spending',            description: 'Your expense history',               iconKey: 'food',                  colorKey: 'spending',      screen: 'Spending' },
  { label: 'Income',              description: 'Money coming in',                    iconKey: 'investing',             colorKey: 'income',        screen: 'Incomes' },
  { label: 'Bills & Subscriptions', description: 'Recurring bills and charges',      iconKey: 'home',                  colorKey: 'bills',         screen: 'Bills' },
  { label: 'Debt Tracker',        description: 'Pay it down, one step at a time',    iconKey: 'debt',                  colorKey: 'debt',          screen: 'Debt' },
  // ── Saving & planning ──
  { label: 'Savings Goals',       description: "Track what you're saving for",     iconKey: 'travel',                colorKey: 'goals',         screen: 'Goals' },
  { label: 'Payday',              description: 'Plan around your next paycheck',     iconKey: 'investing',             colorKey: 'income',        screen: 'Payday' },
  { label: 'Weekly Check-In',     description: 'How did this week go?',              iconKey: 'check-in',              colorKey: 'income',        screen: 'WeeklyCheckIn' },
  // ── Insights ──
  { label: 'Monthly Breakdown',   description: 'See your spending by category',      iconKey: 'reports',               colorKey: 'bills',         screen: 'MonthlyBreakdown' },
  { label: 'Calendar',            description: 'See your month at a glance',         iconKey: 'calendar',              colorKey: 'primary',       screen: 'Calendar' },
  // ── Tools ──
  { label: 'Currency Calculator', description: 'Convert money, works offline',       iconKey: 'currency',              colorKey: 'primaryLight',  screen: 'Currency' },
  // ── Account ──
  { label: 'Profile',             description: 'Photo, name, data & privacy',        iconKey: 'profile',               colorKey: 'primary',       screen: 'Profile' },
  { label: 'Settings',            description: 'Preferences, export, share & about', iconKey: 'settings',              colorKey: 'textSecondary', screen: 'Settings' },
];

export default function MoreScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>All your tools, in one calm place.</Text>

      <View style={styles.grid}>
        {TOOLS.map((item) => {
          const color = C[item.colorKey];
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.card}
              onPress={() => navigation.navigate(item.screen, item.params)}
              activeOpacity={0.7}
            >
              {item.iconKey ? (
                <PeggyIconFrame iconKey={item.iconKey} size="card" shape="tile" style={styles.iconSlot} />
              ) : (
                <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                  <Ionicons name={item.icon!} size={24} color={color} />
                </View>
              )}
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    content:    { padding: Spacing.md, paddingTop: 56, paddingBottom: 60 },
    title:      { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.xs },
    subtitle:   { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.lg },
    grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: {
      width: '47%',
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
    },
    iconSlot: { marginBottom: Spacing.sm },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    cardLabel: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 4 },
    cardDesc:  { ...Typography.caption, color: C.textSecondary, lineHeight: 16 },
  });
}
