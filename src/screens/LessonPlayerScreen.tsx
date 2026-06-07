// One-card-at-a-time lesson player.
// Every card shows ONE idea: headline + image + 1–2 sentences.
// Read Aloud is a stub — button present per CLAUDE.md, TTS wired in future update.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BEGINNER_LESSONS, BeginnerLesson, LessonCard } from '../data/beginnerLessons';
import { speakText } from '../lib/tts';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function LessonPlayerScreen({ navigation, route }: any) {
  const { lessonKey } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const lesson: BeginnerLesson | undefined = useMemo(
    () => BEGINNER_LESSONS.find(l => l.key === lessonKey),
    [lessonKey]
  );

  const [cardIndex, setCardIndex] = useState(0);

  if (!lesson) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <Text style={{ color: C.critical }}>Lesson not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: C.primary, marginTop: 16 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card: LessonCard = lesson.cards[cardIndex];
  const isFirst = cardIndex === 0;
  const isLast  = cardIndex === lesson.cards.length - 1;
  const progress = (cardIndex + 1) / lesson.cards.length;

  // Accent colour — derived from lesson accentKey
  const accentColor: string = {
    primary: C.primary,
    warning: C.warning,
    info:    C.info,
    healthy: C.healthy,
  }[lesson.accentKey] ?? C.primary;

  function goNext() {
    if (isLast) {
      navigation.replace('LessonComplete', {
        lessonKey:    lesson!.key,
        lessonTitle:  lesson!.title,
        cardCount:    lesson!.cards.length,
        completionHeadline: lesson!.completionHeadline,
        completionBody:     lesson!.completionBody,
        accentKey:    lesson!.accentKey,
      });
    } else {
      setCardIndex(i => i + 1);
    }
  }

  function goPrevious() {
    if (!isFirst) setCardIndex(i => i - 1);
  }

  function readAloud() {
    // Combine the card's spoken text
    const text = [
      card.safetyNote ? `Warning. ${card.safetyNote}` : '',
      card.headline,
      card.body,
      card.tip ? `Tip. ${card.tip}` : '',
    ].filter(Boolean).join('. ');
    speakText(text);
  }

  // ── Image Placeholder — Phase 1 ──────────────────────────────────────────
  // Reserved space for future diagrams. Height stays constant so layout
  // is stable when real images arrive — just replace this block.
  function CardImage() {
    return (
      <View style={[styles.imagePlaceholder, { borderColor: accentColor + '44', backgroundColor: accentColor + '0C' }]}>
        <Ionicons name="image-outline" size={40} color={accentColor + '88'} />
        <Text style={[styles.imagePlaceholderLabel, { color: accentColor + 'AA' }]}>Image coming soon</Text>
        <Text style={[styles.imagePlaceholderCaption, { color: C.textHint }]} numberOfLines={2}>
          {card.imageCaption}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        {/* Stop Lesson — large and obvious so beginners never feel trapped */}
        <TouchableOpacity
          style={[styles.exitBtn, { borderColor: C.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={18} color={C.textSecondary} />
          <Text style={[styles.exitBtnText, { color: C.textSecondary }]}>Stop Lesson</Text>
        </TouchableOpacity>

        {/* Counter */}
        <Text style={styles.counter}>
          {cardIndex + 1} of {lesson.cards.length}
        </Text>

        {/* Read Aloud — stub, button present per CLAUDE.md */}
        <TouchableOpacity style={[styles.readAloudBtn, { borderColor: accentColor + '44' }]} onPress={readAloud}>
          <Ionicons name="volume-medium-outline" size={16} color={accentColor} />
          <Text style={[styles.readAloudText, { color: accentColor }]}>Read</Text>
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
      </View>

      {/* ── Lesson title chip ────────────────────────────────────────────── */}
      <View style={styles.lessonChip}>
        <Ionicons name={lesson.iconName as any} size={13} color={accentColor} />
        <Text style={[styles.lessonChipText, { color: accentColor }]} numberOfLines={1}>
          {lesson.title}
        </Text>
      </View>

      {/* ── Card content ─────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.cardContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Safety note — amber, shown above image */}
        {card.safetyNote && (
          <View style={[styles.safetyNote, { backgroundColor: C.warning + '16', borderColor: C.warning + '55' }]}>
            <Ionicons name="warning" size={18} color={C.warning} style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={[styles.safetyNoteText, { color: C.warning }]}>{card.safetyNote}</Text>
          </View>
        )}

        {/* Image placeholder — fixed height, always reserves space */}
        <CardImage />

        {/* Headline — the ONE idea */}
        <Text style={styles.headline}>{card.headline}</Text>

        {/* Body — 1–2 supporting sentences */}
        <Text style={styles.body}>{card.body}</Text>

        {/* Tip — blue, shown below body */}
        {card.tip && (
          <View style={[styles.tipBox, { backgroundColor: C.info + '12', borderColor: C.info + '44' }]}>
            <Ionicons name="bulb-outline" size={16} color={C.info} style={{ flexShrink: 0, marginTop: 2 }} />
            <Text style={[styles.tipText, { color: C.info }]}>{card.tip}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Navigation buttons ───────────────────────────────────────────── */}
      <View style={[styles.navBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
        {/* Previous — shown on all cards except first */}
        <TouchableOpacity
          style={[styles.prevBtn, isFirst && styles.prevBtnHidden]}
          onPress={goPrevious}
          disabled={isFirst}
        >
          <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
          <Text style={styles.prevBtnText}>Previous</Text>
        </TouchableOpacity>

        {/* Next / Finish — primary action */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: accentColor }]}
          onPress={goNext}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Finish' : 'Next'}
          </Text>
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={C.textOnPrimary} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    // Top bar
    topBar: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical:   Spacing.sm,
    },
    exitBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1, borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 6,
    },
    exitBtnText: { ...Typography.small, fontWeight: '600' },
    counter:     { ...Typography.smallBold, color: C.textSecondary },
    readAloudBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1, borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm, paddingVertical: 5,
    },
    readAloudText: { ...Typography.caption, fontWeight: '700' },

    // Progress
    progressTrack: { height: 4, backgroundColor: C.border, marginHorizontal: Spacing.md, borderRadius: 2 },
    progressFill:  { height: 4, borderRadius: 2 },

    // Lesson title chip
    lessonChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    },
    lessonChipText: { ...Typography.caption, fontWeight: '700' },

    // Card
    cardContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
      paddingTop: Spacing.sm,
    },

    // Safety note
    safetyNote: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1.5, borderRadius: Radius.md,
      padding: Spacing.md, marginBottom: Spacing.md,
    },
    safetyNoteText: { ...Typography.body, flex: 1, lineHeight: 26, fontWeight: '600' },

    // Image placeholder — Phase 1
    // Fixed height 220dp — never shrinks. Real images slot in here.
    imagePlaceholder: {
      height:        220,
      borderRadius:  Radius.xl,
      borderWidth:   1,
      borderStyle:   'dashed',
      alignItems:    'center',
      justifyContent: 'center',
      gap:           8,
      marginBottom:  Spacing.xl,
    },
    imagePlaceholderLabel:   { ...Typography.smallBold },
    imagePlaceholderCaption: { ...Typography.small, textAlign: 'center', paddingHorizontal: Spacing.lg },

    // Headline — the one idea. Large and bold.
    headline: {
      fontSize:    26,
      fontWeight:  '700',
      color:       C.textPrimary,
      lineHeight:  34,
      marginBottom: Spacing.md,
    },

    // Body — short, plain language, readable at arm's length
    body: {
      fontSize:    18,
      color:       C.textSecondary,
      lineHeight:  28,
      marginBottom: Spacing.md,
    },

    // Tip box
    tipBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md,
    },
    tipText: { ...Typography.body, flex: 1, lineHeight: 26 },

    // Navigation
    navBar: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop:        Spacing.sm,
      borderTopWidth:    1,
      borderTopColor:    C.border + '55',
      gap:               Spacing.md,
    },
    prevBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingVertical: Spacing.md,
    },
    prevBtnHidden: { opacity: 0, pointerEvents: 'none' } as any,
    prevBtnText: { ...Typography.body, color: C.textSecondary },

    nextBtn: {
      flex:           1,
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            Spacing.sm,
      paddingVertical: Spacing.md + 2,
      borderRadius:    Radius.lg,
      ...Shadow.glow,
    },
    nextBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
  });
}
