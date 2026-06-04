import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency } from '../utils/helpers';
import { CATEGORIES } from '../data/categories';
import { Category, Bill } from '../types';
import { Spacing, Radius, Typography, Shadow, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface WeekData {
  thisWeekTotal: number;
  lastWeekTotal: number;
  monthIncome: number;
  monthSpending: number;
  topCategory: { category: string; total: number } | null;
  upcomingBills: Bill[];
  paidBillsCount: number;
  totalBillsCount: number;
  daysLeftInMonth: number;
  safeToSpend: number;
}

type MoodOption = 'comfortable' | 'okay' | 'stressful' | 'overwhelming';
type SurpriseOption = 'none' | 'small' | 'large';

interface MoodItem {
  key: MoodOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'income' | 'goals' | 'bills' | 'subs';
}

interface SurpriseItem {
  key: SurpriseOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MOOD_OPTIONS: MoodItem[] = [
  { key: 'comfortable', label: 'Comfortable', icon: 'sunny-outline',       colorKey: 'income' },
  { key: 'okay',        label: 'Okay',        icon: 'partly-sunny-outline', colorKey: 'goals' },
  { key: 'stressful',   label: 'Stressful',   icon: 'cloud-outline',        colorKey: 'bills' },
  { key: 'overwhelming',label: 'A lot',       icon: 'rainy-outline',        colorKey: 'subs' },
];

const SURPRISE_OPTIONS: SurpriseItem[] = [
  { key: 'none',  label: 'No surprises',           icon: 'checkmark-circle-outline' },
  { key: 'small', label: 'Small extra expense',     icon: 'remove-circle-outline' },
  { key: 'large', label: 'Large unexpected cost',   icon: 'alert-circle-outline' },
];

function getWeekBounds(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay() + offsetWeeks * 7);
  startOfThisWeek.setHours(0, 0, 0, 0);
  const end = new Date(startOfThisWeek);
  end.setDate(startOfThisWeek.getDate() + 6);
  return {
    start: startOfThisWeek.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function encouragementMessage(data: WeekData): string {
  const { thisWeekTotal, lastWeekTotal, monthIncome, monthSpending, safeToSpend } = data;
  if (monthIncome === 0) return "Add some income to see how your week is tracking.";
  const monthRatio = monthSpending / monthIncome;
  const weekDiff = thisWeekTotal - lastWeekTotal;
  const weekDiffPct = lastWeekTotal > 0 ? weekDiff / lastWeekTotal : 0;
  if (safeToSpend > monthIncome * 0.25) return "You have a comfortable cushion this week. Well done.";
  if (weekDiffPct < -0.15) return "You spent less than last week. Small progress is still real progress.";
  if (weekDiffPct > 0.3 && monthRatio > 0.85) return "This week stretched a little further than usual. That happens — you're still aware of it.";
  if (monthRatio < 0.6) return "You've stayed well within your budget so far this month.";
  if (monthRatio < 0.8) return "Your spending has been steady and reasonable this month.";
  if (data.paidBillsCount === data.totalBillsCount && data.totalBillsCount > 0) return "All your bills are taken care of. That's the most important thing.";
  return "You showed up this week. That's what matters most.";
}

function weekCompareText(data: WeekData, C: ColorPalette): { text: string; color: string; icon: keyof typeof Ionicons.glyphMap } | null {
  if (data.lastWeekTotal === 0) return null;
  const diff = data.thisWeekTotal - data.lastWeekTotal;
  const pct = Math.abs(Math.round((diff / data.lastWeekTotal) * 100));
  if (Math.abs(diff) < 2) return { text: 'About the same as last week', color: C.textSecondary, icon: 'remove-outline' };
  if (diff < 0) return { text: `${pct}% less than last week`, color: C.income, icon: 'trending-down-outline' };
  return { text: `${pct}% more than last week`, color: C.bills, icon: 'trending-up-outline' };
}

function buildInsights(data: WeekData, C: ColorPalette): { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }[] {
  const insights: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }[] = [];
  if (data.paidBillsCount > 0 && data.paidBillsCount === data.totalBillsCount) {
    insights.push({ icon: 'checkmark-circle-outline', color: C.income, text: 'All bills are paid this cycle.' });
  } else if (data.paidBillsCount > 0) {
    insights.push({ icon: 'time-outline', color: C.bills, text: `${data.paidBillsCount} of ${data.totalBillsCount} bills paid so far.` });
  }
  if (data.topCategory) {
    const info = CATEGORIES[data.topCategory.category as Category] ?? CATEGORIES.other;
    insights.push({ icon: info.icon, color: info.color, text: `Most spending went to ${info.label.toLowerCase()} this week.` });
  }
  if (data.lastWeekTotal > 0) {
    const diff = data.thisWeekTotal - data.lastWeekTotal;
    if (diff < 0) {
      insights.push({ icon: 'leaf-outline', color: C.goals, text: `You spent ${formatCurrency(Math.abs(diff))} less than last week.` });
    }
  }
  if (data.daysLeftInMonth <= 7 && data.safeToSpend > 0) {
    insights.push({ icon: 'calendar-outline', color: C.primaryLight, text: `${data.daysLeftInMonth} days left in the month. You still have room.` });
  }
  return insights.slice(0, 3);
}

function buildSuggestion(data: WeekData): string | null {
  if (data.monthIncome === 0) return null;
  const safeExtra = data.safeToSpend;
  if (safeExtra > 30) {
    const saveAmt = Math.round(Math.min(safeExtra * 0.2, 50));
    return `You may have room to set aside an extra ${formatCurrency(saveAmt)} toward savings this week.`;
  }
  if (data.thisWeekTotal > data.lastWeekTotal * 1.3 && data.lastWeekTotal > 0) {
    return "Reviewing your subscriptions could help free up a little extra room.";
  }
  if (data.upcomingBills.length > 0) {
    return `${data.upcomingBills[0].name} is coming up soon. Worth keeping in mind.`;
  }
  return null;
}

export default function WeeklyCheckInScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [data, setData] = useState<WeekData | null>(null);
  const [mood, setMood] = useState<MoodOption | null>(null);
  const [surprise, setSurprise] = useState<SurpriseOption | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const thisWeek = getWeekBounds(0);
      const lastWeek = getWeekBounds(-1);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const [
        thisWeekResult, lastWeekResult, topCatResult,
        monthSpendResult, monthIncomeResult, billsResult,
      ] = await Promise.all([
        db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date>=? AND date<=?`, [thisWeek.start, thisWeek.end]),
        db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date>=? AND date<=?`, [lastWeek.start, lastWeek.end]),
        db.getFirstAsync<{ category: string; total: number }>(`SELECT category, SUM(amount) as total FROM expenses WHERE date>=? AND date<=? GROUP BY category ORDER BY total DESC LIMIT 1`, [thisWeek.start, thisWeek.end]),
        db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date>=? AND date<=?`, [monthStart, monthEnd]),
        db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM income WHERE date>=? AND date<=?`, [monthStart, monthEnd]),
        db.getAllAsync<Bill>(`SELECT * FROM bills ORDER BY due_day ASC`),
      ]);

      const monthIncome = monthIncomeResult?.total ?? 0;
      const monthSpending = monthSpendResult?.total ?? 0;
      const unpaidBillsTotal = billsResult.filter(b => !b.is_paid).reduce((s, b) => s + b.amount, 0);
      const safeToSpend = Math.max(0, monthIncome - monthSpending - unpaidBillsTotal);
      const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

      setData({
        thisWeekTotal: thisWeekResult?.total ?? 0,
        lastWeekTotal: lastWeekResult?.total ?? 0,
        monthIncome,
        monthSpending,
        topCategory: topCatResult ?? null,
        upcomingBills: billsResult.filter(b => !b.is_paid).slice(0, 2),
        paidBillsCount: billsResult.filter(b => b.is_paid).length,
        totalBillsCount: billsResult.length,
        daysLeftInMonth,
        safeToSpend,
      });
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const compare = data ? weekCompareText(data, C) : null;
  const insights = data ? buildInsights(data, C) : [];
  const suggestion = data ? buildSuggestion(data) : null;
  const message = data ? encouragementMessage(data) : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Weekly Check-In</Text>
      <Text style={styles.subtitle}>A gentle look at your week.</Text>

      <View style={styles.mainCard}>
        <View style={styles.mainCardHighlight} />
        <Text style={styles.mainCardLabel}>Spent this week</Text>
        <Text style={styles.mainCardAmount}>{formatCurrency(data?.thisWeekTotal ?? 0)}</Text>

        {compare && (
          <View style={styles.compareRow}>
            <Ionicons name={compare.icon} size={15} color={compare.color} />
            <Text style={[styles.compareText, { color: compare.color }]}>{compare.text}</Text>
          </View>
        )}

        <View style={styles.mainCardDivider} />

        <View style={styles.mainCardEncouragement}>
          <Ionicons name="heart-outline" size={16} color={C.glassText} style={{ marginTop: 1 }} />
          <Text style={styles.mainCardMessage}>{message}</Text>
        </View>
      </View>

      {(data?.monthIncome ?? 0) > 0 && (
        <View style={styles.safeRow}>
          <View style={styles.safeCell}>
            <Text style={styles.safeCellLabel}>Income this month</Text>
            <Text style={[styles.safeCellValue, { color: C.income }]}>
              {formatCurrency(data?.monthIncome ?? 0)}
            </Text>
          </View>
          <View style={styles.safeDivider} />
          <View style={styles.safeCell}>
            <Text style={styles.safeCellLabel}>Safe to spend</Text>
            <Text style={[styles.safeCellValue, { color: data && data.safeToSpend > 0 ? C.goals : C.bills }]}>
              {formatCurrency(data?.safeToSpend ?? 0)}
            </Text>
          </View>
          <View style={styles.safeDivider} />
          <View style={styles.safeCell}>
            <Text style={styles.safeCellLabel}>Days left</Text>
            <Text style={styles.safeCellValue}>{data?.daysLeftInMonth ?? 0}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>How did money feel this week?</Text>
      <View style={styles.moodRow}>
        {MOOD_OPTIONS.map((option) => {
          const active = mood === option.key;
          const color = C[option.colorKey];
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.moodPill,
                active && { backgroundColor: color + '20', borderColor: color },
              ]}
              onPress={() => setMood(active ? null : option.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={option.icon} size={18} color={active ? color : C.textHint} />
              <Text style={[styles.moodLabel, active && { color }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Did anything unexpected come up?</Text>
      <View style={styles.surpriseRow}>
        {SURPRISE_OPTIONS.map((option) => {
          const active = surprise === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.surprisePill, active && styles.surprisePillActive]}
              onPress={() => setSurprise(active ? null : option.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={option.icon} size={16} color={active ? C.primary : C.textHint} />
              <Text style={[styles.surpriseLabel, active && { color: C.primary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {insights.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>A few things worth knowing</Text>
          {insights.map((insight, i) => (
            <View key={i} style={[styles.insightCard, { borderLeftColor: insight.color }]}>
              <View style={[styles.insightIcon, { backgroundColor: insight.color + '18' }]}>
                <Ionicons name={insight.icon} size={18} color={insight.color} />
              </View>
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </>
      )}

      {suggestion && (
        <>
          <Text style={styles.sectionTitle}>One gentle idea</Text>
          <View style={styles.suggestionCard}>
            <Ionicons name="bulb-outline" size={20} color={C.primary} style={{ marginTop: 1 }} />
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        </>
      )}

      {data && data.monthIncome === 0 && data.thisWeekTotal === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="leaf-outline" size={28} color={C.textHint} />
          <Text style={styles.emptyTitle}>Nothing recorded yet</Text>
          <Text style={styles.emptyText}>
            Add some income or expenses and come back here to see how your week is going.
          </Text>
        </View>
      )}

      <View style={styles.bottomLinks}>
        <TouchableOpacity
          style={styles.bottomLinkBtn}
          onPress={() => navigation.navigate('MonthlyBreakdown')}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart-outline" size={18} color={C.primary} />
          <Text style={styles.bottomLinkText}>Monthly Breakdown</Text>
          <Ionicons name="chevron-forward" size={16} color={C.textHint} />
        </TouchableOpacity>

        <View style={styles.bottomLinkDivider} />

        <TouchableOpacity
          style={styles.bottomLinkBtn}
          onPress={() => navigation.navigate('Home', { screen: 'Spending' })}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={18} color={C.primary} />
          <Text style={styles.bottomLinkText}>View Spending</Text>
          <Ionicons name="chevron-forward" size={16} color={C.textHint} />
        </TouchableOpacity>
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

    title:        { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.xs },
    subtitle:     { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.lg },

    mainCard: {
      backgroundColor: C.glassBase,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      overflow: 'hidden',
      ...Shadow.glow,
    },
    mainCardHighlight: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 70,
      backgroundColor: C.glassHighlight,
      borderRadius: Radius.xl,
    },
    mainCardLabel:    { ...Typography.small, color: C.glassText, marginBottom: Spacing.xs },
    mainCardAmount:   { ...Typography.hero, color: C.glassBright, marginBottom: Spacing.xs },
    compareRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
    compareText:      { ...Typography.smallBold },
    mainCardDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: Spacing.md },
    mainCardEncouragement: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    mainCardMessage:  { ...Typography.small, color: C.glassBright, flex: 1, lineHeight: 22, fontStyle: 'italic' },

    safeRow: {
      flexDirection: 'row',
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
      marginBottom: Spacing.lg,
      overflow: 'hidden',
    },
    safeCell:         { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 5 },
    safeDivider:      { width: 1, backgroundColor: C.border, marginVertical: Spacing.sm },
    safeCellLabel:    { ...Typography.caption, color: C.textSecondary },
    safeCellValue:    { ...Typography.bodyBold, color: C.textPrimary, fontSize: 17 },

    sectionTitle: {
      ...Typography.label,
      color: C.textHint,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: Spacing.sm,
    },

    moodRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg },
    moodPill: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: C.bgCard,
      borderRadius: Radius.full,
      paddingHorizontal: 16, paddingVertical: 10,
      borderWidth: 1.5, borderColor: C.border,
    },
    moodLabel:  { ...Typography.smallBold, color: C.textHint },

    surpriseRow:       { flexDirection: 'column', gap: 8, marginBottom: Spacing.lg },
    surprisePill: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: C.bgCard,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md, paddingVertical: 14,
      borderWidth: 1.5, borderColor: C.border,
    },
    surprisePillActive: { borderColor: C.primary, backgroundColor: C.primary + '10' },
    surpriseLabel:     { ...Typography.body, color: C.textSecondary },

    insightCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 4,
      padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    },
    insightIcon:  { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    insightText:  { ...Typography.small, color: C.textPrimary, flex: 1, lineHeight: 22 },

    suggestionCard: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.primary + '40',
      padding: Spacing.md, gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    suggestionText: { ...Typography.small, color: C.textPrimary, flex: 1, lineHeight: 22 },

    emptyCard: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    emptyTitle:   { ...Typography.bodyBold, color: C.textPrimary },
    emptyText:    { ...Typography.small, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },

    bottomLinks: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      overflow: 'hidden',
    },
    bottomLinkBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.md, paddingVertical: 18,
    },
    bottomLinkDivider: { height: 1, backgroundColor: C.border, marginHorizontal: Spacing.md },
    bottomLinkText:    { ...Typography.bodyBold, color: C.textPrimary, flex: 1 },
  });
}
