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

const TOOLS: ToolItem[] = [
  { label: 'Profile',             description: 'Photo, name, data & privacy',        iconKey: 'profile',               colorKey: 'primary',       screen: 'Profile' },
  { label: 'Spending',            description: 'Your expense history',               iconKey: 'food',                  colorKey: 'spending',      screen: 'Spending' },
  { label: 'Income',              description: 'Money coming in',                    iconKey: 'investing',             colorKey: 'income',        screen: 'Incomes' },
  { label: 'Savings Goals',       description: "Track what you're saving for",     iconKey: 'travel',                colorKey: 'goals',         screen: 'Goals' },
  { label: 'Bills & Subscriptions', description: "Recurring bills and charges",       iconKey: 'home',                  colorKey: 'bills',         screen: 'Bills' },
  { label: 'Debt Tracker',        description: 'Pay it down, one step at a time',    iconKey: 'debt',                  colorKey: 'debt',          screen: 'Debt' },
  { label: 'Add Expense',         description: 'Record a new expense',               iconKey: 'food',                  colorKey: 'spending',      screen: 'AddExpense' },
  { label: 'Add Bill',            description: 'Track a new recurring bill',         iconKey: 'home',                  colorKey: 'bills',         screen: 'Bills',   params: { autoOpen: true } },
  { label: 'Add Goal',            description: 'Start saving for something',         iconKey: 'gifts',                 colorKey: 'goals',         screen: 'Goals',  params: { autoOpen: true } },
  { label: 'Weekly Check-In',     description: 'How did this week go?',              icon: 'checkmark-circle-outline', colorKey: 'income',        screen: 'WeeklyCheckIn' },
  { label: 'Monthly Breakdown',   description: 'See your spending by category',      iconKey: 'reports',               colorKey: 'bills',         screen: 'MonthlyBreakdown' },
  { label: 'Calendar',            description: 'See your month at a glance',         iconKey: 'calendar',              colorKey: 'primary',       screen: 'Calendar' },
  { label: 'Payday',              description: 'Plan around your next paycheck',     iconKey: 'investing',             colorKey: 'income',        screen: 'Payday' },
  { label: 'Currency Calculator', description: 'Convert money, works offline',       icon: 'swap-horizontal-outline',  colorKey: 'primaryLight',  screen: 'Currency' },
  { label: 'Export & Backup',     description: 'Save or share your data',            icon: 'cloud-download-outline',   colorKey: 'textSecondary', screen: 'Export' },
  { label: 'Share PeggyBank',     description: 'Tell a friend about the app',        icon: 'share-social-outline',     colorKey: 'income',        screen: 'Share' },
  { label: 'Settings',            description: 'Preferences, backup, and about',     icon: 'settings-outline',         colorKey: 'textSecondary', screen: 'Settings' },
  { label: 'Design System (dev)', description: 'Component gallery — internal',        icon: 'color-palette-outline',    colorKey: 'primary',       screen: 'ComponentShowcase' },
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
                <PeggyIconFrame iconKey={item.iconKey} size={48} shape="tile" style={styles.iconSlot} />
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
