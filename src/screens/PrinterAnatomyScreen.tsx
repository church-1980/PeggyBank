// Learn My Printer — the beginner training hub.
// Four sections in scroll order:
//   1. Start Here — structured path for new owners
//   2. Parts You Should Know First — 6 essential parts
//   3. Do Not Touch Yet — advanced/risky parts with clear explanations
//   4. Browse All Parts — full anatomy browser

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  BEGINNER_PATH,
  LEARN_FIRST_PART_KEYS,
  DO_NOT_TOUCH_YET,
  BEGINNER_LESSONS,
  DoNotTouchEntry,
} from '../data/beginnerLessons';
import {
  getAnatomyPartsForType,
  getAnatomyPartsByCategory,
  searchAnatomyParts,
  getAnatomyPartByKey,
  ANATOMY_CATEGORIES,
} from '../data/printerAnatomy';
import { AnatomyPart, AnatomyCategoryMeta } from '../types/anatomy';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

type PrinterFilter = 'FDM' | 'Resin';

export default function PrinterAnatomyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [printerFilter, setPrinterFilter]   = useState<PrinterFilter>('FDM');
  const [searchQuery, setSearchQuery]       = useState('');
  const [browseExpanded, setBrowseExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(ANATOMY_CATEGORIES.map(c => c.key))
  );

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(
    () => isSearching
      ? searchAnatomyParts(searchQuery).filter((p: AnatomyPart) => p.printer_types.includes(printerFilter))
      : [],
    [searchQuery, printerFilter, isSearching]
  );

  const byCategory = useMemo(
    () => getAnatomyPartsByCategory(printerFilter),
    [printerFilter]
  );

  const sortedCategories = useMemo(
    () => [...ANATOMY_CATEGORIES]
      .sort((a, b) => a.order - b.order)
      .filter(cat => (byCategory.get(cat.key) ?? []).length > 0),
    [byCategory]
  );

  const learnFirstParts = useMemo(
    () => LEARN_FIRST_PART_KEYS
      .map(key => getAnatomyPartByKey(key))
      .filter((p): p is AnatomyPart => p !== undefined),
    []
  );

  function openPart(part: AnatomyPart) {
    navigation.navigate('PartDetail', { partKey: part.key });
  }

  function openLesson(lessonKey: string) {
    navigation.navigate('LessonPlayer', { lessonKey });
  }

  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ─── Sub-components ─────────────────────────────────────────────────────

  function SectionHeading({ label, sub }: { label: string; sub?: string }) {
    return (
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionHeadingLabel}>{label}</Text>
        {sub && <Text style={styles.sectionHeadingSub}>{sub}</Text>}
      </View>
    );
  }

  // ── Start Here cards ──────────────────────────────────────────────────────

  function StartHerePath() {
    return (
      <View style={styles.section}>
        <SectionHeading
          label="Start Here"
          sub="Three steps for brand new owners — start with the first one"
        />

        {BEGINNER_PATH.map((step, index) => {
          const lesson = step.type === 'lesson'
            ? BEGINNER_LESSONS.find(l => l.key === step.lessonKey)
            : null;

          const accentColor: string = lesson
            ? ({ primary: C.primary, warning: C.warning, info: C.info, healthy: C.healthy }[lesson.accentKey] ?? C.primary)
            : C.info;

          return (
            <TouchableOpacity
              key={step.label}
              style={[styles.pathCard, { borderColor: accentColor + '44' }]}
              onPress={() => {
                if (step.type === 'lesson' && step.lessonKey) {
                  openLesson(step.lessonKey);
                } else {
                  // Scroll to parts section — handled by expanding it
                  setBrowseExpanded(true);
                }
              }}
            >
              {/* Step number badge */}
              <View style={[styles.pathStepBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.pathStepNum}>{index + 1}</Text>
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text style={styles.pathCardTitle}>{step.label}</Text>
                <Text style={styles.pathCardSub}>{step.subtitle}</Text>
              </View>

              {/* Arrow */}
              <View style={[styles.pathArrow, { backgroundColor: accentColor + '18' }]}>
                <Ionicons name="arrow-forward" size={18} color={accentColor} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Parts You Should Know First ───────────────────────────────────────────

  function LearnFirstParts() {
    return (
      <View style={styles.section}>
        <SectionHeading
          label="Parts You Should Know First"
          sub="Every new owner should be able to find and name these six parts"
        />

        <View style={styles.partsGrid}>
          {learnFirstParts.map((part: AnatomyPart) => (
            <TouchableOpacity
              key={part.key}
              style={styles.featuredPartCard}
              onPress={() => openPart(part)}
            >
              {/* Image placeholder — fixed height reserved for future diagram */}
              <View style={[styles.featuredPartImage, { backgroundColor: C.primary + '10' }]}>
                <Ionicons name="image-outline" size={24} color={C.primary + '66'} />
                <Text style={[styles.featuredPartImageLabel, { color: C.primary + '88' }]}>
                  Image{'\n'}coming soon
                </Text>
              </View>

              <Text style={styles.featuredPartName}>{part.displayName}</Text>
              <Text style={styles.featuredPartSimple} numberOfLines={2}>
                {part.simpleName}
              </Text>

              <View style={styles.featuredPartFooter}>
                <Text style={[styles.featuredPartCta, { color: C.primary }]}>Learn more</Text>
                <Ionicons name="chevron-forward" size={13} color={C.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── Do Not Touch Yet ──────────────────────────────────────────────────────

  function DoNotTouchSection() {
    const [expanded, setExpanded] = useState(false);

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.dntHeader}
          onPress={() => setExpanded(e => !e)}
        >
          <View style={[styles.dntIconBox, { backgroundColor: C.critical + '18' }]}>
            <Ionicons name="hand-left-outline" size={18} color={C.critical} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dntHeaderTitle}>Do Not Touch Yet</Text>
            <Text style={styles.dntHeaderSub}>
              Parts to know about — but leave alone until you are ready
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.textHint}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.dntList}>
            {/* Explanation note */}
            <View style={[styles.dntNote, { backgroundColor: C.info + '10', borderColor: C.info + '35' }]}>
              <Ionicons name="information-circle-outline" size={16} color={C.info} />
              <Text style={[styles.dntNoteText, { color: C.info }]}>
                Knowing about these parts is great. Touching them without a guide is risky.
                This section tells you why — and what to do instead.
              </Text>
            </View>

            {DO_NOT_TOUCH_YET.map((entry: DoNotTouchEntry) => (
              <View key={entry.key} style={[styles.dntCard, { borderColor: C.critical + '33' }]}>
                <View style={styles.dntCardHeader}>
                  <Ionicons name="warning" size={16} color={C.critical} />
                  <Text style={[styles.dntPartName, { color: C.critical }]}>{entry.partName}</Text>
                </View>
                <Text style={styles.dntSimpleName}>{entry.simpleName}</Text>

                <View style={styles.dntDivider} />

                <View style={styles.dntRow}>
                  <Text style={styles.dntRowLabel}>WHY NOT YET</Text>
                  <Text style={styles.dntRowBody}>{entry.whyNotYet}</Text>
                </View>

                <View style={styles.dntRow}>
                  <Text style={[styles.dntRowLabel, { color: C.healthy }]}>WHEN YOU ARE READY</Text>
                  <Text style={styles.dntRowBody}>{entry.whenReady}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Browse All Parts ──────────────────────────────────────────────────────

  function BrowseAllParts() {
    return (
      <View style={styles.section}>
        {/* Section toggle header */}
        <TouchableOpacity
          style={styles.browseHeader}
          onPress={() => setBrowseExpanded(e => !e)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.browseHeaderTitle}>Browse All Parts</Text>
            <Text style={styles.browseHeaderSub}>
              {getAnatomyPartsForType(printerFilter).length} parts · Learn at your own pace
            </Text>
          </View>
          <Ionicons
            name={browseExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.textHint}
          />
        </TouchableOpacity>

        {browseExpanded && (
          <>
            {/* Printer type filter */}
            <View style={styles.filterRow}>
              {(['FDM', 'Resin'] as PrinterFilter[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    printerFilter === type && { backgroundColor: C.primary, borderColor: C.primary },
                  ]}
                  onPress={() => { setPrinterFilter(type); setSearchQuery(''); }}
                >
                  <Text style={[
                    styles.filterChipText,
                    printerFilter === type ? { color: C.textOnPrimary } : { color: C.textSecondary },
                  ]}>
                    {type} Printer
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search bar */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={C.textHint} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search parts..."
                placeholderTextColor={C.textHint}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={C.textHint} />
                </TouchableOpacity>
              )}
            </View>

            {/* Results */}
            {isSearching ? (
              <>
                <Text style={styles.searchResultLabel}>
                  {searchResults.length === 0
                    ? 'No parts match your search'
                    : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
                </Text>
                {searchResults.map((part: AnatomyPart) => (
                  <SmallPartRow key={part.key} part={part} />
                ))}
              </>
            ) : (
              sortedCategories.map((cat: AnatomyCategoryMeta) => (
                <CategorySection key={cat.key} cat={cat} />
              ))
            )}
          </>
        )}
      </View>
    );
  }

  function SmallPartRow({ part }: { part: AnatomyPart }) {
    return (
      <TouchableOpacity style={styles.smallPartRow} onPress={() => openPart(part)}>
        <View style={[styles.smallPartImage, { backgroundColor: C.primary + '10' }]}>
          <Ionicons name="image-outline" size={16} color={C.primary + '66'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.smallPartName}>{part.displayName}</Text>
          <Text style={styles.smallPartSimple} numberOfLines={1}>{part.simpleName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textHint} />
      </TouchableOpacity>
    );
  }

  function CategorySection({ cat }: { cat: AnatomyCategoryMeta }) {
    const parts = byCategory.get(cat.key) ?? [];
    if (parts.length === 0) return null;
    const expanded = expandedCategories.has(cat.key);

    return (
      <View style={styles.categoryBox}>
        <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(cat.key)}>
          <View style={[styles.categoryIcon, { backgroundColor: C.primary + '15' }]}>
            <Ionicons name={cat.iconName as any} size={16} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoryName}>{cat.label}</Text>
            <Text style={styles.categoryDesc}>{cat.description}</Text>
          </View>
          <Text style={styles.categoryCount}>{parts.length}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.textHint} />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.categoryParts}>
            {parts.map((part: AnatomyPart) => (
              <SmallPartRow key={part.key} part={part} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Learn My Printer</Text>
          <Text style={styles.headerSub}>
            Everything you need to know — one step at a time
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <StartHerePath />
        <LearnFirstParts />
        <DoNotTouchSection />
        <BrowseAllParts />
      </ScrollView>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

    // Header
    header: {
      paddingHorizontal: Spacing.md,
      paddingVertical:   Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.border + '44',
    },
    headerTitle: { ...Typography.h2, color: C.textPrimary },
    headerSub:   { ...Typography.small, color: C.textHint, marginTop: 2 },

    // Sections
    section: { marginTop: Spacing.lg },

    sectionHeading:     { marginBottom: Spacing.md },
    sectionHeadingLabel:{ ...Typography.h3, color: C.textPrimary, marginBottom: 4 },
    sectionHeadingSub:  { ...Typography.small, color: C.textSecondary, lineHeight: 20 },

    // ── Start Here path cards ──────────────────────────────────────────────
    pathCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      backgroundColor: C.bgCard, borderWidth: 1.5,
      borderRadius: Radius.lg, padding: Spacing.md,
      marginBottom: Spacing.sm, ...Shadow.card,
    },
    pathStepBadge: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    pathStepNum:   { ...Typography.bodyBold, color: '#fff', fontSize: 16 },
    pathCardTitle: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 2 },
    pathCardSub:   { ...Typography.small, color: C.textSecondary },
    pathArrow: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },

    // ── Featured parts grid ───────────────────────────────────────────────
    partsGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    },
    featuredPartCard: {
      width:           '47.5%',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
      padding: Spacing.sm, ...Shadow.card,
    },
    featuredPartImage: {
      height: 80, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.xs, gap: 4,
    },
    featuredPartImageLabel: { ...Typography.caption, textAlign: 'center' },
    featuredPartName:   { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 2 },
    featuredPartSimple: { ...Typography.small, color: C.textSecondary, lineHeight: 18, marginBottom: Spacing.xs },
    featuredPartFooter: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 'auto' as any },
    featuredPartCta:    { ...Typography.caption, fontWeight: '700' },

    // ── Do Not Touch Yet ──────────────────────────────────────────────────
    dntHeader: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.critical + '33',
      padding: Spacing.md, ...Shadow.card,
    },
    dntIconBox: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    dntHeaderTitle: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 2 },
    dntHeaderSub:   { ...Typography.small, color: C.textSecondary },

    dntList: { marginTop: Spacing.sm, gap: Spacing.sm },

    dntNote: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md,
    },
    dntNoteText: { ...Typography.small, flex: 1, lineHeight: 20 },

    dntCard: {
      backgroundColor: C.bgCard, borderWidth: 1, borderRadius: Radius.lg,
      padding: Spacing.md, ...Shadow.card,
    },
    dntCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
    dntPartName:   { ...Typography.bodyBold },
    dntSimpleName: { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.sm },
    dntDivider:    { height: 1, backgroundColor: C.border + '55', marginBottom: Spacing.sm },
    dntRow:        { marginBottom: Spacing.sm },
    dntRowLabel:   { ...Typography.label, color: C.critical, marginBottom: 4 },
    dntRowBody:    { ...Typography.body, color: C.textPrimary, lineHeight: 24 },

    // ── Browse All Parts ───────────────────────────────────────────────────
    browseHeader: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
      padding: Spacing.md, ...Shadow.card,
    },
    browseHeaderTitle: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 2 },
    browseHeaderSub:   { ...Typography.small, color: C.textSecondary },

    filterRow: {
      flexDirection: 'row', gap: Spacing.sm,
      marginTop: Spacing.sm, marginBottom: Spacing.sm,
    },
    filterChip: {
      flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
      borderRadius: Radius.lg, borderWidth: 1.5, borderColor: C.border,
    },
    filterChipText: { ...Typography.smallBold },

    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
      backgroundColor: C.bgCard, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    searchInput: { flex: 1, ...Typography.body, color: C.textPrimary, paddingVertical: Spacing.xs },

    searchResultLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.xs },

    categoryBox: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
      marginBottom: Spacing.xs, overflow: 'hidden',
    },
    categoryHeader: {
      flexDirection: 'row', alignItems: 'center',
      padding: Spacing.sm, gap: Spacing.sm,
    },
    categoryIcon: {
      width: 32, height: 32, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    categoryName:  { ...Typography.bodyBold, color: C.textPrimary },
    categoryDesc:  { ...Typography.caption, color: C.textHint, marginTop: 1 },
    categoryCount: { ...Typography.caption, color: C.textHint, fontWeight: '700', marginRight: 4 },
    categoryParts: { borderTopWidth: 1, borderTopColor: C.border + '55' },

    smallPartRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      padding: Spacing.sm,
      borderTopWidth: 1, borderTopColor: C.border + '33',
    },
    smallPartImage: {
      width: 40, height: 40, borderRadius: Radius.sm,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    smallPartName:   { ...Typography.bodyBold, color: C.textPrimary },
    smallPartSimple: { ...Typography.small, color: C.textSecondary },
  });
}
