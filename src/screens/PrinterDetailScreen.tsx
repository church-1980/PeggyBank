import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { Printer, MaintenanceTask, Inspection } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

export default function PrinterDetailScreen({ navigation, route }: any) {
  const { printerId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [printer, setPrinter] = useState<Printer | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const soonDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const load = useCallback(async () => {
    const db = await getDatabase();
    const p = await db.getFirstAsync<Printer>(`SELECT * FROM printers WHERE id = ?`, [printerId]);
    const t = await db.getAllAsync<MaintenanceTask>(
      `SELECT * FROM maintenance_tasks WHERE printer_id = ? AND is_active = 1`,
      [printerId]
    );
    const ins = await db.getAllAsync<Inspection>(
      `SELECT * FROM inspections WHERE printer_id = ? ORDER BY created_at DESC LIMIT 5`,
      [printerId]
    );
    setPrinter(p ?? null);
    setTasks(t.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)));
    setRecentInspections(ins);
  }, [printerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const overdue = tasks.filter(t => t.next_due_at && t.next_due_at <= today);
  const dueSoon = tasks.filter(t => t.next_due_at && t.next_due_at > today && t.next_due_at <= soonDate);
  const upToDate = tasks.filter(t => !t.next_due_at || t.next_due_at > soonDate);

  if (!printer) return null;

  function taskStatusColor(t: MaintenanceTask) {
    if (t.next_due_at && t.next_due_at <= today) return C.critical;
    if (t.next_due_at && t.next_due_at <= soonDate) return C.warning;
    return C.healthy;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.primary} />}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.primary} />
        <Text style={styles.backText}>Home</Text>
      </TouchableOpacity>

      {/* Printer info */}
      <Text style={styles.printerName}>{printer.name}</Text>
      <Text style={styles.printerModel}>{printer.brand} · {printer.model} · {printer.printer_type}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{printer.total_print_hours.toFixed(0)}</Text>
          <Text style={styles.statLabel}>print hours</Text>
        </View>
        <View style={[styles.stat, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
          <Text style={[styles.statValue, { color: overdue.length > 0 ? C.critical : C.healthy }]}>{overdue.length}</Text>
          <Text style={styles.statLabel}>overdue</Text>
        </View>
        <View style={[styles.stat, { borderLeftWidth: 1, borderLeftColor: C.border }]}>
          <Text style={[styles.statValue, { color: dueSoon.length > 0 ? C.warning : C.healthy }]}>{dueSoon.length}</Text>
          <Text style={styles.statLabel}>due this week</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('InspectionWizard', { printerId })}>
          <Ionicons name="camera" size={20} color={C.primary} />
          <Text style={styles.actionText}>Inspect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LogMaintenance', { printerId })}>
          <Ionicons name="checkmark-done" size={20} color={C.primary} />
          <Text style={styles.actionText}>Log Work</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MaintenanceHistory', { printerId })}>
          <Ionicons name="time" size={20} color={C.primary} />
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Overdue tasks */}
      {overdue.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: C.critical }]}>OVERDUE</Text>
          {overdue.map(t => <TaskRow key={t.id} task={t} color={C.critical} C={C} styles={styles} navigation={navigation} printerId={printerId} />)}
        </>
      )}

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: C.warning }]}>DUE THIS WEEK</Text>
          {dueSoon.map(t => <TaskRow key={t.id} task={t} color={C.warning} C={C} styles={styles} navigation={navigation} printerId={printerId} />)}
        </>
      )}

      {/* Up to date */}
      {upToDate.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: C.textHint }]}>UP TO DATE</Text>
          {upToDate.map(t => <TaskRow key={t.id} task={t} color={taskStatusColor(t)} C={C} styles={styles} navigation={navigation} printerId={printerId} />)}
        </>
      )}

      {/* Recent inspections */}
      {recentInspections.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>RECENT INSPECTIONS</Text>
          {recentInspections.map(ins => (
            <View key={ins.id} style={styles.insRow}>
              <Ionicons
                name={ins.status === 'issues_found' ? 'warning' : 'checkmark-circle'}
                size={18}
                color={ins.status === 'issues_found' ? C.critical : C.healthy}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.insType}>{ins.inspection_type === 'quick' ? 'Quick Check' : 'Full Inspection'}</Text>
                <Text style={styles.insDate}>{ins.created_at?.split('T')[0]}</Text>
              </View>
              {ins.overall_score != null && (
                <Text style={[styles.insScore, { color: ins.overall_score >= 80 ? C.healthy : ins.overall_score >= 50 ? C.warning : C.critical }]}>
                  {ins.overall_score}
                </Text>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function TaskRow({ task, color, C, styles, navigation, printerId }: any) {
  return (
    <TouchableOpacity
      style={styles.taskRow}
      onPress={() => navigation.navigate('LogMaintenance', {
        printerId, taskKey: task.task_key, taskTitle: task.title,
      })}
    >
      <View style={[styles.taskDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        {task.next_due_at && (
          <Text style={[styles.taskDue, { color }]}>Due {task.next_due_at}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textHint} />
    </TouchableOpacity>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: Spacing.md, paddingBottom: insets.bottom + 80 },

    backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.lg },
    backText:    { ...Typography.smallBold, color: C.primary },
    printerName: { ...Typography.h2, color: C.textPrimary },
    printerModel:{ ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },

    statsRow:   { flexDirection: 'row', backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.card },
    stat:       { flex: 1, alignItems: 'center' },
    statValue:  { ...Typography.h2, color: C.textPrimary },
    statLabel:  { ...Typography.caption, color: C.textHint, marginTop: 2 },

    actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    actionBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.sm, gap: 4, ...Shadow.card },
    actionText:{ ...Typography.caption, color: C.primary, fontWeight: '600' },

    sectionLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.xs, marginTop: Spacing.md },

    taskRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, gap: Spacing.sm, ...Shadow.card },
    taskDot:   { width: 10, height: 10, borderRadius: 5 },
    taskTitle: { ...Typography.bodyBold, color: C.textPrimary },
    taskDue:   { ...Typography.caption, marginTop: 2 },

    insRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs, gap: Spacing.sm },
    insType:   { ...Typography.smallBold, color: C.textPrimary },
    insDate:   { ...Typography.caption, color: C.textHint },
    insScore:  { ...Typography.h3 },
  });
}
