import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '../database/database';
import { getCheckpointsForType } from '../data/inspectionCheckpoints';
import { CheckpointDefinition, CheckPointStatus, Printer } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

type WizardStep = 'setup' | 'safety' | 'inspect' | 'results';

interface CheckpointResult {
  checkpoint: CheckpointDefinition;
  status: CheckPointStatus;
  notes: string;
  photoUri?: string;
}

export default function InspectionScreen({ navigation, route }: any) {
  const { printerId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [wizardStep, setWizardStep] = useState<WizardStep>(printerId ? 'safety' : 'setup');
  const [inspectionType, setInspectionType] = useState<'quick' | 'full'>('quick');
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<number | null>(printerId ?? null);

  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [results, setResults] = useState<CheckpointResult[]>([]);
  const [currentStatus, setCurrentStatus] = useState<CheckPointStatus | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const checkpoints = useMemo(
    () => (printer ? getCheckpointsForType(printer.printer_type as 'FDM' | 'Resin', inspectionType === 'quick') : []),
    [printer, inspectionType]
  );
  const currentCheckpoint = checkpoints[checkpointIndex];
  const progress = checkpoints.length > 0 ? (checkpointIndex / checkpoints.length) : 0;

  // Load printers for setup screen
  const loadPrinters = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Printer>(`SELECT * FROM printers WHERE is_active = 1`);
    setPrinters(rows);
    if (printerId) {
      const found = rows.find(p => p.id === printerId);
      if (found) setPrinter(found);
    }
  }, [printerId]);

  React.useEffect(() => { loadPrinters(); }, [loadPrinters]);

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCurrentPhoto(result.assets[0].uri);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCurrentPhoto(result.assets[0].uri);
    }
  }

  function advanceCheckpoint() {
    if (!currentStatus) {
      Alert.alert('Select a Status', 'Tap Good, Concern, or Problem before moving on.');
      return;
    }
    const newResult: CheckpointResult = {
      checkpoint: currentCheckpoint,
      status: currentStatus,
      notes: currentNotes,
      photoUri: currentPhoto,
    };
    const newResults = [...results, newResult];
    setResults(newResults);

    if (checkpointIndex + 1 < checkpoints.length) {
      setCheckpointIndex(i => i + 1);
      setCurrentStatus(null);
      setCurrentNotes('');
      setCurrentPhoto(undefined);
    } else {
      // All done — save and show results
      saveInspection(newResults);
    }
  }

  async function saveInspection(finalResults: CheckpointResult[]) {
    if (!printer) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      const score = computeScore(finalResults);
      const hasIssues = finalResults.some(r => r.status === 'fail');
      const status = hasIssues ? 'issues_found' : 'completed';

      const ins = await db.runAsync(
        `INSERT INTO inspections (printer_id, inspection_type, status, overall_score, completed_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [printer.id!, inspectionType, status, score]
      );
      const inspectionId = ins.lastInsertRowId;

      for (const r of finalResults) {
        await db.runAsync(
          `INSERT INTO inspection_results (inspection_id, check_point, title, status, notes, photo_uri)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [inspectionId, r.checkpoint.key, r.checkpoint.title, r.status,
           r.notes || null, r.photoUri ?? null]
        );
      }
      setWizardStep('results');
    } finally {
      setSaving(false);
    }
  }

  function computeScore(res: CheckpointResult[]): number {
    const active = res.filter(r => r.status !== 'skip');
    if (active.length === 0) return 100;
    const weights: Record<CheckPointStatus, number> = { pass: 1, warn: 0.5, fail: 0, skip: 1 };
    const total = active.reduce((s, r) => s + weights[r.status], 0);
    return Math.round((total / active.length) * 100);
  }

  // ─── Setup screen (choose printer) ───────────────────────────
  if (wizardStep === 'setup') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.pageTitle}>Visual Inspection</Text>
        <Text style={styles.pageSubtitle}>Choose a printer and inspection type.</Text>

        <Text style={styles.sectionLabel}>SELECT PRINTER</Text>
        {printers.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.card, selectedPrinterId === p.id && styles.cardSelected]}
            onPress={() => { setSelectedPrinterId(p.id!); setPrinter(p); }}
          >
            <Text style={styles.cardTitle}>{p.name}</Text>
            <Text style={styles.cardSub}>{p.brand} {p.model}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>INSPECTION TYPE</Text>
        {[
          { type: 'quick' as const, label: 'Quick Check', time: '~5 minutes', desc: '5 key checks — perfect before a long print' },
          { type: 'full'  as const, label: 'Full Inspection', time: '~15 minutes', desc: 'All checkpoints — do monthly' },
        ].map(opt => (
          <TouchableOpacity
            key={opt.type}
            style={[styles.card, inspectionType === opt.type && styles.cardSelected]}
            onPress={() => setInspectionType(opt.type)}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{opt.label}</Text>
              <Text style={[styles.badge, { backgroundColor: C.info + '22', color: C.info }]}>{opt.time}</Text>
            </View>
            <Text style={styles.cardSub}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.primaryBtn, !selectedPrinterId && styles.btnDisabled]}
          onPress={() => selectedPrinterId && setWizardStep('safety')}
        >
          <Text style={styles.primaryBtnText}>Start Inspection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Safety reminder ──────────────────────────────────────────
  if (wizardStep === 'safety') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={[styles.safetyBox, { borderColor: C.warning }]}>
          <Ionicons name="warning" size={32} color={C.warning} />
          <Text style={[styles.safetyTitle, { color: C.warning }]}>Before You Start</Text>
          <Text style={styles.safetyBody}>
            Make sure the printer is powered off and cooled down before physically touching any
            components. Some checks can be done while on — these will be labeled.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setWizardStep('inspect')}>
          <Text style={styles.primaryBtnText}>Got it — Start Inspection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.skipText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Results screen ───────────────────────────────────────────
  if (wizardStep === 'results') {
    const score = computeScore(results);
    const actionItems = results.filter(r => r.status === 'fail' || r.status === 'warn');
    const passes = results.filter(r => r.status === 'pass');
    const healthColor = score >= 80 ? C.healthy : score >= 50 ? C.warning : C.critical;
    const healthLabel = score >= 80 ? 'Looking good!' : score >= 50 ? 'Some things to watch' : 'Needs attention';

    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.pageTitle}>Inspection Complete</Text>

        {/* Health score summary */}
        <View style={[styles.scoreCard, { backgroundColor: healthColor + '18', borderColor: healthColor }]}>
          <Text style={[styles.scoreNumber, { color: healthColor }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color: healthColor }]}>{healthLabel}</Text>
          <Text style={styles.scoreDesc}>{printer?.name} · {inspectionType === 'quick' ? 'Quick Check' : 'Full Inspection'}</Text>
        </View>

        {/* Action items — Diagnosis card format per CLAUDE.md */}
        {actionItems.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WHAT YOU SHOULD DO</Text>
            {actionItems.map(r => {
              const card = r.checkpoint.diagnosis[r.status as 'warn' | 'fail'];
              const borderColor = r.status === 'fail' ? C.critical : C.warning;
              const riskColors: Record<string, string> = {
                none: C.healthy, low: C.healthy, medium: C.warning, high: C.critical,
              };
              return (
                <View key={r.checkpoint.key} style={[styles.diagnosisCard, { borderLeftColor: borderColor }]}>
                  {/* Photo if taken */}
                  {r.photoUri && <Image source={{ uri: r.photoUri }} style={styles.resultPhoto} />}

                  {/* Checkpoint name */}
                  <Text style={styles.diagnosisArea}>{r.checkpoint.title}</Text>

                  {/* Diagnosis */}
                  <Text style={[styles.diagnosisHeadline, { color: borderColor }]}>{card.headline}</Text>

                  {/* Risk pill */}
                  <View style={[styles.riskPill, { backgroundColor: riskColors[card.risk] + '22' }]}>
                    <Text style={[styles.riskText, { color: riskColors[card.risk] }]}>
                      Risk: {card.risk.charAt(0).toUpperCase() + card.risk.slice(1)}
                    </Text>
                  </View>

                  {/* What this means */}
                  <Text style={styles.diagnosisLabel}>What this means</Text>
                  <Text style={styles.diagnosisBody}>{card.whatThisMeans}</Text>

                  {/* Recommended treatment */}
                  <Text style={styles.diagnosisLabel}>What to do</Text>
                  <Text style={styles.diagnosisBody}>{card.recommendedAction}</Text>

                  {/* Time + difficulty */}
                  {(card.estimatedTime || card.difficulty) && (
                    <View style={styles.diagnosisMeta}>
                      {card.estimatedTime && (
                        <View style={styles.diagnosisMetaChip}>
                          <Ionicons name="time-outline" size={13} color={C.textHint} />
                          <Text style={styles.diagnosisMetaText}>{card.estimatedTime}</Text>
                        </View>
                      )}
                      {card.difficulty && (
                        <View style={styles.diagnosisMetaChip}>
                          <Ionicons name="build-outline" size={13} color={C.textHint} />
                          <Text style={styles.diagnosisMetaText}>
                            {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* User notes */}
                  {r.notes ? (
                    <>
                      <Text style={styles.diagnosisLabel}>Your notes</Text>
                      <Text style={styles.diagnosisBody}>{r.notes}</Text>
                    </>
                  ) : null}
                </View>
              );
            })}
          </>
        )}

        {/* Passing items */}
        {passes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>ALL CLEAR</Text>
            {passes.map(r => (
              <View key={r.checkpoint.key} style={styles.passRow}>
                <Ionicons name="checkmark-circle" size={20} color={C.healthy} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.passTitle}>{r.checkpoint.title}</Text>
                  <Text style={styles.passDesc}>{r.checkpoint.diagnosis.pass.headline}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {actionItems.length === 0 && (
          <View style={styles.allClearBanner}>
            <Ionicons name="checkmark-circle" size={48} color={C.healthy} />
            <Text style={[styles.allClearText, { color: C.healthy }]}>Everything looks great!</Text>
            <Text style={styles.allClearSub}>Your printer passed all checks. Keep up the maintenance and it should keep printing reliably.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: Spacing.lg }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Inspection checkpoint wizard ────────────────────────────
  if (!currentCheckpoint) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: C.primary }]} />
      </View>
      <Text style={styles.progressLabel}>
        {checkpointIndex + 1} of {checkpoints.length} — {inspectionType === 'quick' ? 'Quick Check' : 'Full Inspection'}
      </Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Checkpoint title */}
        <Text style={styles.checkTitle}>{currentCheckpoint.title}</Text>
        <Text style={styles.checkDesc}>{currentCheckpoint.description}</Text>

        {/* Good vs Bad comparison — visual-first, Grandparent Test */}
        <View style={styles.compareRow}>
          <View style={[styles.compareBox, { borderColor: C.healthy + '60', backgroundColor: C.healthy + '12' }]}>
            <Ionicons name="checkmark-circle" size={18} color={C.healthy} />
            <Text style={[styles.compareTitle, { color: C.healthy }]}>Looks good if...</Text>
            <Text style={styles.compareBody}>{currentCheckpoint.whatGoodLooksLike}</Text>
          </View>
          <View style={[styles.compareBox, { borderColor: C.warning + '60', backgroundColor: C.warning + '12' }]}>
            <Ionicons name="warning" size={18} color={C.warning} />
            <Text style={[styles.compareTitle, { color: C.warning }]}>Needs help if...</Text>
            <Text style={styles.compareBody}>{currentCheckpoint.whatBadLooksLike}</Text>
          </View>
        </View>

        {/* Camera section — core feature, guided by specific camera target */}
        <View style={[styles.cameraGuideBox, { borderColor: C.primary + '50', backgroundColor: C.primaryDim }]}>
          <View style={styles.cameraGuideHeader}>
            <Ionicons name="camera" size={20} color={C.primary} />
            <Text style={[styles.cameraGuideTitle, { color: C.primary }]}>How to photograph this</Text>
          </View>
          <Text style={styles.cameraGuideText}>{currentCheckpoint.cameraTarget}</Text>
        </View>

        {currentPhoto ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: currentPhoto }} style={styles.photo} />
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setCurrentPhoto(undefined)}>
              <Ionicons name="close-circle" size={28} color={C.critical} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color={C.primary} />
              <Text style={styles.photoBtnText}>Open Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoBtn, { borderColor: C.border }]} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={24} color={C.textSecondary} />
              <Text style={[styles.photoBtnText, { color: C.textSecondary }]}>Use Existing Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status selection */}
        <Text style={styles.sectionLabel}>WHAT DID YOU SEE?</Text>
        <View style={styles.statusRow}>
          {([
            { key: 'pass', label: 'Good',    icon: 'checkmark-circle', color: C.healthy },
            { key: 'warn', label: 'Concern', icon: 'warning',          color: C.warning },
            { key: 'fail', label: 'Problem', icon: 'close-circle',     color: C.critical },
            { key: 'skip', label: 'Skip',    icon: 'remove-circle',    color: C.textHint },
          ] as const).map(s => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statusBtn,
                { borderColor: currentStatus === s.key ? s.color : C.border },
                currentStatus === s.key && { backgroundColor: s.color + '20' },
              ]}
              onPress={() => setCurrentStatus(s.key)}
            >
              <Ionicons name={s.icon as any} size={24} color={s.color} />
              <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionLabel}>NOTES (OPTIONAL)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Describe what you see..."
          placeholderTextColor={C.textHint}
          value={currentNotes}
          onChangeText={setCurrentNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Next button */}
        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.btnDisabled]}
          onPress={advanceCheckpoint}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.textOnPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {checkpointIndex + 1 < checkpoints.length ? 'Next Checkpoint →' : 'Finish Inspection'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.bg },
    centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    scrollContent:{ padding: Spacing.md, paddingBottom: insets.bottom + 80 },

    pageTitle:    { ...Typography.h2, color: C.textPrimary, padding: Spacing.md, paddingBottom: Spacing.xs },
    pageSubtitle: { ...Typography.body, color: C.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    sectionLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.sm, marginTop: Spacing.md },

    card:         { backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 2, borderColor: 'transparent', ...Shadow.card },
    cardSelected: { borderColor: C.primary },
    cardTitle:    { ...Typography.bodyBold, color: C.textPrimary },
    cardSub:      { ...Typography.small, color: C.textSecondary, marginTop: 2 },
    rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge:        { ...Typography.caption, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, fontWeight: '600' },

    progressBar:  { height: 4, backgroundColor: C.border, marginTop: Spacing.xs },
    progressFill: { height: 4, borderRadius: 2, transition: undefined as any },
    progressLabel:{ ...Typography.caption, color: C.textHint, textAlign: 'center', paddingVertical: Spacing.xs },

    // Checkpoint wizard
    checkTitle:   { ...Typography.h3, color: C.textPrimary, marginBottom: Spacing.sm },
    checkDesc:    { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md, lineHeight: 28 },

    // Good vs Bad comparison boxes
    compareRow:   { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    compareBox:   { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
    compareTitle: { ...Typography.smallBold, marginTop: 2 },
    compareBody:  { ...Typography.small, color: C.textSecondary, lineHeight: 20 },

    // Camera guidance box
    cameraGuideBox:    { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
    cameraGuideHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
    cameraGuideTitle:  { ...Typography.smallBold },
    cameraGuideText:   { ...Typography.body, color: C.textSecondary, lineHeight: 26 },

    photoContainer: { position: 'relative', marginBottom: Spacing.md },
    photo:          { width: '100%', height: 240, borderRadius: Radius.md },
    removePhotoBtn: { position: 'absolute', top: Spacing.xs, right: Spacing.xs },
    photoButtons:   { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    photoBtn: {
      flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: Spacing.xs, borderWidth: 2, borderColor: C.primary,
      borderRadius: Radius.lg, paddingVertical: Spacing.md,
    },
    photoBtnText: { ...Typography.smallBold, color: C.primary },

    // Status buttons — large, thumb-friendly
    statusRow:   { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
    statusBtn:   { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 2 },
    statusLabel: { ...Typography.small, marginTop: 4, fontWeight: '700' },

    notesInput: {
      backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.md, padding: Spacing.md,
      ...Typography.body, color: C.textPrimary, minHeight: 88,
    },

    primaryBtn:     { backgroundColor: C.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md + 4, paddingHorizontal: Spacing.lg, alignItems: 'center', marginTop: Spacing.md, ...Shadow.glow },
    primaryBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    btnDisabled:    { opacity: 0.4 },
    skipBtn:        { alignItems: 'center', padding: Spacing.md },
    skipText:       { ...Typography.small, color: C.textHint },

    safetyBox:    { borderWidth: 2, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.xl, width: '100%' },
    safetyTitle:  { ...Typography.h3, marginTop: Spacing.sm, marginBottom: Spacing.sm },
    safetyBody:   { ...Typography.body, color: C.textSecondary, textAlign: 'center', lineHeight: 28 },

    scoreCard:    { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
    scoreNumber:  { fontSize: 64, fontWeight: '700' },
    scoreLabel:   { ...Typography.h3, marginBottom: Spacing.xs },
    scoreDesc:    { ...Typography.small, color: C.textSecondary },

    // Diagnosis cards (results screen) — per CLAUDE.md Grandparent Test format
    diagnosisCard:     { backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 5, ...Shadow.card },
    diagnosisArea:     { ...Typography.caption, color: C.textHint, marginBottom: 4 },
    diagnosisHeadline: { ...Typography.h3, marginBottom: Spacing.sm },
    riskPill:          { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginBottom: Spacing.sm },
    riskText:          { ...Typography.smallBold },
    diagnosisLabel:    { ...Typography.smallBold, color: C.textSecondary, marginTop: Spacing.sm, marginBottom: 4 },
    diagnosisBody:     { ...Typography.body, color: C.textPrimary, lineHeight: 26 },
    diagnosisMeta:     { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    diagnosisMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    diagnosisMetaText: { ...Typography.caption, color: C.textHint },

    resultPhoto:  { width: '100%', height: 180, borderRadius: Radius.md, marginBottom: Spacing.sm },

    // Pass rows (results screen)
    passRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs },
    passTitle: { ...Typography.bodyBold, color: C.textPrimary },
    passDesc:  { ...Typography.small, color: C.textSecondary, marginTop: 2 },

    // All clear banner
    allClearBanner: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
    allClearText:   { ...Typography.h2, textAlign: 'center' },
    allClearSub:    { ...Typography.body, color: C.textSecondary, textAlign: 'center', lineHeight: 26 },
  });
}
