import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '../database/database';
import { getTaskTemplatesForPrinterType } from '../data/maintenanceTasks';
import { PRINTER_BRANDS, getModelsForBrand } from '../data/printerBrands';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';
import { PrinterType } from '../types';

const STEPS = ['welcome', 'camera', 'printer', 'tasks'] as const;
type Step = typeof STEPS[number];

export default function OnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [step, setStep] = useState<Step>('welcome');
  const [printerName, setPrinterName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [printerType, setPrinterType] = useState<PrinterType>('FDM');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [enabledTaskKeys, setEnabledTaskKeys] = useState<Set<string>>(new Set());
  const [tasksInitialized, setTasksInitialized] = useState(false);

  const taskTemplates = useMemo(
    () => getTaskTemplatesForPrinterType(printerType),
    [printerType]
  );

  if (!tasksInitialized && taskTemplates.length > 0) {
    setEnabledTaskKeys(new Set(taskTemplates.map(t => t.task_key)));
    setTasksInitialized(true);
  }

  async function requestCameraPermission() {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission',
        'Camera access lets you photograph printer components during visual inspections. You can enable this later in device Settings.',
        [{ text: 'OK', onPress: () => setStep('printer') }]
      );
    } else {
      setStep('printer');
    }
  }

  async function finish() {
    if (!printerName.trim() || !brand || !model) {
      Alert.alert('Missing Info', 'Please add a nickname, brand, and model for your printer.');
      return;
    }
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO printers (name, brand, model, printer_type, purchase_date, total_print_hours, is_active)
       VALUES (?, ?, ?, ?, ?, 0, 1)`,
      [printerName.trim(), brand, model, printerType, purchaseDate || null]
    );
    const printerId = result.lastInsertRowId;

    const templates = getTaskTemplatesForPrinterType(printerType).filter(
      t => enabledTaskKeys.has(t.task_key)
    );
    for (const tmpl of templates) {
      const nextDue = tmpl.interval_days
        ? new Date(Date.now() + tmpl.interval_days * 86400000).toISOString().split('T')[0]
        : null;
      await db.runAsync(
        `INSERT INTO maintenance_tasks
           (printer_id, task_key, title, description, interval_hours, interval_days, next_due_at, priority, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [printerId, tmpl.task_key, tmpl.title, tmpl.description ?? null,
         tmpl.interval_hours ?? null, tmpl.interval_days ?? null, nextDue, tmpl.priority]
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_done', '1')`
    );
    navigation.replace('Home');
  }

  function toggleTask(key: string) {
    setEnabledTaskKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ─── Welcome ─────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="construct" size={72} color={C.primary} />
        <Text style={styles.appName}>The Plastic Surgeon</Text>
        <Text style={styles.tagline}>Saving printers one layer at a time.</Text>
        <Text style={styles.creator}>Created by Jester's Workshop</Text>
        <View style={styles.featureList}>
          {[
            { icon: 'calendar-outline', text: 'Maintenance schedules built for your printer' },
            { icon: 'camera-outline',   text: 'Visual inspection with your phone camera' },
            { icon: 'book-outline',     text: 'Step-by-step repair guides — works offline' },
            { icon: 'notifications-outline', text: 'Reminders before things break' },
          ].map(f => (
            <View key={f.icon} style={styles.featureRow}>
              <Ionicons name={f.icon as any} size={22} color={C.primary} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('camera')}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Camera Permission ───────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="camera" size={64} color={C.primary} style={{ marginBottom: Spacing.lg }} />
        <Text style={styles.stepTitle}>Enable the Camera</Text>
        <Text style={styles.stepBody}>
          The Plastic Surgeon uses your camera to photograph printer components during visual
          inspections. Photos stay on your device — they are never uploaded anywhere.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestCameraPermission}>
          <Text style={styles.primaryBtnText}>Allow Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => setStep('printer')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Printer Details ─────────────────────────────────────────
  if (step === 'printer') {
    const brandModels = brand ? getModelsForBrand(brand) : [];
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>Add Your First Printer</Text>
        <Text style={styles.stepBody}>
          Tell us about your printer so we can set up the right maintenance schedule for it.
        </Text>

        <Text style={styles.fieldLabel}>Printer Nickname *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Workshop Workhorse, Bedroom Ender"
          placeholderTextColor={C.textHint}
          value={printerName}
          onChangeText={setPrinterName}
        />

        <Text style={styles.fieldLabel}>Printer Type *</Text>
        <View style={styles.toggleRow}>
          {(['FDM', 'Resin'] as PrinterType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, printerType === t && styles.typeBtnActive]}
              onPress={() => { setPrinterType(t); setTasksInitialized(false); }}
            >
              <Text style={[styles.typeBtnText, printerType === t && styles.typeBtnTextActive]}>
                {t === 'FDM' ? 'FDM (filament)' : 'Resin'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Brand *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xs }}>
          {PRINTER_BRANDS.map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.pill, brand === b && styles.pillActive]}
              onPress={() => { setBrand(b); setModel(''); }}
            >
              <Text style={[styles.pillText, brand === b && styles.pillTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {brand !== '' && (
          <>
            <Text style={styles.fieldLabel}>Model *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xs }}>
              {brandModels.map(m => (
                <TouchableOpacity
                  key={m.model}
                  style={[styles.pill, model === m.model && styles.pillActive]}
                  onPress={() => setModel(m.model)}
                >
                  <Text style={[styles.pillText, model === m.model && styles.pillTextActive]}>
                    {m.model}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.fieldLabel}>Purchase Date (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.textHint}
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={() => {
          if (!printerName.trim() || !brand || !model) {
            Alert.alert('Missing Info', 'Please fill in the printer nickname, brand, and model.');
            return;
          }
          setStep('tasks');
        }}>
          <Text style={styles.primaryBtnText}>Next — Set Up Schedule</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Task Selection ──────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Your Maintenance Schedule</Text>
      <Text style={styles.stepBody}>
        These are the standard tasks for a {printerType} printer. Turn off any you don't want tracked.
        You can always change this later.
      </Text>

      {taskTemplates.map(t => (
        <View key={t.task_key} style={styles.taskRow}>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{t.title}</Text>
            <Text style={styles.taskDesc} numberOfLines={2}>{t.description}</Text>
          </View>
          <Switch
            value={enabledTaskKeys.has(t.task_key)}
            onValueChange={() => toggleTask(t.task_key)}
            thumbColor={C.white}
            trackColor={{ false: C.border, true: C.primary }}
          />
        </View>
      ))}

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.xl }]} onPress={finish}>
        <Text style={styles.primaryBtnText}>Start Maintaining My Printer</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    scrollContent: { padding: Spacing.lg, paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },

    appName:    { ...Typography.h1, color: C.textPrimary, marginTop: Spacing.md, textAlign: 'center' },
    tagline:    { ...Typography.body, color: C.primary, marginTop: Spacing.xs, textAlign: 'center' },
    creator:    { ...Typography.caption, color: C.textHint, marginTop: 4, marginBottom: Spacing.xl },

    featureList: { width: '100%', marginBottom: Spacing.xl },
    featureRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
    featureText: { ...Typography.body, color: C.textSecondary, flex: 1 },

    stepTitle: { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.sm },
    stepBody:  { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.xl },

    fieldLabel: { ...Typography.smallBold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: {
      backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.md, padding: Spacing.md,
      ...Typography.body, color: C.textPrimary,
    },
    toggleRow:         { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
    typeBtn:           { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    typeBtnActive:     { backgroundColor: C.primary, borderColor: C.primary },
    typeBtnText:       { ...Typography.smallBold, color: C.textSecondary },
    typeBtnTextActive: { color: C.textOnPrimary },

    pill:           { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, marginRight: Spacing.xs, backgroundColor: C.bgCard },
    pillActive:     { backgroundColor: C.primary, borderColor: C.primary },
    pillText:       { ...Typography.small, color: C.textSecondary },
    pillTextActive: { ...Typography.small, color: C.textOnPrimary, fontWeight: '600' },

    primaryBtn:     { backgroundColor: C.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg, ...Shadow.glow },
    primaryBtnText: { ...Typography.bodyBold, color: C.textOnPrimary },
    skipBtn:        { marginTop: Spacing.md, padding: Spacing.sm, alignItems: 'center' },
    skipText:       { ...Typography.small, color: C.textHint },

    taskRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm, ...Shadow.card },
    taskInfo:  { flex: 1 },
    taskTitle: { ...Typography.bodyBold, color: C.textPrimary },
    taskDesc:  { ...Typography.small, color: C.textSecondary, marginTop: 2 },
  });
}
