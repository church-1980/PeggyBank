import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { useCustomLogos } from '../context/CustomLogoContext';
import { getDatabase } from '../database/database';
import { searchActivity, type ActivityItem } from '../lib/activity';
import { openActivityRecord } from '../lib/openRecord';
import { Spacing, Typography, ColorPalette } from '../theme';
import {
  PeggyScreen, PeggyHeader, PeggySearchBar, PeggyEmptyState,
} from '../components/peggy';
import PeggyActivityRow from '../components/peggy/PeggyActivityRow';

/**
 * SEARCH YOUR MONEY.
 *
 * The one thing the competitor review found PeggyBank genuinely worse at:
 * finding an old transaction meant scrolling.
 *
 * This is a FINDER, not a second ledger. It runs the same union What Happened
 * runs, and tapping a result opens the authoritative record — so correcting
 * something here corrects it everywhere, because there is only one of it.
 *
 * No filters, no sort controls, no date pickers. One box. People already know
 * how to use one box.
 */
export default function SearchScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { logoFor } = useCustomLogos();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ActivityItem[]>([]);
  const [searching, setSearching] = useState(false);
  /** Only the newest search may write results, so a slow one cannot overwrite a fast one. */
  const latest = useRef(0);

  const run = useCallback(async (text: string) => {
    const ticket = ++latest.current;
    if (!text.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const db = await getDatabase();
      const found = await searchActivity(db, text);
      if (ticket === latest.current) setResults(found);
    } catch {
      if (ticket === latest.current) setResults([]);
    } finally {
      if (ticket === latest.current) setSearching(false);
    }
  }, []);

  const onChange = (text: string) => { setQuery(text); run(text); };

  const open = async (item: ActivityItem) => {
    const db = await getDatabase();
    await openActivityRecord(db, item, (screen, params) => navigation.navigate(screen, params));
  };

  const typed = query.trim().length > 0;

  return (
    <PeggyScreen scroll={false}>
      <PeggyHeader title="Search your money" onBack={() => navigation.goBack()} />

      <PeggySearchBar
        value={query}
        onChangeText={onChange}
        onClear={() => onChange('')}
        placeholder="Tim Hortons, $20, August 12…"
        autoFocus
        style={styles.bar}
      />

      {!typed ? (
        // Not an error state — they have simply not typed yet. Say what works.
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Look for anything</Text>
          <Text style={styles.hintLine}>A shop — Tim Hortons, Maxi, Bell</Text>
          <Text style={styles.hintLine}>An amount — $20, 11.60</Text>
          <Text style={styles.hintLine}>A date — August, August 12</Text>
          <Text style={styles.hintLine}>A kind of spending — groceries</Text>
        </View>
      ) : searching && results.length === 0 ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: Spacing.xl }} />
      ) : results.length === 0 ? (
        <PeggyEmptyState
          title="Nothing found"
          message={'No money matching "' + query.trim() + '". Try a shop name, an amount, or a month.'}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
          ListHeaderComponent={
            <Text style={styles.count}>
              {results.length === 1 ? '1 result' : results.length + ' results'}
            </Text>
          }
          renderItem={({ item }) => (
            <PeggyActivityRow item={item} onPress={open} logoUri={logoFor(item.title)} />
          )}
        />
      )}
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    bar:       { marginBottom: Spacing.md },
    count:     { ...Typography.caption, color: C.textSecondary, marginBottom: Spacing.sm },
    hint:      { paddingTop: Spacing.lg, gap: Spacing.sm },
    hintTitle: { ...Typography.cardTitle, color: C.textPrimary, marginBottom: Spacing.xs },
    hintLine:  { ...Typography.body, color: C.textSecondary },
  });
}
