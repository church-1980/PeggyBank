import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '../database/database';
import { getCheckpointsForType } from '../data/inspectionCheckpoints';
import { CheckpointDefinition, CheckPointStatus, Printer } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 'setup' | 'safety' | 'inspect' | 'results';

// The 6 educational stages per checkpoint — each teaches something standalone.
type CheckpointStage = 'part_id' | 'good' | 'bad' | 'camera' | 'diagnosis' | 'repair';

const STAGE_ORDER: CheckpointStage[] = ['part_id', 'good', 'bad', 'camera', 'diagnosis', 'repair'];

const STAGE_GOALS: Record<CheckpointStage, string> = {
  part_id:   'Learn what this part is',
  good:      'See what healthy looks like',
  bad:       'Recognize a problem',
  camera:    'Find this part on your own printer',
  diagnosis: 'Understand what was found',
  repair:    'Understand how to fix it',
};

interface CheckpointResult {
  checkpoint: CheckpointDefinition;
  status: CheckPointStatus;
  notes: string;
  photoUri?: string;
  stagesCompleted: CheckpointStage[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InspectionScreen({ navigation, route }: any) {
  const { printerId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  // Wizard-level state
  const [wizardStep, setWizardStep] = useState<WizardStep>(printerId ? 'safety' : 'setup');
  const [inspectionType, setInspectionType] = useState<'quick' | 'full'>('quick');
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<number | null>(printerId ?? null);
  const [saving, setSaving] = useState(false);

  // Checkpoint-level state
  const [checkpointIndex, setCheckpointIndex] = useState(0);
  const [checkpointStage, setCheckpointStage] = useState<CheckpointStage>('part_id');
  const [stagesCompleted, setStagesCompleted] = useState<CheckpointStage[]>([]);
  const [results, setResults] = useState<CheckpointResult[]>([]);

  // Per-checkpoint input state
  const [currentStatus, setCurrentStatus] = useState<CheckPointStatus | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState<string | undefined>();

  const checkpoints = useMemo(
    () => (printer ? getCheckpointsForType(printer.printer_type as 'FDM' | 'Resin', inspectionType === 'quick') : []),
    [printer, inspectionType]
  );
  const currentCheckpoint = checkpoints[checkpointIndex];
  const checkpointProgress = checkpoints.length > 0 ? (checkpointIndex / checkpoints.length) : 0;

  const loadPrinters = useCallback(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Printer>(`SELECT * FROM printers WHERE is_active = 1`);
    setPrinters(rows);
    if (printerId) {
      const found = rows.find((p: Printer) => p.id === printerId);
      if (found) setPrinter(found);
    }
  }, [printerId]);

  React.useEffect(() => { loadPrinters(); }, [loadPrinters]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function resetCheckpointState() {
    setCurrentStatus(null);
    setCurrentNotes('');
    setCurrentPhoto(undefined);
    setStagesCompleted([]);
    setCheckpointStage('part_id');
  }

  function computeScore(res: CheckpointResult[]): number {
    const active = res.filter(r => r.status !== 'skip');
    if (active.length === 0) return 100;
    const weights: Record<CheckPointStatus, number> = { pass: 1, warn: 0.5, fail: 0, skip: 1 };
    const total = active.reduce((s, r) => s + weights[r.status], 0);
    return Math.round((total / active.length) * 100);
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
      setResults(finalResults);
      setWizardStep('results');
    } finally {
      setSaving(false);
    }
  }

  // Called when the user completes or skips all stages for the current checkpoint.
  function finishCheckpoint(completedStages: CheckpointStage[]) {
    const newResult: CheckpointResult = {
      checkpoint: currentCheckpoint,
      status: currentStatus ?? 'skip',
      notes: currentNotes,
      photoUri: currentPhoto,
      stagesCompleted: completedStages,
    };
    const newResults = [...results, newResult];

    if (checkpointIndex + 1 < checkpoints.length) {
      setResults(newResults);
      setCheckpointIndex((i: number) => i + 1);
      resetCheckpointState();
    } else {
      saveInspection(newResults);
    }
  }

  // Called from the stage advance button — routes to next stage or finishes checkpoint.
  function advanceStage() {
    const completedNow: CheckpointStage[] = [...stagesCompleted, checkpointStage];
    setStagesCompleted(completedNow);

    if (checkpointStage === 'diagnosis') {
      // Pass or skip — no repair needed
      if (currentStatus === 'pass' || currentStatus === 'skip') {
        finishCheckpoint(completedNow);
        return;
      }
      // Warn or fail — show repair stage
      setCheckpointStage('repair');
      return;
    }

    if (checkpointStage === 'repair') {
      finishCheckpoint(completedNow);
      return;
    }

    const nextIdx = STAGE_ORDER.indexOf(checkpointStage) + 1;
    setCheckpointStage(STAGE_ORDER[nextIdx]);
  }

  // User chose to exit early — save partial progress and show results.
  function exitEarly() {
    const partialResults = [...results];
    const hasPartialProgress = stagesCompleted.length > 0 || currentStatus != null;
    if (hasPartialProgress) {
      partialResults.push({
        checkpoint: currentCheckpoint,
        status: currentStatus ?? 'skip',
        notes: currentNotes,
        photoUri: currentPhoto,
        stagesCompleted,
      });
    }
    if (partialResults.length === 0) {
      navigation.goBack();
      return;
    }
    saveInspection(partialResults);
  }

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setCurrentPhoto(result.assets[0].uri);
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setCurrentPhoto(result.assets[0].uri);
  }

  // ─── Setup Screen ─────────────────────────────────────────────────────────

  if (wizardStep === 'setup') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}
      >
        <Text style={styles.pageTitle}>Visual Inspection</Text>
        <Text style={styles.pageSubtitle}>Choose your printer and how thorough you want to be.</Text>

