import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency, getMonthRange, getDaysUntil } from '../utils/helpers';
import { SavingsGoal, Bill } from '../types';
import { Spacing, Radius, Typography, Shadow, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import GoalProgressWidget from '../components/GoalProgressWidget';

interface MonthSummary {
  totalIncome: number;
  totalSpending: number;
  moneyLeft: number;
  safeToSpend: number;
}

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0, totalSpending: 0, moneyLeft: 0, safeToSpend: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [pinnedGoals, setPinnedGoals] = useState<SavingsGoal[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [nextPayday, setNextPayday] = useState('');

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const { start, end } = getMonthRange();

      const incomeResult = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE date >= ? AND date <= ?`,
        [start, end]
      );
      const expenseResult = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?`,
        [start, end]
      );

      const totalIncome = incomeResult?.total ?? 0;
      const totalSpending = expenseResult?.total ?? 0;

      const pinnedGoalsResult = await db.getAllAsync<SavingsGoal>(
        `SELECT * FROM savings_goals WHERE pinned = 1 ORDER BY created_at DESC LIMIT 1`
      );
      setPinnedGoals(pinnedGoalsResult);

      const bills = await db.getAllAsync<Bill>(`SELECT * FROM bills`);
      const unpaidBills = bills.filter((b) => !b.is_paid);
      const unpaidTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

      const goalsResult = await db.getAllAsync<SavingsGoal>(
        `SELECT * FROM savings_goals ORDER BY created_at DESC LIMIT 3`
      );
      const goalsSavingsNeeded = goalsResult.reduce((sum, g) => {
        return sum + Math.max(0, g.target_amount - g.current_amount) / 12;
      }, 0);

      const moneyLeft = totalIncome - totalSpending;
      const safeToSpend = Math.max(0, moneyLeft - unpaidTotal - goalsSavingsNeeded);

      setSummary({ totalIncome, totalSpending, moneyLeft, safeToSpend });

      const sortedBills = [...unpaidBills].sort(
        (a, b) => getDaysUntil(a.due_day ?? 1) - getDaysUntil(b.due_day ?? 1)
      );
      setUpcomingBills(sortedBills.slice(0, 2));

      const paydaySetting = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'payday'`
      );
      if (paydaySetting) {
        const pd = parseInt(paydaySetting.value, 10);
        const days = getDaysUntil(pd);
        if (days === 0) setNextPayday('Today is payday');
        else if (days === 1) setNextPayday('Payday is tomorrow');
        else setNextPayday(`Payday in ${days} days`);
      }

      if (safeToSpend > 50 && totalIncome > 0) {
        const extra = Math.round(safeToSpend * 0.2);
        if (goalsResult.length > 0) {
          setSuggestion(`You have some breathing room this month. Want to move ${formatCurrency(extra)} toward "${goalsResult[0].name}"?`);
        } else {
          setSuggestion('You have some breathing room this month. A small emergency fund could protect you.');
        }
      } else {
        setSuggestion('');
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>PeggyBank</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.safeCard}
          onPress={() => navigation.navigate('Payday')}
          activeOpacity={0.9}
        >
          <View style={styles.safeGlassHighlight} />
          <Text style={styles.safeLabel}>Safe to spend right now</Text>
          <Text style={styles.safeAmount}>{formatCurrency(summary.safeToSpend)}</Text>
          <Text style={styles.safeNote}>After bills, savings, and spending so far</Text>
          {nextPayday ? (
            <View style={styles.safePaydayRow}>
              <Ionicons name="calendar-outline" size={12} color={C.glassText} />
              <Text style={styles.safePaydayText}>{nextPayday}</Text>
            </View>
          ) : null}
          <View style={styles.safeMiniRow}>
            <TouchableOpacity style={styles.safeMiniCell} onPress={() => navigation.navigate('Incomes')} activeOpacity={0.7}>
              <Text style={styles.safeMiniLabel}>Income</Text>
              <Text style={styles.safeMiniVal}>{formatCurrency(summary.totalIncome)}</Text>
            </TouchableOpacity>
            <View style={styles.safeMiniDiv} />
            <View style={styles.safeMiniCell}>
              <Text style={styles.safeMiniLabel}>Spent</Text>
              <Text style={styles.safeMiniVal}>{formatCurrency(summary.totalSpending)}</Text>
            </View>
            <View style={styles.safeMiniDiv} />
            <View style={styles.safeMiniCell}>
              <Text style={styles.safeMiniLabel}>Available</Text>
              <Text style={styles.safeMiniVal}>{formatCurrency(summary.moneyLeft)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {suggestion ? (
          <View style={styles.suggestionCard}>
            <Ionicons name="bulb-outline" size={18} color={C.bills} style={{ marginTop: 1 }} />
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ) : null}

        {upcomingBills.length > 0 && (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Bills')} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Coming Up</Text>
              <View style={styles.seeAllRow}>
                <Text style={styles.seeAll}>See all</Text>
                <Ionicons name="chevron-forward" size={14} color={C.primary} />
              </View>
            </View>
            {upcomingBills.map((bill) => {
              const days = getDaysUntil(bill.due_day ?? 1);
              return (
                <View key={bill.id} style={styles.billRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDays}>
                      {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `In ${days} days`}
                    </Text>
                  </View>
                  <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                </View>
              );
            })}
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your Goals</Text>
            <TouchableOpacity style={styles.seeAllRow} onPress={() => navigation.navigate('Goals')}>
              <Text style={styles.seeAll}>See all</Text>
              <Ionicons name="chevron-forward" size={14} color={C.primary} />
            </TouchableOpacity>
          </View>
          {pinnedGoals.length > 0 ? (
            pinnedGoals.map(goal => (
              <GoalProgressWidget
                key={goal.id}
                goal={goal}
                onPress={() => navigation.navigate('Goals')}
                onUnpin={async () => {
                  setPinnedGoals([]);
                  const db = await getDatabase();
                  await db.runAsync(`UPDATE savings_goals SET pinned = 0 WHERE id = ?`, [goal.id!]);
                }}
              />
            ))
          ) : (
            <View style={styles.goalsEmpty}>
              <Ionicons name="flag-outline" size={28} color={C.textHint} />
              <View style={{ flex: 1 }}>
                <Text style={styles.goalsEmptyText}>No featured goal</Text>
                <Text style={styles.goalsEmptySub}>Pin a goal to track your progress here.</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Goals')} style={styles.goalsEmptyBtn}>
                <Text style={styles.goalsEmptyBtnText}>Browse</Text>
                <Ionicons name="chevron-forward" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: insets.bottom + 120 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.bg },
    container:  { flex: 1 },
    content:    { paddingBottom: 20 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    greeting:    { ...Typography.h1, color: C.textPrimary },
    date:        { ...Typography.small, color: C.textSecondary, marginTop: 4 },
    safePaydayRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: Spacing.sm },
    safePaydayText: { ...Typography.caption, color: C.glassText, fontWeight: '600' },
    settingsBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.bgCard,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },

    safeCard: {
      marginHorizontal: Spacing.md, marginBottom: Spacing.md,
      backgroundColor: C.glassBase, borderRadius: Radius.xl,
      padding: Spacing.lg, overflow: 'hidden',
      ...Shadow.glow,
    },
    safeGlassHighlight: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 60,
      backgroundColor: C.glassHighlight, borderRadius: Radius.xl,
    },
    safeLabel:   { ...Typography.small, color: C.glassText, marginBottom: Spacing.xs },
    safeAmount:  { ...Typography.hero, color: C.glassBright, marginBottom: Spacing.xs },
    safeNote:    { ...Typography.caption, color: C.glassText, marginBottom: Spacing.md },

    safeMiniRow: {
      flexDirection: 'row', marginTop: Spacing.md,
      borderTopWidth: 1, borderTopColor: C.glassHighlight, paddingTop: Spacing.sm,
    },
    safeMiniCell:  { flex: 1, alignItems: 'center', gap: 3 },
    safeMiniDiv:   { width: 1, backgroundColor: C.glassHighlight, marginVertical: 2 },
    safeMiniLabel: { ...Typography.caption, color: C.glassText },
    safeMiniVal:   { ...Typography.smallBold, color: C.glassBright, fontSize: 14 },

    suggestionCard: {
      marginHorizontal: Spacing.md, marginBottom: Spacing.md,
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start',
      gap: Spacing.sm, borderWidth: 1, borderColor: C.primary + '30',
    },
    suggestionText: { ...Typography.small, color: C.textSecondary, flex: 1, lineHeight: 22 },

    card: {
      marginHorizontal: Spacing.md, marginBottom: Spacing.md,
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, borderWidth: 1, borderColor: C.border,
    },
    cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    cardTitle:   { ...Typography.smallBold, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    seeAllRow:   { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAll:      { ...Typography.caption, color: C.primary, fontWeight: '600' },

    billRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: C.border },
    billName:    { ...Typography.bodyBold, color: C.textPrimary },
    billDays:    { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
    billAmount:  { ...Typography.bodyBold, color: C.bills },

    goalsEmpty: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingVertical: Spacing.md,
    },
    goalsEmptyText: { ...Typography.smallBold, color: C.textPrimary },
    goalsEmptySub:  { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
    goalsEmptyBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 2,
      paddingHorizontal: Spacing.sm, paddingVertical: 6,
      borderRadius: Radius.full, borderWidth: 1, borderColor: C.primary + '50',
    },
    goalsEmptyBtnText: { ...Typography.caption, color: C.primary, fontWeight: '600' },
  });
}
