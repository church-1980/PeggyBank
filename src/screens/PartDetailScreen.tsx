import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAnatomyPartByKey, ANATOMY_CATEGORIES } from '../data/printerAnatomy';
import { AnatomyPart } from '../types/anatomy';
import AssetImage from '../components/AssetImage';
import { speakText } from '../lib/tts';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

// ─── Section components — required 6-section structure per CLAUDE.md ──────────
// 1. Part Identification  2. Healthy Example  3. Problem Example
// 4. Camera Guidance      5. Maintenance      6. Related

export default function PartDetailScreen({ navigation, route }: any) {
  const { partKey } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const part = useMemo(() => getAnatomyPartByKey(partKey), [partKey]);
  const categoryMeta = useMemo(
    () => part ? ANATOMY_CATEGORIES.find(c => c.key === part.category) : undefined,
    [part]
  );

  if (!part) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: C.critical }]}>Part not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.linkText, { color: C.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Section Header ─────────────────────────────────────────────────────────
  function SectionHeader({ number, title, color }: { number: number; title: string; color?: string }) {
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionNumBadge, { backgroundColor: (color ?? C.primary) }]}>
          <Text style={styles.sectionNum}>{number}</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: color ?? C.textPrimary }]}>{title}</Text>
      </View>
    );
  }

  function readPartAloud() {
    speakText(
      `${part.displayName}. ${part.what_it_is}. ${part.what_it_does}. ${part.why_it_matters}. Where to find it: ${part.location_tip}`
    );
  }

  const hasRelatedCheckpoints = part.related_checkpoint_keys.length > 0;
  const hasRelatedGuides      = part.related_guide_keys.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Fixed header ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={C.primary} />
          <Text style={[styles.backBtnText, { color: C.primary }]}>Back</Text>
        </TouchableOpacity>

        {categoryMeta && (
          <View style={[styles.categoryChip, { backgroundColor: C.primary + '15' }]}>
            <Ionicons name={categoryMeta.iconName as any} size={13} color={C.primary} />
            <Text style={[styles.categoryChipText, { color: C.primary }]}>{categoryMeta.label}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
      >

        {/* ── SECTION 1: Part Identification ───────────────────────────────── */}
        <View style={styles.section}>
          {SectionHeader({ number: 1, title: 'What Is This Part?', color: C.primary })}

          <Text style={styles.partName}>{part.displayName}</Text>
          <Text style={styles.partSimpleName}>{part.simpleName}</Text>

          {/* Read Aloud — stub per CLAUDE.md */}
          <TouchableOpacity
            style={[styles.readAloudBtn, { borderColor: C.primary + '44' }]}
            onPress={readPartAloud}
          >
            <Ionicons name="volume-medium-outline" size={16} color={C.primary} />
            <Text style={[styles.readAloudBtnText, { color: C.primary }]}>Read Aloud</Text>
          </TouchableOpacity>

          {/* Reference image — arrow and highlight slot in when assets are ready */}
          <AssetImage imageKey={part.asset.referenceImageKey} height={220} />

          {/* Phase 2+ architecture note (invisible to user, comment only) */}
          {/* When Phase 2 ships: replace AssetImage with AnimatedPartView(part.asset.animationKey) */}
          {/* When Phase 3 ships: replace with InteractiveModel3D(part.asset.modelKey) */}
          {/* When Phase 7 ships: add ARInspectButton(part.asset.arConfig) */}

          <View style={styles.eduCard}>
            <Text style={styles.eduLabel}>WHAT DOES IT DO?</Text>
            <Text style={styles.eduBody}>{part.what_it_does}</Text>
          </View>

          <View style={styles.eduCard}>
            <Text style={styles.eduLabel}>WHY DOES IT MATTER?</Text>
            <Text style={styles.eduBody}>{part.why_it_matters}</Text>
          </View>

          <View style={[styles.eduCard, { backgroundColor: C.info + '0E', borderColor: C.info + '33' }]}>
            <Text style={[styles.eduLabel, { color: C.info }]}>WHERE TO FIND IT</Text>
            <Text style={styles.eduBody}>{part.location_tip}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── SECTION 2: Healthy Example ───────────────────────────────────── */}
        <View style={styles.section}>
          {SectionHeader({ number: 2, title: 'What Healthy Looks Like', color: C.healthy })}
          <Text style={styles.sectionIntro}>
            Study this. When you look at your printer, this is what you want to see.
          </Text>

          <AssetImage imageKey={part.asset.goodExampleKey} height={200} tint={C.healthy} />

          <View style={[styles.exampleCaption, { borderColor: C.healthy + '60', backgroundColor: C.healthy + '0C' }]}>
            <Ionicons name="checkmark-circle" size={20} color={C.healthy} />
            <Text style={[styles.exampleCaptionText, { color: C.healthy }]}>
              {part.what_good_looks_like}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── SECTION 3: Problem Example ───────────────────────────────────── */}
        <View style={styles.section}>
          {SectionHeader({ number: 3, title: 'What a Problem Looks Like', color: C.critical })}
          <Text style={styles.sectionIntro}>
            Learn to recognize this. You do not need to fix it today — but you will know it when you see it.
          </Text>

          <AssetImage imageKey={part.asset.badExampleKey} height={200} tint={C.critical} />

          <View style={[styles.exampleCaption, { borderColor: C.critical + '60', backgroundColor: C.critical + '0C' }]}>
            <Ionicons name="warning" size={20} color={C.critical} />
            <Text style={[styles.exampleCaptionText, { color: C.critical }]}>
              {part.what_bad_looks_like}
            </Text>
          </View>

          <View style={[styles.tipBox, { backgroundColor: C.info + '10', borderColor: C.info + '30' }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.info} />
            <Text style={[styles.tipText, { color: C.info }]}>
              Seeing a problem does not mean your printer is broken. Most problems have a simple fix.
              The app will walk you through it step by step.
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── SECTION 4: Camera Guidance ───────────────────────────────────── */}
        <View style={styles.section}>
          {SectionHeader({ number: 4, title: 'Find It on Your Printer', color: C.primary })}
          <Text style={styles.sectionIntro}>
            Use these steps to find the {part.displayName.toLowerCase()} on your own printer. No experience required.
          </Text>

          {/* Reference image with highlight showing where to look */}
          <AssetImage imageKey={part.asset.highlightedImageKey} height={200} />

          {/* 5-step camera guidance */}
          <View style={styles.cameraStepsCard}>
            {([
              { n: 1, text: part.camera_guidance.step1_find },
              { n: 2, text: part.camera_guidance.step2_match },
              { n: 3, text: part.camera_guidance.step3_distance },
              { n: 4, text: part.camera_guidance.step4_center },
              { n: 5, text: part.camera_guidance.step5_action },
            ]).map(step => (
              <View key={step.n} style={styles.cameraStep}>
                <View style={[styles.cameraStepBadge, { backgroundColor: C.primary }]}>
                  <Text style={styles.cameraStepNum}>{step.n}</Text>
                </View>
                <Text style={styles.cameraStepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── SECTION 5: Maintenance ────────────────────────────────────────── */}
        <View style={styles.section}>
          {SectionHeader({ number: 5, title: 'Maintenance & Care', color: C.warning })}

          <View style={[styles.intervalCard, { backgroundColor: C.primary + '0E', borderColor: C.primary + '33' }]}>
            <Ionicons name="time-outline" size={18} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.intervalLabel, { color: C.primary }]}>HOW OFTEN TO CHECK THIS</Text>
              <Text style={styles.intervalBody}>{part.maintenance_interval}</Text>
            </View>
          </View>

          <Text style={styles.eduLabel}>COMMON PROBLEMS TO WATCH FOR</Text>
          <View style={styles.problemsList}>
            {part.common_problems.map((problem: string, i: number) => (
              <View key={i} style={[styles.problemRow, { borderColor: C.warning + '40', backgroundColor: C.warning + '08' }]}>
                <Ionicons name="warning-outline" size={16} color={C.warning} style={{ marginTop: 2, flexShrink: 0 }} />
                <Text style={styles.problemText}>{problem}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── SECTION 6: Related ───────────────────────────────────────────── */}
        <View style={styles.section}>
          {SectionHeader({ number: 6, title: 'Learn More & Take Action', color: C.info })}

          {/* Inspect this part CTA */}
          {hasRelatedCheckpoints && (
            <>
              <Text style={styles.relatedLabel}>INSPECT THIS PART</Text>
              <TouchableOpacity
                style={[styles.relatedActionCard, { borderColor: C.primary + '55' }]}
                onPress={() => navigation.navigate('InspectionWizard')}
              >
                <View style={[styles.relatedActionIcon, { backgroundColor: C.primary + '18' }]}>
                  <Ionicons name="camera-outline" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.relatedActionTitle, { color: C.primary }]}>
                    Visual Inspection
                  </Text>
                  <Text style={styles.relatedActionDesc}>
                    Use your phone camera to photograph and assess this part
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.primary} />
              </TouchableOpacity>
            </>
          )}

          {/* Maintenance guides */}
          {hasRelatedGuides && (
            <>
              <Text style={[styles.relatedLabel, { marginTop: hasRelatedCheckpoints ? Spacing.md : 0 }]}>
                STEP-BY-STEP GUIDES
              </Text>
              {part.related_guide_keys.map((guideKey: string) => (
                <TouchableOpacity
                  key={guideKey}
                  style={[styles.relatedActionCard, { borderColor: C.border }]}
                  onPress={() => navigation.navigate('GuideDetail', { guideKey })}
                >
                  <View style={[styles.relatedActionIcon, { backgroundColor: C.info + '15' }]}>
                    <Ionicons name="book-outline" size={20} color={C.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.relatedActionTitle, { color: C.textPrimary }]}>
                      Maintenance Guide
                    </Text>
                    <Text style={styles.relatedActionDesc}>
                      Step-by-step instructions for this part
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textHint} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {!hasRelatedCheckpoints && !hasRelatedGuides && (
            <View style={[styles.tipBox, { backgroundColor: C.info + '10', borderColor: C.info + '30' }]}>
              <Ionicons name="information-circle-outline" size={16} color={C.info} />
              <Text style={[styles.tipText, { color: C.info }]}>
                No specific inspection checklist exists for this part yet. If you notice a problem, see a technician or consult the printer manufacturer.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    centered:     { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    scrollContent: { padding: Spacing.md },

    errorText: { ...Typography.bodyBold, marginBottom: Spacing.md },
    linkText:  { ...Typography.body },

    // Top bar
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderBottomWidth: 1, borderBottomColor: C.border + '44',
    },
    backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backBtnText: { ...Typography.bodyBold },
    categoryChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4,
    },
    categoryChipText: { ...Typography.caption, fontWeight: '700' },

    // Section structure
    section:      { marginBottom: Spacing.lg },
    divider:      { height: 1, backgroundColor: C.border + '44', marginVertical: Spacing.xs },
    sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    sectionNumBadge: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionNum:   { ...Typography.smallBold, color: '#fff' },
    sectionTitle: { ...Typography.h3 },
    sectionIntro: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md, lineHeight: 26 },

    // Part identity
    partName:       { ...Typography.h2, color: C.textPrimary, marginBottom: 4 },
    partSimpleName: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.sm, lineHeight: 26 },

    readAloudBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      borderWidth: 1, borderRadius: Radius.full,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      marginBottom: Spacing.md,
    },
    readAloudBtnText: { ...Typography.smallBold },

    // Education cards
    eduCard:  {
      backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    },
    eduLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.xs },
    eduBody:  { ...Typography.body, color: C.textPrimary, lineHeight: 26 },

    // Example captions
    exampleCaption: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    exampleCaptionText: { ...Typography.body, flex: 1, lineHeight: 26, fontWeight: '500' },

    // Tip / info boxes
    tipBox:  {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md,
      marginBottom: Spacing.sm,
    },
    tipText: { ...Typography.small, flex: 1, lineHeight: 20 },

    // Camera steps
    cameraStepsCard: {
      backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
      borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm,
    },
    cameraStep:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    cameraStepBadge: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
    },
    cameraStepNum:  { ...Typography.smallBold, color: '#fff' },
    cameraStepText: { ...Typography.body, color: C.textPrimary, flex: 1, lineHeight: 26 },

    // Maintenance section
    intervalCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
    },
    intervalLabel: { ...Typography.label, marginBottom: 4 },
    intervalBody:  { ...Typography.body, color: C.textPrimary, lineHeight: 24 },

    problemsList: { gap: Spacing.xs, marginBottom: Spacing.sm },
    problemRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm,
    },
    problemText: { ...Typography.body, color: C.textPrimary, flex: 1, lineHeight: 24 },

    // Related section
    relatedLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.sm },
    relatedActionCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md,
      marginBottom: Spacing.sm, backgroundColor: C.bgCard, ...Shadow.card,
    },
    relatedActionIcon: {
      width: 44, height: 44, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    relatedActionTitle: { ...Typography.bodyBold, marginBottom: 2 },
    relatedActionDesc:  { ...Typography.small, color: C.textSecondary, lineHeight: 18 },
  });
}
