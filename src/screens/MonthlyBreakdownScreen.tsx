import { buildFinanceInput } from '../lib/financeSummary';
import { computeFinanceSummary, spendingByCategory } from '../core/finance';
import { buildSegments, donutCentre, type ChartSegment } from '../core/spendingChart';
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
import { PeggyScreen, PeggyHeader, PeggyDonut, PeggyLegendRow } from '../components/peggy';
import IconBadge from '../components/IconBadge';
import PeggyCard from '../components/peggy/PeggyCard';

interface CategoryTotal {
  category: string;
  total: number;
}

interface MonthData {
  totalIncome: number;
  /** ALL money out: everyday spending plus bills actually paid. */
  totalSpending: number;
  /** Everyday expenses only. What the category breakdown below describes. */
  everydaySpending: number;
  categoryTotals: CategoryTotal[];
  /** The slices of "Money out". Built from the same rows the totals came from. */
  segments: ChartSegment[];
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

      // The money totals come from the SAME engine Home and Weekly Check-In use.
      // This screen used to add up income and expenses itself, which made it a
      // second version of financial reality: it counted only the expenses table,
      // so a paid Bell bill of $425 was money that had genuinely left the
      // account and was invisible here while What Happened showed it.
      // ONE read of the month. The totals and the chart are built from the very
      // same rows, so the chart cannot end up describing a different month's
      // money than the numbers printed above it. This used to be a second
      // SELECT ... GROUP BY, which was a second version of the same question.
      const input = await buildFinanceInput(db, targetDate);
      const finance = computeFinanceSummary(input);
      const categoryResult = spendingByCategory(input.expenses);

