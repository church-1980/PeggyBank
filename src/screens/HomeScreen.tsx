import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { Printer, MaintenanceTask } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

interface PrinterWithTasks {
  printer: Printer;
  overdue: MaintenanceTask[];
  dueSoon: MaintenanceTask[];
  nextTask?: MaintenanceTask;
  healthScore: number;
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [printers, setPrinters] = useState<PrinterWithTasks[]>([]);
  const [globalOverdue, setGlobalOverdue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const db = await getDatabase();
    const printerRows = await db.getAllAsync<Printer>(
      `SELECT * FROM printers WHERE is_active = 1 ORDER BY created_at ASC`
    );
    const today = new Date().toISOString().split('T')[0];
    const soonDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let totalOverdue = 0;
    const result: PrinterWithTasks[] = [];

    for (const printer of printerRows) {
      const tasks = await db.getAllAsync<MaintenanceTask>(
        `SELECT * FROM maintenance_tasks WHERE printer_id = ? AND is_active = 1`,
        [printer.id!]
      );
      const overdue = tasks.filter(
        t => t.next_due_at && t.next_due_at <= today
      );
      const dueSoon = tasks.filter(
        t => t.next_due_at && t.next_due_at > today && t.next_due_at <= soonDate
      );
      const upcoming = tasks
        .filter(t => t.next_due_at && t.next_due_at > today)
        .sort((a, b) => (a.next_due_at ?? '').localeCompare(b.next_due_at ?? ''));

      totalOverdue += overdue.length;

      const healthScore = computeHealthScore(tasks, printer.total_print_hours);
      result.push({ printer, overdue, dueSoon, nextTask: upcoming[0], healthScore });
    }

    setGlobalOverdue(totalOverdue);
    setPrinters(result);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ─── Empty State ────────────────────────────────────────────
  if (printers.length === 0 && !refreshing) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Ionicons name="construct-outline" size={64} color={C.textHint} />
        <Text style={styles.emptyTitle}>No Printers Yet</Text>
        <Text style={styles.emptyBody}>
          Add your first printer to start tracking maintenance and running visual inspections.
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddPrinter')}>
          <Ionicons name="add" size={22} color={C.textOnPrimary} />
          <Text style={styles.addBtnText}>Add a Printer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>The Plastic Surgeon</Text>
          <Text style={styles.subGreeting}>by Jester's Workshop</Text>
        </View>
        <TouchableOpacity
          style={styles.addIconBtn}
          onPress={() => navigation.navigate('AddPrinter')}
        >
          <Ionicons name="add" size={24} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Alert banner */}
      {globalOverdue > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: C.critical + '22', borderColor: C.critical }]}>
          <Ionicons name="warning" size={18} color={C.critical} />
          <Text style={[styles.alertText, { color: C.critical }]}>
            {globalOverdue} overdue maintenance {globalOverdue === 1 ? 'task' : 'tasks'} — tap a printer to see details
          </Text>
        </View>
      )}

      {/* Printer cards */}
      <Text style={styles.sectionLabel}>YOUR PRINTERS</Text>
      {printers.map(({ printer, overdue, dueSoon, nextTask, healthScore }) => (
        <TouchableOpacity
          key={printer.id}
          style={styles.printerCard}
          onPress={() => navigation.navigate('PrinterDetail', { printerId: printer.id })}
          activeOpacity={0.8}
        >
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleArea}>
              <Text style={styles.printerName}>{printer.name}</Text>
              <Text style={styles.printerModel}>{printer.brand} {printer.model}</Text>
            </View>
            <HealthBadge score={healthScore} C={C} />
          </View>

          {/* Hours */}
          <View style={styles.hoursRow}>
            <Ionicons name="time-outline" size={14} color={C.textHint} />
            <Text style={styles.hoursText}>
              {printer.total_print_hours.toFixed(1)} print hours
            </Text>
          </View>

          {/* Status row */}
          {overdue.length > 0 && (
            <View style={[styles.statusChip, { backgroundColor: C.critical + '20' }]}>
              <Ionicons name="warning-outline" size={14} color={C.critical} />
              <Text style={[styles.statusText, { color: C.critical }]}>
                {overdue.length} overdue — tap to see
              </Text>
            </View>
          )}
          {overdue.length === 0 && dueSoon.length > 0 && (
            <View style={[styles.statusChip, { backgroundColor: C.warning + '20' }]}>
              <Ionicons name="time-outline" size={14} color={C.warning} />
              <Text style={[styles.statusText, { color: C.warning }]}>
                {dueSoon.length} task{dueSoon.length > 1 ? 's' : ''} due this week
              </Text>
            </View>
          )}
          {overdue.length === 0 && dueSoon.length === 0 && nextTask && (
            <View style={[styles.statusChip, { backgroundColor: C.healthy + '18' }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={C.healthy} />
              <Text style={[styles.statusText, { color: C.healthy }]}>
                Up to date — next: {nextTask.title}
              </Text>
            </View>
          )}
          {overdue.length === 0 && dueSoon.length === 0 && !nextTask && (
            <View style={[styles.statusChip, { backgroundColor: C.healthy + '18' }]}>
              <Ionicons name="checkmark-circle" size={14} color={C.healthy} />
              <Text style={[styles.statusText, { color: C.healthy }]}>All maintenance up to date</Text>
            </View>
          )}

          {/* Quick action row */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('InspectionWizard', { printerId: printer.id })}
            >
              <Ionicons name="camera-outline" size={16} color={C.primary} />
              <Text style={styles.quickActionText}>Inspect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('LogMaintenance', { printerId: printer.id })}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={C.primary} />
              <Text style={styles.quickActionText}>Log Work</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('PrinterDetail', { printerId: printer.id })}
            >
              <Ionicons name="list-outline" size={16} color={C.primary} />
              <Text style={styles.quickActionText}>Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function HealthBadge({ score, C }: { score: number; C: any }) {
  const color = score >= 80 ? C.healthy : score >= 50 ? C.warning : C.critical;
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work';
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color }}>{score}</Text>
      <Text style={{ fontSize: 11, color, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function computeHealthScore(tasks: MaintenanceTask[], _totalHours: number): number {
  if (tasks.length === 0) return 100;
  const today = new Date().toISOString().split('T')[0];
  const total = tasks.filter(t => t.next_due_at).length;
  if (total === 0) return 100;
  const overdue = tasks.filter(t => t.next_due_at && t.next_due_at <= today).length;
  return Math.max(0, Math.round(100 - (overdue / total) * 100));
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: Spacing.md, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 80 },
    empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

    emptyTitle: { ...Typography.h2, color: C.textPrimary, marginTop: Spacing.lg, textAlign: 'center' },
    emptyBody:  { ...Typography.body, color: C.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
    addBtn:     { flexDirection: 'row', backgroundColor: C.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center', gap: Spacing.xs, ...Shadow.glow },
    addBtnText: { ...Typography.bodyBold, color: C.textOnPrimary },

    header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    greeting:     { ...Typography.h3, color: C.textPrimary },
    subGreeting:  { ...Typography.caption, color: C.textHint },
    addIconBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },

    alertBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
    alertText:   { ...Typography.small, flex: 1 },

    sectionLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.sm, marginTop: Spacing.xs },

    printerCard: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.md,
      ...Shadow.card,
    },
    cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
    cardTitleArea: { flex: 1, marginRight: Spacing.sm },
    printerName:   { ...Typography.bodyBold, color: C.textPrimary },
    printerModel:  { ...Typography.small, color: C.textSecondary },

    hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
    hoursText: { ...Typography.caption, color: C.textHint },

    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, marginBottom: Spacing.sm },
    statusText: { ...Typography.small },

    quickActions:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, marginTop: Spacing.xs, paddingTop: Spacing.sm, gap: Spacing.xs },
    quickAction:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
    quickActionText: { ...Typography.small, color: C.primary, fontWeight: '600' },
  });
}
