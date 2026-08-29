import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { PeggyScreen } from '../components/peggy';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import { IconKey } from '../data/iconRegistry';
import PeggyCard from '../components/peggy/PeggyCard';

/**
 * MoreScreen — reproduces the approved visual spec. Content tools carry their
 * matte concept icon (via the registry → PeggyIconFrame); system/chrome tools
 * use a single consistent line-icon treatment. One card, one grid, one rhythm.
 */

interface ToolItem {
  label: string;
  description: string;
  iconKey: IconKey;                                // matte concept art, always from the registry
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
  { label: 'Spending',            description: 'Your expense history',               iconKey: 'spent',                 colorKey: 'spending',      screen: 'Spending' },
  { label: 'Income',              description: 'Money coming in',                    iconKey: 'income',                colorKey: 'income',        screen: 'Incomes' },
  { label: 'Bills & Subscriptions', description: 'Recurring bills and charges',      iconKey: 'bills',                 colorKey: 'bills',         screen: 'Bills' },
  { label: 'Debt Tracker',        description: 'Pay it down, one step at a time',    iconKey: 'debt',                  colorKey: 'debt',          screen: 'Debt' },
  // ── Saving & planning ──
  { label: 'Savings Goals',       description: "Track what you're saving for",     iconKey: 'goals',                 colorKey: 'goals',         screen: 'Goals' },
  // ── Insights ──
  { label: 'What Happened',       description: 'Every payment, newest first',        iconKey: 'check-in',              colorKey: 'primary',       screen: 'Activity' },
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
    <PeggyScreen>
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>All your tools, in one calm place.</Text>

      <View style={styles.grid}>
        {TOOLS.map((item) => {
          return (
            <PeggyCard
              key={item.label}
              style={styles.card}
              onPress={() => navigation.navigate(item.screen, item.params)}
            >
              <PeggyIconFrame iconKey={item.iconKey} size="card" shape="tile" style={styles.iconSlot} />
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </PeggyCard>
          );
        })}
      </View>
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    content:    { padding: Spacing.md, paddingTop: 56, paddingBottom: 60 },
    title:      { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.xs },
    subtitle:   { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.lg },
    grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    // PeggyCard owns the surface, radius, padding and shadow.
    // Only the two-column grid width is this screen's own business.
    card: {
      width: '47%',
    },
    iconSlot: { marginBottom: Spacing.sm },
    cardLabel: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 4 },
    cardDesc:  { ...Typography.caption, color: C.textSecondary, lineHeight: 16 },
  });
}
