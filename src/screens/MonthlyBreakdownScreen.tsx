import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency } from '../utils/helpers';
import { CATEGORIES } from '../data/categories';
import { Category } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface CategoryTotal {
  category: string;
  total: number;
}

interface MonthData {
  totalIncome: number;
  totalSpending: number;
  categoryTotals: CategoryTotal[];
  billsPaid: number;
  billsUnpaid: number;
  billsPaidAmount: number;
}

export default function MonthlyBreakdownScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [data, setData] = useState<MonthData | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString().split('T')[0];

      const [incomeResult, expenseResult, categoryResult, billsResult] = await Promise.all([
        db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM income WHERE date>=? AND date<=?`, [start, end]),
        db.getFirstAsync<{ total: number }>(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date>=? AND date<=?`, [start, end]),
        db.getAllAsync<CategoryTotal>(`SELECT category, SUM(amount) as total FROM expenses WHERE date>=? AND date<=? GROUP BY category ORDER BY total DESC`, [start, end]),
        db.getAllAsync<{ is_paid: number; amount: number }>(`SELECT is_paid, amount FROM bills`),
      ]);

      setData({
        totalIncome: incomeResult?.total ?? 0,
        totalSpending: expenseResult?.total ?? 0,
        categoryTotals: categoryResult,
        billsPaid: billsResult.filter((b) => b.is_paid).length,
        billsUnpaid: billsResult.filter((b) => !b.is_paid).length,
        billsPaidAmount: billsResult.filter((b) => b.is_paid).reduce((s, b) => s + b.amount, 0),
      });
    } catch {}
  }, [monthOffset]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const monthLabel = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const statusMessage = () => {
    if (!data || data.totalIncome === 0) return null;
    const ratio = data.totalSpending / data.totalIncome;
    if (ratio >= 1)    return { text: "This month got a little stretched. That is okay — you can see exactly where it went.", color: C.spending };
    if (ratio >= 0.85) return { text: "Things got tight this month, but you stayed aware. That matters.", color: C.bills };
    if (ratio >= 0.6)  return { text: "You stayed roughly on budget this month.", color: C.income };
    return { text: "You kept spending well under control this month. Nice work.", color: C.income };
  };

  const status = statusMessage();
  const maxCategory = data?.categoryTotals[0]?.total ?? 1;
  const leftover = (data?.totalIncome ?? 0) - (data?.totalSpending ?? 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonthOffset((m) => m - 1)}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel()}</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setMonthOffset((m) => Math.min(0, m + 1))}
          disabled={monthOffset === 0}
        >
          <Ionicons name="chevron-forward" size={22} color={monthOffset === 0 ? C.border : C.primary} />
        </TouchableOpacity>
      </View>

      {/* Status message */}
      {status && (
        <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      )}

      {/* Big numbers */}
      <View style={styles.bigRow}>
        <View style={[styles.bigCard, { flex: 1 }]}>
          <Ionicons name="arrow-down-circle-outline" size={18} color={C.income} />
          <Text style={styles.bigLabel}>Income</Text>
          <Text style={[styles.bigNumber, { color: C.income }]}>{formatCurrency(data?.totalIncome ?? 0)}</Text>
        </View>
        <View style={[styles.bigCard, { flex: 1 }]}>
          <Ionicons name="arrow-up-circle-outline" size={18} color={C.spending} />
          <Text style={styles.bigLabel}>Spent</Text>
          <Text style={[styles.bigNumber, { color: C.spending }]}>{formatCurrency(data?.totalSpending ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Money left over</Text>
        <Text style={[styles.leftover, { color: leftover >= 0 ? C.income : C.spending }]}>
          {formatCurrency(Math.abs(leftover))}
        </Text>
        {leftover < 0 && <Text style={styles.leftoverSub}>over budget this month</Text>}
      </View>

      {/* Bills summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Bills this month</Text>
        <View style={styles.statRow}>
          <View style={styles.statCell}>
            <Ionicons name="checkmark-circle-outline" size={20} color={C.income} />
            <Text style={styles.statNumber}>{data?.billsPaid ?? 0}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Ionicons name="time-outline" size={20} color={data?.billsUnpaid ? C.bills : C.income} />
            <Text style={[styles.statNumber, { color: data?.billsUnpaid ? C.bills : C.income }]}>
              {data?.billsUnpaid ?? 0}
            </Text>
            <Text style={styles.statLabel}>Still due</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Ionicons name="wallet-outline" size={20} color={C.primaryLight} />
            <Text style={styles.statNumber}>{formatCurrency(data?.billsPaidAmount ?? 0)}</Text>
            <Text style={styles.statLabel}>Paid out</Text>
          </View>
        </View>
      </View>

      {/* Spending by category */}
      {(data?.categoryTotals.length ?? 0) > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Where the money went</Text>
          {data!.categoryTotals.map((cat) => {
            const info = CATEGORIES[cat.category as Category] ?? CATEGORIES.other;
            const barWidth = maxCategory > 0 ? (cat.total / maxCategory) * 100 : 0;
            return (
              <View key={cat.category} style={styles.catRow}>
                <View style={[styles.catIcon, { backgroundColor: info.color + '20' }]}>
                  <Ionicons name={info.icon} size={18} color={info.color} />
                </View>
                <View style={styles.catMiddle}>
                  <View style={styles.catLabelRow}>
                    <Text style={styles.catName}>{info.label}</Text>
                    <Text style={styles.catAmount}>{formatCurrency(cat.total)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: info.color }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={32} color={C.textHint} />
          </View>
          <Text style={styles.emptyText}>No spending recorded this month yet.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    content:       { paddingHorizontal: Spacing.md },

    backRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 4 },
    backText:      { ...Typography.small, color: C.textSecondary },

    monthNav:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
    navBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    monthLabel:    { ...Typography.h2, color: C.textPrimary },

    statusCard: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: C.border, borderLeftWidth: 4,
    },
    statusText:    { ...Typography.small, lineHeight: 22 },

    bigRow:        { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    bigCard: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, borderWidth: 1, borderColor: C.border, gap: 4,
    },
    bigLabel:      { ...Typography.caption, color: C.textSecondary },
    bigNumber:     { ...Typography.h2, fontSize: 24 },

    card: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.lg, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: C.border,
    },
    cardLabel:     { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm },
    leftover:      { ...Typography.hero, fontSize: 34 },
    leftoverSub:   { ...Typography.caption, color: C.spending, marginTop: 4 },

    statRow:       { flexDirection: 'row', alignItems: 'center' },
    statCell:      { flex: 1, alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
    statDivider:   { width: 1, height: 50, backgroundColor: C.border },
    statNumber:    { ...Typography.h3, color: C.textPrimary },
    statLabel:     { ...Typography.caption, color: C.textSecondary },

    catRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: Spacing.sm },
    catIcon:       { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    catMiddle:     { flex: 1 },
    catLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    catName:       { ...Typography.body, color: C.textPrimary },
    catAmount:     { ...Typography.caption, color: C.textSecondary },
    barBg:         { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
    barFill:       { height: 6, borderRadius: 3 },

    empty:         { alignItems: 'center', padding: 40 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    },
    emptyText:     { ...Typography.small, color: C.textSecondary, textAlign: 'center' },

    closeBtn:      { marginTop: Spacing.sm, backgroundColor: C.bgCard, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    closeBtnText:  { ...Typography.body, color: C.textSecondary },
  });
}
