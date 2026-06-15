import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { MaintenanceTask, Printer } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function LogMaintenanceScreen({ navigation, route }: any) {
  const { printerId, taskKey, taskTitle } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [printer, setPrinter] = useState<Printer | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string>(taskKey ?? '');
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>(taskTitle ?? '');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [currentHours, setCurrentHours] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const db = await getDatabase();
    const p = await db.getFirstAsync<Printer>(`SELECT * FROM printers WHERE id = ?`, [printerId]);
    const t = await db.getAllAsync<MaintenanceTask>(
      `SELECT * FROM maintenance_tasks WHERE printer_id = ? AND is_active = 1 ORDER BY priority DESC`,
      [printerId]
    );
    setPrinter(p ?? null);
    setTasks(t);
    if (p) setCurrentHours(p.total_print_hours.toFixed(1));
  }, [printerId]);

  React.useEffect(() => { load(); }, [load]);

  async function save() {
    if (!selectedTaskKey) {
      Alert.alert('Select a Task', 'Choose which maintenance task you completed.');
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const hours = parseFloat(currentHours) || 0;
      const costNum = parseFloat(cost) || 0;
      const parts = partsReplaced.trim()
        ? partsReplaced.split(',').map(p => p.trim()).filter(Boolean)
        : [];

      await db.runAsync(
        `INSERT INTO maintenance_history
           (printer_id, task_key, title, notes, print_hours_at_service, cost, parts_replaced_json, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [printerId, selectedTaskKey, selectedTaskTitle, notes || null, hours,
         costNum || null, parts.length > 0 ? JSON.stringify(parts) : null]
      );

      // Update the task's last_done and compute next due
      const task = tasks.find(t => t.task_key === selectedTaskKey);
      if (task) {
        const today = new Date().toISOString().split('T')[0];
        const nextDue = task.interval_days
          ? new Date(Date.now() + task.interval_days * 86400000).toISOString().split('T')[0]
          : null;
        const nextHours = task.interval_hours ? hours + task.interval_hours : null;
        await db.runAsync(
          `UPDATE maintenance_tasks
           SET last_done_at = ?, last_done_hours = ?, next_due_at = ?, next_due_hours = ?
           WHERE printer_id = ? AND task_key = ?`,
          [today, hours, nextDue, nextHours, printerId, selectedTaskKey]
        );
      }

      // Update printer's total hours if user entered a higher value
      if (hours > (printer?.total_print_hours ?? 0)) {
        await db.runAsync(
          `UPDATE printers SET total_print_hours = ? WHERE id = ?`,
          [hours, printerId]
        );
      }

      Alert.alert('Logged!', `${selectedTaskTitle} has been recorded in your maintenance history.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>Log Maintenance</Text>
      {printer && <Text style={styles.printerName}>{printer.name}</Text>}

      {/* Task selection */}
      <Text style={styles.label}>What did you do? *</Text>
      {tasks.map(t => (
        <TouchableOpacity
          key={t.task_key}
          style={[styles.taskRow, selectedTaskKey === t.task_key && styles.taskRowSelected]}
          onPress={() => { setSelectedTaskKey(t.task_key); setSelectedTaskTitle(t.title); }}
        >
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{t.title}</Text>
            {t.next_due_at && (
              <Text style={[styles.taskDue, { color: t.next_due_at <= new Date().toISOString().split('T')[0] ? C.critical : C.textHint }]}>
                Due: {t.next_due_at}
              </Text>
            )}
          </View>
          {selectedTaskKey === t.task_key && (
            <Ionicons name="checkmark-circle" size={22} color={C.primary} />
          )}
        </TouchableOpacity>
      ))}

      {/* Current print hours */}
      <Text style={styles.label}>Current Print Hours</Text>
      <TextInput
        style={styles.input}
        value={currentHours}
        onChangeText={setCurrentHours}
        keyboardType="decimal-pad"
        placeholder="e.g. 247.5"
        placeholderTextColor={C.textHint}
      />
      <Text style={styles.hint}>Update this to keep your maintenance schedule accurate.</Text>

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="What did you find? Any issues noticed?"
        placeholderTextColor={C.textHint}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      {/* Parts replaced */}
      <Text style={styles.label}>Parts Replaced (optional)</Text>
      <TextInput
        style={styles.input}
        value={partsReplaced}
        onChangeText={setPartsReplaced}
        placeholder="e.g. nozzle, PTFE tube (separate with commas)"
        placeholderTextColor={C.textHint}
      />

      {/* Cost */}
      <Text style={styles.label}>Cost (optional)</Text>
      <TextInput
        style={styles.input}
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        placeholder="e.g. 4.99"
        placeholderTextColor={C.textHint}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, (saving || !selectedTaskKey) && styles.btnDisabled]}
        onPress={save}
        disabled={saving || !selectedTaskKey}
      >
        <Ionicons name="checkmark-done" size={20} color={C.textOnPrimary} />
        <Text style={styles.primaryBtnText}>Save to History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: Spacing.md, paddingBottom: insets.bottom + 80 },

    backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
    backText:    { ...Typography.smallBold, color: C.primary },
    pageTitle:   { ...Typography.h2, color: C.textPrimary, marginBottom: 2 },
    printerName: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.lg },

    label: { ...Typography.smallBold, color: C.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.xs },
    hint:  { ...Typography.caption, color: C.textHint, marginTop: 4 },

    input: {
      backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.md, padding: Spacing.md,
      ...Typography.body, color: C.textPrimary,
    },
    multiline: { minHeight: 80 },

    taskRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, borderWidth: 2, borderColor: 'transparent', ...Shadow.card },
    taskRowSelected: { borderColor: C.primary },
    taskInfo:        { flex: 1 },
    taskTitle:       { ...Typography.bodyBold, color: C.textPrimary },
    taskDue:         { ...Typography.caption, marginTop: 2 },

    primaryBtn:     { flexDirection: 'row', backgroundColor: C.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xl, ...Shadow.glow },
    primaryBtnText: { ...Typography.bodyBold, color: C.textOnPrimary },
    btnDisabled:    { opacity: 0.4 },
  });
}
