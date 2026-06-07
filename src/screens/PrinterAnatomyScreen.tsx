import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAnatomyPartsForType,
  getAnatomyPartsByCategory,
  searchAnatomyParts,
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

  const [printerFilter, setPrinterFilter] = useState<PrinterFilter>('FDM');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(ANATOMY_CATEGORIES.map(c => c.key))
  );

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(
    () => isSearching ? searchAnatomyParts(searchQuery).filter(p => p.printer_types.includes(printerFilter)) : [],
    [searchQuery, printerFilter, isSearching]
  );

  const byCategory = useMemo(
    () => getAnatomyPartsByCategory(printerFilter),
    [printerFilter]
  );

  const sortedCategories = useMemo(
    () => [...ANATOMY_CATEGORIES].sort((a, b) => a.order - b.order).filter(
      cat => (byCategory.get(cat.key) ?? []).length > 0
    ),
    [byCategory]
  );

  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openPart(part: AnatomyPart) {
    navigation.navigate('PartDetail', { partKey: part.key });
  }

  const totalParts = getAnatomyPartsForType(printerFilter).length;

  // ─── Part Card ─────────────────────────────────────────────────────────────

  function PartCard({ part }: { part: AnatomyPart }) {
    return (
      <TouchableOpacity style={styles.partCard} onPress={() => openPart(part)}>
        {/* Image placeholder — real image slots in when assets are ready */}
        <View style={[styles.partCardImage, { backgroundColor: C.primary + '12' }]}>
          <Ionicons name="image-outline" size={28} color={C.primary + '80'} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.partCardName}>{part.displayName}</Text>
          <Text style={styles.partCardSimple} numberOfLines={2}>{part.simpleName}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={C.textHint} />
      </TouchableOpacity>
    );
  }

  // ─── Category Section ────────────────────────────────────────────────────

  function CategorySection({ cat }: { cat: AnatomyCategoryMeta }) {
    const parts = byCategory.get(cat.key) ?? [];
    if (parts.length === 0) return null;
    const expanded = expandedCategories.has(cat.key);

    return (
      <View style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategory(cat.key)}
        >
          <View style={[styles.categoryIcon, { backgroundColor: C.primary + '18' }]}>
            <Ionicons name={cat.iconName as any} size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
            <Text style={styles.categoryDesc}>{cat.description}</Text>
          </View>
          <View style={styles.categoryBadge}>
            <Text style={[styles.categoryBadgeText, { color: C.textHint }]}>{parts.length}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.textHint}
          />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.categoryParts}>
            {parts.map(part => (
              <PartCard key={part.key} part={part} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Learn My Printer</Text>
          <Text style={styles.headerSubtitle}>
            {totalParts} parts · Tap any part to learn about it
          </Text>
        </View>
      </View>

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
        <Ionicons name="search-outline" size={18} color={C.textHint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search parts..."
          placeholderTextColor={C.textHint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={C.textHint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Educational banner */}
      {!isSearching && (
        <View style={[styles.educationBanner, { backgroundColor: C.info + '12', borderColor: C.info + '35' }]}>
          <Ionicons name="school-outline" size={16} color={C.info} />
          <Text style={[styles.educationText, { color: C.info }]}>
            You can learn about every part of your printer — what it does, why it matters, and how to keep it healthy — without doing any maintenance today.
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Search results */}
        {isSearching ? (
          <>
            <Text style={styles.sectionLabel}>
              {searchResults.length === 0
                ? 'No parts match your search'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </Text>
            {searchResults.map(part => (
              <PartCard key={part.key} part={part} />
            ))}
          </>
        ) : (
          /* Category sections */
          sortedCategories.map(cat => (
            <CategorySection key={cat.key} cat={cat} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

    // Header
    header:         { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, paddingTop: Spacing.xs },
    headerTitle:    { ...Typography.h2, color: C.textPrimary },
    headerSubtitle: { ...Typography.small, color: C.textHint, marginTop: 2 },

    // Filter
    filterRow: {
      flexDirection: 'row', gap: Spacing.sm,
      paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
    },
    filterChip: {
      flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
      borderRadius: Radius.lg, borderWidth: 1.5, borderColor: C.border,
    },
    filterChipText: { ...Typography.smallBold },

    // Search
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
      backgroundColor: C.bgCard, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: Spacing.sm,
    },
    searchIcon:  { marginRight: Spacing.xs },
    searchInput: { flex: 1, ...Typography.body, color: C.textPrimary, paddingVertical: Spacing.sm },
    searchClear: { padding: Spacing.xs },

    // Education banner
    educationBanner: {
      flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
      marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
      borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm,
    },
    educationText: { ...Typography.small, flex: 1, lineHeight: 20 },

    sectionLabel: { ...Typography.label, color: C.textHint, marginBottom: Spacing.sm, marginTop: Spacing.sm },

    // Category sections
    categorySection: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      marginBottom: Spacing.sm, borderWidth: 1, borderColor: C.border,
      overflow: 'hidden', ...Shadow.card,
    },
    categoryHeader: {
      flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm,
    },
    categoryIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    categoryLabel: { ...Typography.bodyBold, color: C.textPrimary },
    categoryDesc:  { ...Typography.caption, color: C.textHint, marginTop: 1 },
    categoryBadge: {
      backgroundColor: C.border, borderRadius: Radius.full,
      paddingHorizontal: 8, paddingVertical: 2, marginRight: 4,
    },
    categoryBadgeText: { ...Typography.caption, fontWeight: '700' },
    categoryParts: {
      borderTopWidth: 1, borderTopColor: C.border,
    },

    // Part cards
    partCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      borderTopWidth: 1, borderTopColor: C.border + '55',
    },
    partCardImage: {
      width: 52, height: 52, borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    partCardName:   { ...Typography.bodyBold, color: C.textPrimary },
    partCardSimple: { ...Typography.small, color: C.textSecondary, marginTop: 2, lineHeight: 18 },
  });
}
