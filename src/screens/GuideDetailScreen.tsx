import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { Guide, GuideStep, GuideDifficulty } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

const DIFFICULTY_CONFIG: Record<GuideDifficulty, { label: string; color: string }> = {
  beginner:     { label: '🟢 Beginner',     color: '#2CC9A8' },
  intermediate: { label: '🟡 Intermediate', color: '#F5A623' },
  advanced:     { label: '🔴 Advanced',     color: '#E84855' },
};

export default function GuideDetailScreen({ navigation, route }: any) {
  const { guideId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [guide, setGuide] = useState<Guide | null>(null);
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [safetyDismissed, setSafetyDismissed] = useState(false);
  const [started, setStarted] = useState(false);

  const loadGuide = useCallback(async () => {
    const db = await getDatabase();
    const g = await db.getFirstAsync<Guide>(`SELECT * FROM guides WHERE id = ?`, [guideId]);
    const s = await db.getAllAsync<GuideStep>(
      `SELECT * FROM guide_steps WHERE guide_id = ? ORDER BY step_number`,
      [guideId]
    );
    setGuide(g ?? null);
    setSteps(s);
  }, [guideId]);

  React.useEffect(() => { loadGuide(); }, [loadGuide]);

  if (!guide) return null;

  const warnings: string[] = JSON.parse(guide.safety_warnings_json ?? '[]');
  const tools: string[] = JSON.parse(guide.tools_needed_json ?? '[]');
  const parts: string[] = JSON.parse(guide.parts_needed_json ?? '[]');
  const diff = DIFFICULTY_CONFIG[guide.difficulty];
  const step = steps[currentStep];

  // ─── Overview screen ─────────────────────────────────────────
  if (!started) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.primary} />
          <Text style={styles.backText}>Guides</Text>
        </TouchableOpacity>

        <Text style={styles.guideTitle}>{guide.title}</Text>
        {guide.description ? <Text style={styles.guideDesc}>{guide.description}</Text> : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: diff.color + '22' }]}>
            <Text style={[styles.chipText, { color: diff.color }]}>{diff.label}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: C.bgElevated }]}>
            <Ionicons name="time-outline" size={12} color={C.textHint} />
            <Text style={[styles.chipText, { color: C.textHint }]}>{guide.estimated_minutes} min</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: C.bgElevated }]}>
            <Ionicons name="list-outline" size={12} color={C.textHint} />
            <Text style={[styles.chipText, { color: C.textHint }]}>{steps.length} steps</Text>
          </View>
        </View>

        {/* Safety warnings — shown prominently before user starts */}
        {warnings.length > 0 && (
          <View style={[styles.warningBox, { borderColor: C.critical, backgroundColor: C.critical + '12' }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={20} color={C.critical} />
              <Text style={[styles.warningTitle, { color: C.critical }]}>Safety Warnings</Text>
            </View>
            {warnings.map((w, i) => (
              <View key={i} style={styles.warningRow}>
                <Text style={[styles.warningBullet, { color: C.critical }]}>⚠</Text>
                <Text style={[styles.warningText, { color: C.textSecondary }]}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tools needed */}
        {tools.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tools You'll Need</Text>
            {tools.map((t, i) => (
              <View key={i} style={styles.listRow}>
                <Ionicons name="build-outline" size={16} color={C.primary} />
                <Text style={styles.listText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Parts needed */}
        {parts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts You May Need</Text>
            {parts.map((p, i) => (
              <View key={i} style={styles.listRow}>
                <Ionicons name="cube-outline" size={16} color={C.info} />
                <Text style={styles.listText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All steps overview */}
        <TouchableOpacity onPress={() => setShowAllSteps(!showAllSteps)} style={styles.allStepsToggle}>
          <Text style={styles.allStepsText}>{showAllSteps ? 'Hide' : 'Preview all'} {steps.length} steps</Text>
          <Ionicons name={showAllSteps ? 'chevron-up' : 'chevron-down'} size={16} color={C.primary} />
        </TouchableOpacity>
        {showAllSteps && steps.map((s, i) => (
          <View key={s.id} style={styles.stepPreview}>
            <Text style={styles.stepPreviewNum}>{i + 1}</Text>
            <Text style={styles.stepPreviewTitle}>{s.title}</Text>
          </View>
        ))}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.xl }]} onPress={() => setStarted(true)}>
          <Text style={styles.primaryBtnText}>Start Guide</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Step-by-step view ──────────────────────────────────────
  if (!step) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step counter */}
        <Text style={styles.stepCounter}>Step {currentStep + 1} of {steps.length}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>

        {/* Safety note for this step — shown in amber */}
        {step.safety_note && (
          <View style={[styles.safetyNote, { borderColor: C.warning, backgroundColor: C.warning + '14' }]}>
            <Ionicons name="warning" size={18} color={C.warning} />
            <Text style={[styles.safetyNoteText, { color: C.textSecondary }]}>{step.safety_note}</Text>
          </View>
        )}

        {/* Main instruction — large, readable, beginner-friendly */}
        <Text style={styles.stepInstruction}>{step.instruction}</Text>

        {/* Pro tip */}
        {step.tip && (
          <View style={[styles.tipBox, { borderColor: C.info + '60', backgroundColor: C.info + '12' }]}>
            <Ionicons name="bulb-outline" size={18} color={C.info} />
            <Text style={[styles.tipText, { color: C.textSecondary }]}>
              <Text style={{ color: C.info, fontWeight: '600' }}>Tip: </Text>
              {step.tip}
            </Text>
          </View>
        )}

        {/* Camera prompt */}
        {step.requires_camera ? (
          <View style={[styles.cameraPrompt, { borderColor: C.primary + '60', backgroundColor: C.primaryDim }]}>
            <Ionicons name="camera" size={22} color={C.primary} />
            <Text style={[styles.cameraPromptText, { color: C.textSecondary }]}>
              <Text style={{ color: C.primary, fontWeight: '600' }}>Photo recommended: </Text>
              Take a photo to document this step for your maintenance records.
            </Text>
          </View>
        ) : null}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backNavBtn}
              onPress={() => setCurrentStep(s => s - 1)}
            >
              <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
              <Text style={styles.backNavText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1 }]}
            onPress={() => {
              if (currentStep + 1 < steps.length) {
                setCurrentStep(s => s + 1);
              } else {
                Alert.alert(
                  'Guide Complete! 🎉',
                  `You've finished "${guide.title}". Would you like to log this in your maintenance history?`,
                  [
                    { text: 'Not Now', onPress: () => navigation.goBack() },
                    {
                      text: 'Log Maintenance',
                      onPress: () => navigation.navigate('LogMaintenance', {
                        taskKey: guide.guide_key,
                        taskTitle: guide.title,
                      }),
                    },
                  ]
                );
              }
            }}
          >
            <Text style={styles.primaryBtnText}>
              {currentStep + 1 < steps.length ? `Next Step →` : 'Finish Guide 🎉'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    scrollContent: { padding: Spacing.md, paddingBottom: insets.bottom + 80 },

    backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
    backText:  { ...Typography.smallBold, color: C.primary },

    guideTitle: { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.xs },
    guideDesc:  { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },

    metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
    chip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
    chipText: { ...Typography.caption, fontWeight: '600' },

    warningBox:    { borderWidth: 2, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
    warningTitle:  { ...Typography.bodyBold },
    warningRow:    { flexDirection: 'row', gap: Spacing.xs, marginBottom: 4 },
    warningBullet: { ...Typography.body, width: 20 },
    warningText:   { ...Typography.body, flex: 1, lineHeight: 24 },

    section:      { marginBottom: Spacing.lg },
    sectionTitle: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: Spacing.sm },
    listRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
    listText:     { ...Typography.body, color: C.textSecondary, flex: 1 },

    allStepsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: Spacing.sm },
    allStepsText:   { ...Typography.smallBold, color: C.primary },
    stepPreview:    { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, backgroundColor: C.bgCard, borderRadius: Radius.sm, marginBottom: 4 },
    stepPreviewNum: { ...Typography.smallBold, color: C.primary, width: 24 },
    stepPreviewTitle: { ...Typography.small, color: C.textSecondary, flex: 1 },

    progressBar:  { height: 4, backgroundColor: C.border },
    progressFill: { height: 4, backgroundColor: C.primary },

    stepCounter:     { ...Typography.caption, color: C.textHint, marginBottom: Spacing.xs },
    stepTitle:       { ...Typography.h3, color: C.textPrimary, marginBottom: Spacing.md },
    stepInstruction: { ...Typography.body, color: C.textPrimary, lineHeight: 30, marginBottom: Spacing.md },

    safetyNote:     { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md },
    safetyNoteText: { ...Typography.body, flex: 1, lineHeight: 24 },

    tipBox:    { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md },
    tipText:   { ...Typography.body, flex: 1, lineHeight: 24 },

    cameraPrompt:     { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md },
    cameraPromptText: { ...Typography.body, flex: 1, lineHeight: 24 },

    navRow:      { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
    backNavBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border },
    backNavText: { ...Typography.bodyBold, color: C.textSecondary },

    primaryBtn:     { backgroundColor: C.primary, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.glow },
    primaryBtnText: { ...Typography.bodyBold, color: C.textOnPrimary },
  });
}
