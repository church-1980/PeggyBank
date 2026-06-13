// Shown after a lesson finishes, and as the final "You now know your printer better" screen.
// Celebrates what the user learned without overwhelming them.
// Every word passes the Grandparent Test.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BEGINNER_LESSONS, BEGINNER_PATH } from '../data/beginnerLessons';
import { speakText } from '../lib/tts';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function LearningCompleteScreen({ navigation, route }: any) {
  const {
    lessonKey,
    lessonTitle,
    cardCount,
    completionHeadline,
    completionBody,
    accentKey = 'primary',
  } = route.params ?? {};

  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const accentColor: string = {
    primary: C.primary,
    warning: C.warning,
    info:    C.info,
    healthy: C.healthy,
  }[accentKey as string] ?? C.primary;

  // What the user learned — brief recap of card headlines from the lesson
  const lesson = BEGINNER_LESSONS.find(l => l.key === lessonKey);
  const cardHeadlines = lesson?.cards.map(c => c.headline) ?? [];

  // Find next lesson in the path, if any
  const pathIndex = BEGINNER_PATH.findIndex(
    step => step.type === 'lesson' && step.lessonKey === lessonKey
  );
  const nextStep = pathIndex >= 0 && pathIndex + 1 < BEGINNER_PATH.length
    ? BEGINNER_PATH[pathIndex + 1]
    : null;

  function readAloud() {
    speakText(`${completionHeadline}. ${completionBody}`);
  }

  function goNext() {
    if (!nextStep) {
      navigation.navigate('LearnTab');
      return;
    }
    if (nextStep.type === 'lesson' && nextStep.lessonKey) {
      navigation.replace('LessonPlayer', { lessonKey: nextStep.lessonKey });
    } else {
      // 'parts' step — go to Learn tab, it shows the parts section
      navigation.navigate('LearnTab');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        bounces={false}
      >

        {/* ── Celebration icon ─────────────────────────────────────────────── */}
        <View style={[styles.celebrationCircle, { backgroundColor: accentColor + '16' }]}>
          <Ionicons name="checkmark-circle" size={72} color={accentColor} />
        </View>

        {/* ── Lesson complete label ──────────────────────────────────────── */}
        <View style={styles.completeBadge}>
          <Ionicons name="ribbon-outline" size={14} color={accentColor} />
          <Text style={[styles.completeBadgeText, { color: accentColor }]}>Lesson complete</Text>
        </View>

        {/* ── Main headline ─────────────────────────────────────────────── */}
        <Text style={styles.headline}>{completionHeadline}</Text>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <Text style={styles.body}>{completionBody}</Text>

        {/* ── Read Aloud stub ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.readAloudBtn, { borderColor: accentColor + '44' }]}
          onPress={readAloud}
        >
          <Ionicons name="volume-medium-outline" size={16} color={accentColor} />
          <Text style={[styles.readAloudBtnText, { color: accentColor }]}>Read Aloud</Text>
        </TouchableOpacity>

        {/* ── What you learned ─────────────────────────────────────────── */}
        {cardHeadlines.length > 0 && (
          <View style={styles.learnedSection}>
            <Text style={styles.learnedTitle}>What you learned</Text>
            {cardHeadlines.map((headline: string, i: number) => (
              <View key={i} style={styles.learnedRow}>
                <Ionicons name="checkmark-circle" size={18} color={accentColor} style={{ flexShrink: 0 }} />
                <Text style={styles.learnedItem}>{headline}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── "You now know your printer better" summary ───────────────── */}
        <View style={[styles.summaryCard, { backgroundColor: accentColor + '10', borderColor: accentColor + '35' }]}>
          <Ionicons name="school" size={22} color={accentColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryHeadline, { color: accentColor }]}>
              You now know your printer better
            </Text>
            <Text style={styles.summaryBody}>
              Every lesson makes you a more confident printer owner.
              Keep going — you are doing great.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* ── Navigation buttons ────────────────────────────────────────────── */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.backToLearnBtn}
          onPress={() => navigation.navigate('LearnTab')}
        >
          <Text style={[styles.backToLearnText, { color: C.textSecondary }]}>Back to Learn</Text>
        </TouchableOpacity>

        {nextStep && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: accentColor }]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>
              {nextStep.type === 'parts' ? 'See Parts to Know' : 'Next Lesson'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={C.textOnPrimary} />
          </TouchableOpacity>
        )}

        {!nextStep && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: accentColor }]}
            onPress={() => navigation.navigate('LearnTab')}
          >
            <Text style={styles.nextBtnText}>Back to Learn</Text>
            <Ionicons name="checkmark" size={18} color={C.textOnPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, alignItems: 'center' },

    // Celebration
    celebrationCircle: {
      width: 120, height: 120, borderRadius: 60,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    completeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginBottom: Spacing.sm,
    },
    completeBadgeText: { ...Typography.smallBold },

    headline: {
      fontSize:    28,
      fontWeight:  '700',
      color:       C.textPrimary,
      textAlign:   'center',
      lineHeight:  36,
      marginBottom: Spacing.md,
    },
    body: {
      fontSize:    18,
      color:       C.textSecondary,
      textAlign:   'center',
      lineHeight:  28,
      marginBottom: Spacing.lg,
    },

    // Read Aloud stub button
    readAloudBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderRadius: Radius.full,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      marginBottom: Spacing.xl,
    },
    readAloudBtnText: { ...Typography.smallBold },

    // What you learned
    learnedSection: {
      width: '100%',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: C.border,
      ...Shadow.card,
    },
    learnedTitle: { ...Typography.label, color: C.textHint, marginBottom: Spacing.sm },
    learnedRow:   { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs, alignItems: 'flex-start' },
    learnedItem:  { ...Typography.body, color: C.textPrimary, flex: 1, lineHeight: 24 },

    // Summary card
    summaryCard: {
      width: '100%',
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.lg,
    },
    summaryHeadline: { ...Typography.bodyBold, marginBottom: 4 },
    summaryBody:     { ...Typography.small, color: C.textSecondary, lineHeight: 20 },

    // Action bar
    actionBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
      gap: Spacing.md,
      borderTopWidth: 1, borderTopColor: C.border + '55',
    },
    backToLearnBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm },
    backToLearnText: { ...Typography.body },
    nextBtn: {
      flex: 1,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: Spacing.sm, paddingVertical: Spacing.md + 2,
      borderRadius: Radius.lg, ...Shadow.glow,
    },
    nextBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
  });
}