        <Text style={styles.sectionLabel}>SELECT PRINTER</Text>
        {printers.map((p: Printer) => (
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
        {([
          { type: 'quick' as const, label: 'Quick Check',     time: '~5 minutes',  desc: '5 key checks — perfect before a long print' },
          { type: 'full'  as const, label: 'Full Inspection', time: '~15 minutes', desc: 'All checkpoints — do monthly' },
        ]).map(opt => (
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

        <View style={[styles.infoBox, { backgroundColor: C.info + '12', borderColor: C.info + '40' }]}>
          <Ionicons name="school-outline" size={18} color={C.info} />
          <Text style={[styles.infoText, { color: C.info }]}>
            You can stop at any time and still learn something. Each part teaches you something new about your printer.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, !selectedPrinterId && styles.btnDisabled]}
          onPress={() => selectedPrinterId && setWizardStep('safety')}
        >
          <Text style={styles.primaryBtnText}>Start Inspection</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Safety Reminder ──────────────────────────────────────────────────────

  if (wizardStep === 'safety') {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <View style={[styles.safetyBox, { borderColor: C.warning }]}>
          <Ionicons name="warning" size={32} color={C.warning} />
          <Text style={[styles.safetyTitle, { color: C.warning }]}>Before You Start</Text>
          <Text style={styles.safetyBody}>
            Make sure your printer is powered off and has fully cooled down before touching any part.
            {'\n\n'}
            Some visual checks can be done while the printer is on — those will be clearly labeled "safe while on."
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setWizardStep('inspect')}>
          <Text style={styles.primaryBtnText}>Understood — Let's Begin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.skipText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Results Screen ───────────────────────────────────────────────────────

  if (wizardStep === 'results') {
    const score = computeScore(results);
    const actionItems = results.filter((r: CheckpointResult) => r.status === 'fail' || r.status === 'warn');
    const passes = results.filter((r: CheckpointResult) => r.status === 'pass');
    const healthColor = score >= 80 ? C.healthy : score >= 50 ? C.warning : C.critical;
    const healthLabel = score >= 80 ? 'Looking good!' : score >= 50 ? 'Some things to watch' : 'Needs attention';
    const totalStagesCompleted = results.reduce((sum: number, r: CheckpointResult) => sum + r.stagesCompleted.length, 0);
    const partsInspected = results.length;
    const hasScored = results.some((r: CheckpointResult) => r.status !== 'skip');
    const riskColors: Record<string, string> = {
      none: C.healthy, low: C.healthy, medium: C.warning, high: C.critical,
    };

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}
      >
        <Text style={styles.pageTitle}>What You Learned</Text>

        {/* Learning summary — shown even for partial inspections */}
        <View style={[styles.learnedCard, { backgroundColor: C.info + '12', borderColor: C.info + '40' }]}>
          <Ionicons name="school" size={24} color={C.info} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.learnedTitle, { color: C.info }]}>Session complete</Text>
            <Text style={styles.learnedBody}>
              You explored {partsInspected} {partsInspected === 1 ? 'part' : 'parts'} and completed {totalStagesCompleted} learning {totalStagesCompleted === 1 ? 'stage' : 'stages'}.
              Every stage you finished has made you a better printer owner.
            </Text>
          </View>
        </View>

        {/* Health score — only when at least one status was chosen */}
        {hasScored && (
          <View style={[styles.scoreCard, { backgroundColor: healthColor + '18', borderColor: healthColor }]}>
            <Text style={[styles.scoreNumber, { color: healthColor }]}>{score}</Text>
            <Text style={[styles.scoreLabel, { color: healthColor }]}>{healthLabel}</Text>
            <Text style={styles.scoreDesc}>{printer?.name} · {inspectionType === 'quick' ? 'Quick Check' : 'Full Inspection'}</Text>
          </View>
        )}

        {/* Action items with diagnosis cards */}
        {actionItems.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WHAT YOU SHOULD DO</Text>
            {actionItems.map((r: CheckpointResult) => {
              const card = r.checkpoint.diagnosis[r.status as 'warn' | 'fail'];
              const borderColor = r.status === 'fail' ? C.critical : C.warning;
              const diffEmoji = card.difficulty === 'easy' ? '🟢' : card.difficulty === 'moderate' ? '🟡' : '🔴';
              return (
                <View key={r.checkpoint.key} style={[styles.diagnosisCard, { borderLeftColor: borderColor }]}>
                  {r.photoUri && <Image source={{ uri: r.photoUri }} style={styles.resultPhoto} />}
                  <Text style={styles.diagnosisArea}>{r.checkpoint.title}</Text>
                  <Text style={[styles.diagnosisHeadline, { color: borderColor }]}>{card.headline}</Text>

                  <View style={[styles.riskPill, { backgroundColor: (riskColors[card.risk] ?? C.textHint) + '22' }]}>
                    <Text style={[styles.riskText, { color: riskColors[card.risk] ?? C.textHint }]}>
                      Risk: {card.risk.charAt(0).toUpperCase() + card.risk.slice(1)}
                    </Text>
                  </View>

                  <Text style={styles.diagnosisLabel}>What this means</Text>
                  <Text style={styles.diagnosisBody}>{card.whatThisMeans}</Text>

                  <Text style={styles.diagnosisLabel}>What to do</Text>
                  <Text style={styles.diagnosisBody}>{card.recommendedAction}</Text>

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
                          <Text style={styles.repairDiffEmoji}>{diffEmoji}</Text>
                          <Text style={styles.diagnosisMetaText}>
                            {card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

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
            {passes.map((r: CheckpointResult) => (
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

        {actionItems.length === 0 && hasScored && (
          <View style={styles.allClearBanner}>
            <Ionicons name="checkmark-circle" size={48} color={C.healthy} />
            <Text style={[styles.allClearText, { color: C.healthy }]}>Everything looks great!</Text>
            <Text style={styles.allClearSub}>
              Your printer passed all checks. Keep up the maintenance and it should keep printing reliably.
            </Text>
          </View>
        )}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: Spacing.lg }]} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Checkpoint Stage Flow ────────────────────────────────────────────────

  if (!currentCheckpoint) return null;

  const partId  = currentCheckpoint.partIdentification;
  const guidance = currentCheckpoint.cameraGuidance;

  // How many stages this checkpoint has (repair is 6th, skipped for pass/skip results)
  const stageNumber = STAGE_ORDER.indexOf(checkpointStage) + 1;
  const stageTotal  = 6;

  // Shared header shown above all 6 stages
  const StageHeader = (
    <>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${checkpointProgress * 100}%`, backgroundColor: C.primary }]} />
      </View>
      <View style={styles.stageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stageCheckName} numberOfLines={1}>{currentCheckpoint.title}</Text>
          <Text style={styles.stageSubLabel}>
            Part {checkpointIndex + 1} of {checkpoints.length} · Step {stageNumber} of {stageTotal}
          </Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={exitEarly}>
          <Ionicons name="exit-outline" size={16} color={C.textHint} />
          <Text style={[styles.exitBtnText, { color: C.textHint }]}>Exit</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Goal banner (colour-coded per stage)
  function GoalBanner(color: string, goal: string) {
    return (
      <View style={[styles.goalBox, { backgroundColor: color + '14', borderColor: color + '44' }]}>
        <Ionicons name="school-outline" size={16} color={color} />
        <Text style={[styles.goalText, { color }]}>Goal: {goal}</Text>
      </View>
    );
  }

  // ─── Stage 1: Part Identification ────────────────────────────────────────

  if (checkpointStage === 'part_id') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {StageHeader}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {GoalBanner(C.info, STAGE_GOALS.part_id)}

          <Text style={styles.partName}>{partId.partName}</Text>
          <Text style={styles.partSimpleName}>{partId.simpleName}</Text>

          {/* Image placeholder — real images in a future release */}
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={44} color={C.textHint} />
            <Text style={[styles.imagePlaceholderText, { color: C.textHint }]}>Part photo — coming soon</Text>
          </View>

          <View style={styles.eduCard}>
            <Text style={styles.eduLabel}>WHAT DOES IT DO?</Text>
            <Text style={styles.eduBody}>{partId.purpose}</Text>
          </View>

          <View style={styles.eduCard}>
            <Text style={styles.eduLabel}>WHY DOES IT MATTER?</Text>
            <Text style={styles.eduBody}>{partId.whyItMatters}</Text>
          </View>

          <View style={styles.eduCard}>
            <Text style={styles.eduLabel}>COMMON PROBLEMS TO WATCH FOR</Text>
            {partId.commonProblems.map((prob: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: C.warning }]}>•</Text>
                <Text style={styles.bulletText}>{prob}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.eduCard, { backgroundColor: C.primary + '0E', borderColor: C.primary + '33' }]}>
            <Text style={[styles.eduLabel, { color: C.primary }]}>HOW OFTEN TO CHECK THIS</Text>
            <Text style={styles.eduBody}>{partId.maintenanceInterval}</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceStage}>
            <Text style={styles.primaryBtnText}>Got it — Show me what healthy looks like →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => finishCheckpoint([])}>
            <Text style={styles.skipText}>Skip this part entirely</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Stage 2: Good Example ────────────────────────────────────────────────

  if (checkpointStage === 'good') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {StageHeader}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {GoalBanner(C.healthy, STAGE_GOALS.good)}

          <Text style={styles.checkTitle}>This is what a healthy {partId.partName.toLowerCase()} looks like</Text>

          <View style={[styles.imagePlaceholder, { borderColor: C.healthy + '55', backgroundColor: C.healthy + '0A' }]}>
            <Ionicons name="checkmark-circle" size={44} color={C.healthy} />
            <Text style={[styles.imagePlaceholderText, { color: C.healthy }]}>Healthy example photo</Text>
            <Text style={[styles.imagePlaceholderSub, { color: C.textHint }]}>Coming in next update</Text>
          </View>

          <View style={[styles.compareBox, { borderColor: C.healthy + '60', backgroundColor: C.healthy + '0C' }]}>
            <View style={styles.compareBoxHeader}>
              <Ionicons name="checkmark-circle" size={20} color={C.healthy} />
              <Text style={[styles.compareBoxTitle, { color: C.healthy }]}>Looks good when...</Text>
            </View>
            <Text style={styles.compareBoxBody}>{currentCheckpoint.whatGoodLooksLike}</Text>
          </View>

          <View style={[styles.infoBox, { backgroundColor: C.healthy + '10', borderColor: C.healthy + '30' }]}>
            <Ionicons name="bulb-outline" size={16} color={C.healthy} />
            <Text style={[styles.infoText, { color: C.healthy }]}>
              Memorize this. Next time you look at your printer, you'll know right away if something's off.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceStage}>
            <Text style={styles.primaryBtnText}>Got it — Show me what problems look like →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => finishCheckpoint([...stagesCompleted, 'good'])}>
            <Text style={styles.skipText}>That's enough — I've already learned something, exit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Stage 3: Bad Example ─────────────────────────────────────────────────

  if (checkpointStage === 'bad') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {StageHeader}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {GoalBanner(C.warning, STAGE_GOALS.bad)}

          <Text style={styles.checkTitle}>This is what a problem looks like</Text>
          <Text style={styles.checkDesc}>
            Study this carefully. If your printer ever looks like this, the app will walk you through exactly what to do.
          </Text>

          <View style={[styles.imagePlaceholder, { borderColor: C.critical + '55', backgroundColor: C.critical + '0A' }]}>
            <Ionicons name="warning" size={44} color={C.critical} />
            <Text style={[styles.imagePlaceholderText, { color: C.critical }]}>Problem example photo</Text>
            <Text style={[styles.imagePlaceholderSub, { color: C.textHint }]}>Coming in next update</Text>
          </View>

          <View style={[styles.compareBox, { borderColor: C.critical + '60', backgroundColor: C.critical + '0C' }]}>
            <View style={styles.compareBoxHeader}>
              <Ionicons name="warning" size={20} color={C.critical} />
              <Text style={[styles.compareBoxTitle, { color: C.critical }]}>Needs attention when...</Text>
            </View>
            <Text style={styles.compareBoxBody}>{currentCheckpoint.whatBadLooksLike}</Text>
          </View>

          <View style={[styles.infoBox, { backgroundColor: C.info + '10', borderColor: C.info + '30' }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.info} />
            <Text style={[styles.infoText, { color: C.info }]}>
              Seeing a problem doesn't mean your printer is broken. It just means it needs a little care.
              You now know what to look for before it becomes a bigger issue.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceStage}>
            <Text style={styles.primaryBtnText}>I'll recognize that — Let me find it on my printer →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => finishCheckpoint([...stagesCompleted, 'bad'])}>
            <Text style={styles.skipText}>That's enough — I can recognize a problem now, exit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Stage 4: Camera Guidance ─────────────────────────────────────────────

  if (checkpointStage === 'camera') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {StageHeader}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {GoalBanner(C.primary, STAGE_GOALS.camera)}

          <Text style={styles.checkTitle}>Find the {partId.partName.toLowerCase()} on your own printer</Text>
          <Text style={styles.checkDesc}>{currentCheckpoint.description}</Text>

          {/* 5-step camera guidance */}
          <View style={styles.cameraStepsCard}>
            {([
              { n: 1, text: guidance.step1_find,     icon: 'search-outline'   as const },
              { n: 2, text: guidance.step2_match,    icon: 'image-outline'    as const },
              { n: 3, text: guidance.step3_distance, icon: 'resize-outline'   as const },
              { n: 4, text: guidance.step4_center,   icon: 'crop-outline'     as const },
              { n: 5, text: guidance.step5_action,   icon: 'camera-outline'   as const },
            ]).map(step => (
              <View key={step.n} style={styles.cameraStep}>
                <View style={[styles.cameraStepBadge, { backgroundColor: C.primary }]}>
                  <Text style={styles.cameraStepNum}>{step.n}</Text>
                </View>
                <Text style={styles.cameraStepText}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* Photo area */}
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

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceStage}>
            <Text style={styles.primaryBtnText}>
              {currentPhoto ? 'Good photo — What did you see? →' : 'Skip photo — Continue →'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => finishCheckpoint([...stagesCompleted, 'camera'])}>
            <Text style={styles.skipText}>I found it on my printer — that's enough, exit</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Stage 5: Diagnosis ───────────────────────────────────────────────────

  if (checkpointStage === 'diagnosis') {
    const borderColor =
      currentStatus === 'pass' ? C.healthy :
      currentStatus === 'warn' ? C.warning :
      currentStatus === 'fail' ? C.critical : C.border;
    const selectedCard = (currentStatus === 'pass' || currentStatus === 'warn' || currentStatus === 'fail')
      ? currentCheckpoint.diagnosis[currentStatus]
      : null;
    const riskColors: Record<string, string> = {
      none: C.healthy, low: C.healthy, medium: C.warning, high: C.critical,
    };
    const continueLabel =
      !currentStatus                                            ? 'Select what you saw to continue' :
      currentStatus === 'pass' || currentStatus === 'skip'
        ? (checkpointIndex + 1 < checkpoints.length ? 'Next Part →' : 'See Results') :
      'Show me how to fix this →';

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {StageHeader}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {GoalBanner(C.info, STAGE_GOALS.diagnosis)}

          <Text style={styles.checkTitle}>What did you see?</Text>

          {currentPhoto && (
            <Image source={{ uri: currentPhoto }} style={styles.diagnosisPhoto} />
          )}

          <Text style={styles.sectionLabel}>TAP THE ONE THAT MATCHES</Text>

          {([
            { key: 'pass' as const, label: 'Looks good',      desc: currentCheckpoint.whatGoodLooksLike,   icon: 'checkmark-circle' as const, color: C.healthy  },
            { key: 'warn' as const, label: 'Something looks off', desc: 'Not great but not a disaster',     icon: 'warning'          as const, color: C.warning  },
            { key: 'fail' as const, label: 'Clear problem',   desc: currentCheckpoint.whatBadLooksLike,    icon: 'close-circle'     as const, color: C.critical },
            { key: 'skip' as const, label: "I couldn't see it",  desc: "That's okay — skip this one",      icon: 'remove-circle'    as const, color: C.textHint },
          ]).map(s => (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statusCard,
                { borderColor: currentStatus === s.key ? s.color : C.border },
                currentStatus === s.key && { backgroundColor: s.color + '14' },
              ]}
              onPress={() => setCurrentStatus(s.key)}
            >
              <View style={styles.statusCardTop}>
                <Ionicons name={s.icon} size={24} color={s.color} />
                <Text style={[styles.statusCardLabel, { color: s.color }]}>{s.label}</Text>
                {currentStatus === s.key && <Ionicons name="checkmark-circle" size={18} color={s.color} style={{ marginLeft: 'auto' }} />}
              </View>
              <Text style={styles.statusCardDesc} numberOfLines={2}>{s.desc}</Text>
            </TouchableOpacity>
          ))}

          {/* Inline diagnosis card — educational even if user doesn't proceed */}
          {selectedCard && currentStatus !== 'skip' && (
            <View style={[styles.diagnosisCard, { borderLeftColor: borderColor }]}>
              <Text style={[styles.diagnosisHeadline, { color: borderColor }]}>{selectedCard.headline}</Text>

              <View style={[styles.riskPill, { backgroundColor: (riskColors[selectedCard.risk] ?? C.textHint) + '22' }]}>
                <Text style={[styles.riskText, { color: riskColors[selectedCard.risk] ?? C.textHint }]}>
                  Risk: {selectedCard.risk.charAt(0).toUpperCase() + selectedCard.risk.slice(1)}
                </Text>
              </View>

              <Text style={styles.diagnosisLabel}>What this means</Text>
              <Text style={styles.diagnosisBody}>{selectedCard.whatThisMeans}</Text>

              {currentStatus === 'pass' && (
                <Text style={[styles.diagnosisLabel, { color: C.healthy }]}>No action needed ✓</Text>
              )}
            </View>
          )}

          {/* Notes — only shown after a status is selected */}
          {currentStatus && (
            <>
              <Text style={styles.sectionLabel}>ADD A NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Describe what you noticed... (e.g. 'slight discoloration near tip')"
                placeholderTextColor={C.textHint}
                value={currentNotes}
                onChangeText={setCurrentNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, !currentStatus && styles.btnDisabled]}
            onPress={advanceStage}
            disabled={!currentStatus}
          >
            <Text style={styles.primaryBtnText}>{continueLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Stage 6: Repair ──────────────────────────────────────────────────────

  if (checkpointStage === 'repair') {
    const repairCard = currentStatus === 'warn'
      ? currentCheckpoint.diagnosis.warn
      : currentCheckpoint.diagnosis.fail;
    const accentColor = currentStatus === 'fail' ? C.critical : C.warning;
    const diffEmoji = repairCard.difficulty === 'easy' ? '🟢' : repairCard.difficulty === 'moderate' ? '🟡' : '🔴';
    const isLast = checkpointIndex + 1 >= checkpoints.length;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {StageHeader}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
          {GoalBanner(C.warning, STAGE_GOALS.repair)}

          <Text style={styles.checkTitle}>Here's what to do about this</Text>

          <View style={[styles.repairCard, { borderColor: accentColor + '60' }]}>
            <Text style={[styles.repairHeadline, { color: accentColor }]}>{repairCard.headline}</Text>

            <Text style={styles.diagnosisLabel}>What to do</Text>
            <Text style={styles.repairBody}>{repairCard.recommendedAction}</Text>

            {(repairCard.estimatedTime || repairCard.difficulty) && (
              <View style={styles.repairMeta}>
                {repairCard.estimatedTime && (
                  <View style={styles.repairMetaChip}>
                    <Ionicons name="time-outline" size={15} color={C.textSecondary} />
                    <Text style={styles.repairMetaText}>{repairCard.estimatedTime}</Text>
                  </View>
                )}
                {repairCard.difficulty && (
                  <View style={styles.repairMetaChip}>
                    <Text>{diffEmoji}</Text>
                    <Text style={styles.repairMetaText}>
                      {repairCard.difficulty.charAt(0).toUpperCase() + repairCard.difficulty.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Reassurance — not ready to fix is fine */}
          <View style={[styles.infoBox, { backgroundColor: C.info + '10', borderColor: C.info + '30' }]}>
            <Ionicons name="time-outline" size={16} color={C.info} />
            <Text style={[styles.infoText, { color: C.info }]}>
              Not ready to fix this right now? That's perfectly okay. This will appear in your results so you won't forget it.
            </Text>
          </View>

          {/* Step-by-step guide link */}
          {repairCard.guideKey && (
            <TouchableOpacity
              style={[styles.guideLink, { borderColor: C.primary + '50' }]}
              onPress={() => navigation.navigate('GuideDetail', { guideKey: repairCard.guideKey })}
            >
              <Ionicons name="book-outline" size={20} color={C.primary} />
              <Text style={[styles.guideLinkText, { color: C.primary }]}>Open Step-by-Step Repair Guide</Text>
              <Ionicons name="chevron-forward" size={18} color={C.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={() => finishCheckpoint([...stagesCompleted, 'repair'])}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.textOnPrimary} />
            ) : (
              <Text style={styles.primaryBtnText}>{isLast ? 'See Results' : 'Next Part →'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    centered:      { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    scrollContent: { padding: Spacing.md, paddingBottom: insets.bottom + 80 },

    // Text
    pageTitle:     { ...Typography.h2, color: C.textPrimary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
    pageSubtitle:  { ...Typography.body, color: C.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    sectionLabel:  { ...Typography.label, color: C.textHint, marginBottom: Spacing.sm, marginTop: Spacing.md },

    // Setup cards
    card:          { backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 2, borderColor: 'transparent', ...Shadow.card },
    cardSelected:  { borderColor: C.primary },
    cardTitle:     { ...Typography.bodyBold, color: C.textPrimary },
    cardSub:       { ...Typography.small, color: C.textSecondary, marginTop: 2 },
    rowBetween:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge:         { ...Typography.caption, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, fontWeight: '600' },

    // Info / tip boxes
    infoBox:       { flexDirection: 'row', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'flex-start' },
    infoText:      { ...Typography.small, flex: 1, lineHeight: 20 },

    // Safety screen
    safetyBox:     { borderWidth: 2, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.xl, width: '100%' },
    safetyTitle:   { ...Typography.h3, marginTop: Spacing.sm, marginBottom: Spacing.sm },
    safetyBody:    { ...Typography.body, color: C.textSecondary, textAlign: 'center', lineHeight: 28 },

    // Progress + stage header
    progressBar:      { height: 4, backgroundColor: C.border },
    progressFill:     { height: 4, borderRadius: 2 },
    stageHeaderRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: C.border + '44' },
    stageCheckName:   { ...Typography.bodyBold, color: C.textPrimary },
    stageSubLabel:    { ...Typography.caption, color: C.textHint },
    exitBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.xs, paddingLeft: Spacing.sm },
    exitBtnText:      { ...Typography.caption },

    // Goal banner
    goalBox:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
    goalText: { ...Typography.smallBold, flex: 1 },

    // Part identification
    partName:       { ...Typography.h2, color: C.textPrimary, marginBottom: 4 },
    partSimpleName: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md, lineHeight: 26 },

    // Image placeholders
    imagePlaceholder: {
      height: 200, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed',
      borderColor: C.border, alignItems: 'center', justifyContent: 'center',
      gap: Spacing.xs, backgroundColor: C.bgCard, marginBottom: Spacing.md,
    },
    imagePlaceholderText: { ...Typography.smallBold },
    imagePlaceholderSub:  { ...Typography.caption },

    // Education cards
    eduCard:  { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
    eduLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.xs },
    eduBody:  { ...Typography.body, color: C.textPrimary, lineHeight: 26 },

    // Bullet lists
    bulletRow:  { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
    bullet:     { ...Typography.bodyBold, lineHeight: 26 },
    bulletText: { ...Typography.body, color: C.textPrimary, flex: 1, lineHeight: 26 },

    // Compare boxes (good/bad full-width)
    compareBox:       { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
    compareBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    compareBoxTitle:  { ...Typography.bodyBold },
    compareBoxBody:   { ...Typography.body, color: C.textPrimary, lineHeight: 26 },

    // Check titles + descriptions
    checkTitle: { ...Typography.h3, color: C.textPrimary, marginBottom: Spacing.sm },
    checkDesc:  { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md, lineHeight: 26 },

    // Camera guidance steps card
    cameraStepsCard: { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
    cameraStep:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    cameraStepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
    cameraStepNum:   { ...Typography.smallBold, color: '#fff' },
    cameraStepText:  { ...Typography.body, color: C.textPrimary, flex: 1, lineHeight: 26 },

    // Photo
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

    // Diagnosis-stage status cards
    statusCard:      { backgroundColor: C.bgCard, borderWidth: 2, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
    statusCardTop:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
    statusCardLabel: { ...Typography.bodyBold },
    statusCardDesc:  { ...Typography.small, color: C.textSecondary, lineHeight: 20, marginLeft: 32 },

    // Diagnosis photo (at top of diagnosis stage)
    diagnosisPhoto: { width: '100%', height: 200, borderRadius: Radius.md, marginBottom: Spacing.md },

    // Notes input
    notesInput: {
      backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.md, padding: Spacing.md,
      ...Typography.body, color: C.textPrimary, minHeight: 88,
    },

    // Diagnosis cards (results + inline diagnosis stage)
    diagnosisCard:     { backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 5, ...Shadow.card },
    diagnosisArea:     { ...Typography.caption, color: C.textHint, marginBottom: 4 },
    diagnosisHeadline: { ...Typography.h3, marginBottom: Spacing.sm },
    riskPill:          { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginBottom: Spacing.sm },
    riskText:          { ...Typography.smallBold },
    diagnosisLabel:    { ...Typography.smallBold, color: C.textSecondary, marginTop: Spacing.sm, marginBottom: 4 },
    diagnosisBody:     { ...Typography.body, color: C.textPrimary, lineHeight: 26 },
    diagnosisMeta:     { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
    diagnosisMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    diagnosisMetaText: { ...Typography.caption, color: C.textHint },
    repairDiffEmoji:   { fontSize: 13 },
    resultPhoto:       { width: '100%', height: 180, borderRadius: Radius.md, marginBottom: Spacing.sm },

    // Repair stage card
    repairCard:     { backgroundColor: C.bgCard, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.card },
    repairHeadline: { ...Typography.h3, marginBottom: Spacing.sm },
    repairBody:     { ...Typography.body, color: C.textPrimary, lineHeight: 26, marginBottom: Spacing.sm },
    repairMeta:     { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, flexWrap: 'wrap' },
    repairMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    repairMetaText: { ...Typography.smallBold, color: C.textSecondary },

    // Guide link button
    guideLink:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md },
    guideLinkText: { ...Typography.bodyBold, flex: 1 },

    // Results screen
    learnedCard:  { flexDirection: 'row', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'flex-start' },
    learnedTitle: { ...Typography.bodyBold, marginBottom: 4 },
    learnedBody:  { ...Typography.small, color: C.textSecondary, lineHeight: 20 },

    scoreCard:    { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
    scoreNumber:  { fontSize: 64, fontWeight: '700' },
    scoreLabel:   { ...Typography.h3, marginBottom: Spacing.xs },
    scoreDesc:    { ...Typography.small, color: C.textSecondary },

    passRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs },
    passTitle: { ...Typography.bodyBold, color: C.textPrimary },
    passDesc:  { ...Typography.small, color: C.textSecondary, marginTop: 2 },

    allClearBanner: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
    allClearText:   { ...Typography.h2, textAlign: 'center' },
    allClearSub:    { ...Typography.body, color: C.textSecondary, textAlign: 'center', lineHeight: 26 },

    // Buttons
    primaryBtn:     { backgroundColor: C.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md + 4, paddingHorizontal: Spacing.lg, alignItems: 'center', marginTop: Spacing.md, ...Shadow.glow },
    primaryBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    btnDisabled:    { opacity: 0.4 },
    skipBtn:        { alignItems: 'center', padding: Spacing.md },
    skipText:       { ...Typography.small, color: C.textHint },
  });
}
