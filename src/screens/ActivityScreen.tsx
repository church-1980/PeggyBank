import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDatabase } from '../database/database';
import { Spacing, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import PeggyScreen from '../components/peggy/PeggyScreen';
import PeggyCard from '../components/peggy/PeggyCard';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import PeggyActivityRow from '../components/peggy/PeggyActivityRow';
import { describeDate } from '../components/peggy/PeggyDateField';
import { useCustomLogos } from '../context/CustomLogoContext';
import { activityForMonth, groupByDay, activityTotals, type ActivityItem } from '../lib/activity';
import { formatCurrency } from '../utils/helpers';

/**
 * WHAT HAPPENED TO MY MONEY.
 *
 * Everything that actually moved, newest first, whichever part of PeggyBank
 * recorded it. Someone trying to remember where $20 went should not have to
 * know whether it was filed as an expense, a bill payment or a subscription
 * charge -- they only know they spent it.
 *
 * This screen owns no financial truth. Every row is read from the record that
 * already exists, and tapping one opens THAT record, so a correction is made in
 * one place and shows up everywhere.
 */

export default function ActivityScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { logoFor } = useCustomLogos();

  const [monthOffset, setMonthOffset] = useState(0);
  const [items, setItems] = useState<ActivityItem[]>([]);

  const viewing = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      setItems(await activityForMonth(db, viewing));
    } catch { setItems([]); }
  }, [viewing]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Open the record behind a row. The person does not need to know which
   * screen owns it; PeggyBank works that out.
   */
  const open = async (item: ActivityItem) => {
    try {
      const db = await getDatabase();
      if (item.source === 'expense') {
        const row = await db.getFirstAsync<any>(`SELECT * FROM expenses WHERE id = ?`, [item.sourceId]);
        if (row) navigation.navigate('AddExpense', { ...row });
        return;
      }
      if (item.source === 'income') {
        const row = await db.getFirstAsync<any>(`SELECT * FROM income WHERE id = ?`, [item.sourceId]);
        if (row) navigation.navigate('AddIncome', { ...row });
        return;
      }
      // A bill or subscription payment belongs to its recurring item, which is
      // where the payment history and the paid state live.
      navigation.navigate('Bills');
    } catch { /* leaving them where they are beats crashing */ }
  };

  const totals = activityTotals(items);
  const sections = groupByDay(items).map(d => ({ title: d.date, data: d.items }));
  const monthName = viewing.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <PeggyScreen scroll={false} padded={false} contentStyle={styles.shell}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>What happened</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.monthRow}>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => setMonthOffset(m => m - 1)}
            accessibilityRole="button"
            accessibilityLabel="Show the previous month"
          >
            <Ionicons name="chevron-back" size={20} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <TouchableOpacity
            style={styles.monthBtn}
            onPress={() => setMonthOffset(m => Math.min(0, m + 1))}
            disabled={monthOffset === 0}
            accessibilityRole="button"
            accessibilityLabel="Show the next month"
            accessibilityState={{ disabled: monthOffset === 0 }}
          >
            <Ionicons name="chevron-forward" size={20} color={monthOffset === 0 ? C.border : C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.totalBlock} accessible accessibilityLabel={'Money in, ' + formatCurrency(totals.in)}>
            <Text style={styles.totalLabel}>Money in</Text>
            <Text style={[styles.totalValue, { color: C.income }]}>+{formatCurrency(totals.in)}</Text>
          </View>
          <View style={styles.totalBlock} accessible accessibilityLabel={'Money out, ' + formatCurrency(totals.out)}>
            <Text style={styles.totalLabel}>Money out</Text>
            <Text style={styles.totalValue}>−{formatCurrency(totals.out)}</Text>
          </View>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dayHeader}>{describeDate(section.title)}</Text>
        )}
        renderItem={({ item }) => (
          <PeggyCard style={styles.card}>
            <PeggyActivityRow item={item} onPress={open} logoUri={logoFor(item.title)} />
          </PeggyCard>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <PeggyIconFrame iconKey="reports" size="feature" shape="circle" />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Money you spend and money you receive will show up here, newest first.
            </Text>
          </View>
        }
      />
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    shell: { flex: 1, paddingBottom: 0 },
    header: {
      paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.md,
      backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn:    { width: 36, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
    title:      { ...Typography.h2, color: C.textPrimary },
    monthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
    monthBtn:   { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { ...Typography.label, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    totalsRow:  { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    totalBlock: { flex: 1 },
    totalLabel: { ...Typography.caption, color: C.textHint },
    totalValue: { ...Typography.bodyBold, color: C.textPrimary, marginTop: 2 },
    list:       { padding: Spacing.md, paddingBottom: 120 },
    dayHeader: {
      ...Typography.label, color: C.textHint, textTransform: 'uppercase',
      letterSpacing: 0.6, marginTop: Spacing.md, marginBottom: Spacing.xs,
    },
    card:       { marginBottom: Spacing.sm },
    empty:      { alignItems: 'center', paddingTop: Spacing.xl, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: C.textPrimary },
    emptyText:  { ...Typography.small, color: C.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl },
  });
}
