import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { Guide, GuideCategory, GuideDifficulty } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  cleaning: 'Cleaning',
  lubrication: 'Lubrication',
  calibration: 'Calibration',
  repair: 'Repair',
  inspection: 'Inspection',
  troubleshooting: 'Troubleshooting',
};

const DIFFICULTY_CONFIG: Record<GuideDifficulty, { label: string; color: string; icon: string }> = {
  beginner:     { label: 'Beginner',     color: '#2CC9A8', icon: '🟢' },
  intermediate: { label: 'Intermediate', color: '#F5A623', icon: '🟡' },
  advanced:     { label: 'Advanced',     color: '#E84855', icon: '🔴' },
};

const CATEGORIES: GuideCategory[] = ['cleaning', 'lubrication', 'calibration', 'repair', 'inspection', 'troubleshooting'];

export default function GuideBrowserScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [guides, setGuides] = useState<Guide[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<GuideCategory | null>(null);

  useFocusEffect(useCallback(() => {
    getDatabase().then(db =>
      db.getAllAsync<Guide>(`SELECT * FROM guides ORDER BY category, difficulty`)
    ).then(setGuides);
  }, []));

  const filtered = useMemo(() => {
    let result = guides;
    if (activeCategory) result = result.filter(g => g.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.title.toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [guides, search, activeCategory]);

  function renderGuide({ item }: { item: Guide }) {
    const diff = DIFFICULTY_CONFIG[item.difficulty];
    return (
      <TouchableOpacity
        style={styles.guideCard}
        onPress={() => navigation.navigate('GuideDetail', { guideId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.guideTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.guideDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textHint} />
        </View>
        <View style={styles.cardMeta}>
          <View style={[styles.chip, { backgroundColor: diff.color + '20' }]}>
            <Text style={[styles.chipText, { color: diff.color }]}>{diff.icon} {diff.label}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: C.bgElevated }]}>
            <Ionicons name="time-outline" size={12} color={C.textHint} />
            <Text style={[styles.chipText, { color: C.textHint }]}>{item.estimated_minutes} min</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: C.bgElevated }]}>
            <Text style={[styles.chipText, { color: C.textHint }]}>
              {CATEGORY_LABELS[item.category]}
            </Text>
          </View>
          {item.is_premium ? (
            <View style={[styles.chip, { backgroundColor: C.premium + '22' }]}>
              <Ionicons name="lock-closed" size={12} color={C.premium} />
              <Text style={[styles.chipText, { color: C.premium }]}>Pro</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.pageTitle}>Maintenance Guides</Text>
      <Text style={styles.pageSubtitle}>
        All guides work offline — no internet required.
      </Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={C.textHint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guides..."
          placeholderTextColor={C.textHint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.textHint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={c => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeCategory === item && styles.filterChipActive]}
            onPress={() => setActiveCategory(activeCategory === item ? null : item)}
          >
            <Text style={[styles.filterChipText, activeCategory === item && styles.filterChipTextActive]}>
              {CATEGORY_LABELS[item]}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.filterBar}
      />

      {/* Guide list */}
      <FlatList
        data={filtered}
        keyExtractor={g => String(g.id)}
        renderItem={renderGuide}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={C.textHint} />
            <Text style={styles.emptyText}>
              {search ? 'No guides match your search.' : 'No guides loaded yet.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: C.bg },
    pageTitle:     { ...Typography.h2, color: C.textPrimary, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 2 },
    pageSubtitle:  { ...Typography.small, color: C.textHint, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },

    searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: C.border },
    searchIcon:  { marginRight: Spacing.xs },
    searchInput: { flex: 1, ...Typography.body, color: C.textPrimary, paddingVertical: Spacing.sm },

    filterBar:         { flexGrow: 0, marginBottom: Spacing.sm },
    filterList:        { paddingHorizontal: Spacing.md, gap: Spacing.xs },
    filterChip:        { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
    filterChipActive:  { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText:    { ...Typography.small, color: C.textSecondary },
    filterChipTextActive:{ color: C.textOnPrimary, fontWeight: '600' },

    listContent: { padding: Spacing.md, paddingTop: 0, paddingBottom: insets.bottom + 80 },

    guideCard:    { backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card },
    cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
    cardInfo:     { flex: 1, marginRight: Spacing.sm },
    guideTitle:   { ...Typography.bodyBold, color: C.textPrimary },
    guideDesc:    { ...Typography.small, color: C.textSecondary, marginTop: 2 },
    cardMeta:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    chip:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.xs + 2, paddingVertical: 3, borderRadius: Radius.full },
    chipText:     { ...Typography.caption, fontWeight: '500' },

    empty:     { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
    emptyText: { ...Typography.body, color: C.textSecondary, textAlign: 'center' },
  });
}
