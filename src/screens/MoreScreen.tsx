import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface ToolItem {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'goals' | 'primary' | 'subs' | 'debt' | 'income' | 'bills' | 'primaryLight' | 'textSecondary' | 'spending';
  screen: string;
  params?: object;
}

const TOOLS: ToolItem[] = [
  { label: 'Profile',             description: 'Photo, name, data & privacy',        icon: 'person-circle-outline',    colorKey: 'primary',       screen: 'Profile' },
  { label: 'Spending',            description: 'Your expense history',               icon: 'receipt-outline',          colorKey: 'spending',      screen: 'Spending' },
  { label: 'Income',              description: 'Money coming in',                    icon: 'arrow-down-circle-outline', colorKey: 'income',       screen: 'Incomes' },
  { label: 'Savings Goals',       description: "Track what you're saving for",     icon: 'flag-outline',             colorKey: 'goals',         screen: 'Goals' },
  { label: 'Bills & Subscriptions', description: "Recurring bills and charges",       icon: 'card-outline',             colorKey: 'bills',         screen: 'Bills' },
  { label: 'Debt Tracker',        description: 'Pay it down, one step at a time',    icon: 'trending-down-outline',    colorKey: 'debt',          screen: 'Debt' },
  { label: 'Add Expense',         description: 'Record a new expense',               icon: 'arrow-up-circle-outline',  colorKey: 'spending',      screen: 'AddExpense' },
  { label: 'Add Bill',            description: 'Track a new recurring bill',         icon: 'add-circle-outline',       colorKey: 'bills',         screen: 'Bills',   params: { autoOpen: true } },
  { label: 'Add Goal',            description: 'Start saving for something',         icon: 'add-circle-outline',       colorKey: 'goals',         screen: 'Goals',  params: { autoOpen: true } },
  { label: 'Weekly Check-In',     description: 'How did this week go?',              icon: 'checkmark-circle-outline', colorKey: 'income',        screen: 'WeeklyCheckIn' },
  { label: 'Monthly Breakdown',   description: 'See your spending by category',      icon: 'bar-chart-outline',        colorKey: 'bills',         screen: 'MonthlyBreakdown' },
  { label: 'Calendar',            description: 'See your month at a glance',         icon: 'calendar-outline',         colorKey: 'primary',       screen: 'Calendar' },
  { label: 'Payday',              description: 'Plan around your next paycheck',     icon: 'cash-outline',             colorKey: 'income',        screen: 'Payday' },
  { label: 'Currency Calculator', description: 'Convert money, works offline',       icon: 'swap-horizontal-outline',  colorKey: 'primaryLight',  screen: 'Currency' },
  { label: 'Export & Backup',     description: 'Save or share your data',            icon: 'cloud-download-outline',   colorKey: 'textSecondary', screen: 'Export' },
  { label: 'Share PeggyBank',     description: 'Tell a friend about the app',        icon: 'share-social-outline',     colorKey: 'income',        screen: 'Share' },
  { label: 'Settings',            description: 'Preferences, backup, and about',     icon: 'settings-outline',         colorKey: 'textSecondary', screen: 'Settings' },
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
              <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                <Ionicons name={item.icon} size={24} color={color} />
              </View>
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