      setData({
        totalIncome: finance.monthIncome,
        totalSpending: finance.monthSpending,
        everydaySpending: finance.everydaySpending,
        categoryTotals: categoryResult,
        // A decomposition of finance.monthSpending — never a second total.
        segments: buildSegments({
          moneyOut: finance.monthSpending,
          billsPaid: finance.billsPaidTotal,
          categories: categoryResult,
          meta: (key) => {
            const info = CATEGORIES[key as Category] ?? CATEGORIES.other;
            return { label: info.label, color: info.color };
          },
          billsColor: C.bills,
          otherColor: C.textHint,
        }),
        // What was ACTUALLY paid, from bill_payments, not the planned amounts.
        billsPaidAmount: finance.billsPaidTotal,
      });
    } catch {}
  }, [monthOffset, C.bills, C.textHint]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const monthLabel = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const statusMessage = () => {
    if (!data || data.totalIncome === 0) return null;
    // These describe what the two numbers below already say, and nothing more.
    //
    // They used to praise and console: "Nice work", "you stayed aware, that
    // matters". The only thing they actually knew was spending divided by
    // income — which says nothing about whether a month was well handled. A
    // month dominated by a mortgage payment is not a failure of character, and
    // a quiet month is not an achievement. Telling someone they did well, on
    // that basis, is a guess dressed up as encouragement.
    //
    // So they now report, warmly, and let the chart do the teaching.
    const ratio = data.totalSpending / data.totalIncome;
    if (ratio >= 1)    return { text: "More went out than came in this month. Here is where it went.", color: C.spending };
    if (ratio >= 0.85) return { text: "Nearly everything that came in went back out this month.", color: C.bills };
    if (ratio >= 0.6)  return { text: "Some of what came in is still left over this month.", color: C.income };
    return { text: "Most of what came in is still left over this month.", color: C.income };
  };

  const status = statusMessage();
  const leftover = (data?.totalIncome ?? 0) - (data?.totalSpending ?? 0);

  return (
    <PeggyScreen>
      <PeggyHeader onBack={() => navigation.goBack()} />

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonthOffset((m) => m - 1)} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel()}</Text>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setMonthOffset((m) => Math.min(0, m + 1))}
          disabled={monthOffset === 0}
         accessibilityRole="button" accessibilityLabel="Next month">
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
          <IconBadge iconKey="income" color={C.income} size={56} tinted={false} />
          <Text style={styles.bigLabel}>Income</Text>
          <Text style={[styles.bigNumber, { color: C.income }]}>{formatCurrency(data?.totalIncome ?? 0)}</Text>
        </View>
        <View style={[styles.bigCard, { flex: 1 }]}>
          <IconBadge iconKey="spent" color={C.spending} size={56} tinted={false} />
          <Text style={styles.bigLabel}>Money out</Text>
          <Text style={[styles.bigNumber, { color: C.spending }]}>{formatCurrency(data?.totalSpending ?? 0)}</Text>
        </View>
      </View>

      {/* The two halves of money out, so "Money out" is never a lump nobody
          can take apart. Everyday spending and bills stay distinct records. */}
      <PeggyCard style={styles.card}>
        <Text style={styles.cardLabel}>What the money out was</Text>
        <View style={styles.splitRow}>
          <Text style={styles.splitLabel}>Everyday spending</Text>
          <Text style={styles.splitValue}>{formatCurrency(data?.everydaySpending ?? 0)}</Text>
        </View>
        <View style={styles.splitRow}>
          <Text style={styles.splitLabel}>Bills paid</Text>
          <Text style={styles.splitValue}>{formatCurrency(data?.billsPaidAmount ?? 0)}</Text>
        </View>
      </PeggyCard>

      <PeggyCard style={styles.card}>
        <Text style={styles.cardLabel}>Money left over</Text>
        <Text style={[styles.leftover, { color: leftover >= 0 ? C.income : C.spending }]}>
          {formatCurrency(Math.abs(leftover))}
        </Text>
        {leftover < 0 && <Text style={styles.leftoverSub}>over budget this month</Text>}
      </PeggyCard>

      {/* WHERE YOUR MONEY WENT.
          This REPLACES the old per-category bar list rather than sitting next
          to it: the same categories in two forms on one screen is duplicated
          information, and the donut also covers bills, which the bars never
          did. One card, one idea. */}
      {(data?.segments.length ?? 0) > 0 ? (
        <PeggyCard style={styles.card}>
          <Text style={styles.cardLabel}>Where your money went</Text>

          <View style={styles.chartRow}>
            <PeggyDonut
              segments={data!.segments}
              centreAmount={donutCentre(data!.totalSpending).amount}
              centreLabel={donutCentre(data!.totalSpending).label}
            />
          </View>

          {/* The readable half. Colour is never the only way to tell the
              slices apart — every one is named, with its own dollars. */}
          <View style={styles.legend}>
            {data!.segments.map((seg) => (
              <PeggyLegendRow
                key={seg.key}
                color={seg.color}
                label={seg.label}
                amount={formatCurrency(seg.amount)}
                percent={seg.percent}
              />
            ))}
          </View>
        </PeggyCard>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <IconBadge iconKey="reports" color={C.textHint} size={44} iconSize={28} tinted={false} />
          </View>
          <Text style={styles.emptyText}>No spending recorded this month.</Text>
        </View>
      )}

      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({

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

    // PeggyCard supplies the surface, radius and shadow.
    // Only this screen's roomier padding and spacing stay local.
    card: { padding: Spacing.lg, marginBottom: Spacing.md },
    splitRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
    splitLabel: { ...Typography.body, color: C.textSecondary },
    splitValue: { ...Typography.bodyBold, color: C.textPrimary },
    cardLabel:     { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm },
    leftover:      { ...Typography.hero, fontSize: 34 },
    leftoverSub:   { ...Typography.caption, color: C.spending, marginTop: 4 },



    // The donut sits on its own line, centred: at phone width a chart
    // beside a list squeezes both, and the list is the readable half.
    chartRow:      { alignItems: 'center', paddingVertical: Spacing.sm },
    
    legend:        { marginTop: Spacing.sm },
    // 44 high so a row is a comfortable target if it ever becomes tappable,
    // and so the text has room to grow with the system font size.
    
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
