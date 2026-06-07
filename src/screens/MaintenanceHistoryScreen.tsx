import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { MaintenanceHistoryEntry } from '../types';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function MaintenanceHistoryScreen({ navigation, route }: any) {
  const { printerId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const [entries, setEntries] = useState<MaintenanceHistoryEntry[]>([]);

  useFocusEffect(useCallback(() => {
    getDatabase().then(db =>
      db.getAllAsync<MaintenanceHistoryEntry>(
        `SELECT * FROM maintenance_history WHERE printer_id = ? ORDER BY completed_at DESC`,
        [printerId]
      )
    ).then(setEntries);
  }, [printerId]));

  function renderEntry({ item }: { item: MaintenanceHistoryEntry }) {
    const parts: string[] = item.parts_replaced_json ? JSON.parse(item.parts_replaced_json) : [];
    const date = item.completed_at.split('T')[0];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={20} color={C.healthy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          {item.cost ? (
            <Text style={styles.cost}>${item.cost.toFixed(2)}</Text>
          ) : null}
        </View>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
        {item.print_hours_at_service != null && (
          <Text style={styles.hours}>At {item.print_hours_at_service.toFixed(1)} print hours</Text>
        )}
        {parts.length > 0 && (
          <Text style={styles.parts}>Parts: {parts.join(', ')}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Maintenance History</Text>

      <FlatList
        data={entries}
        keyExtractor={e => String(e.id)}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={C.textHint} />
            <Text style={styles.emptyText}>No maintenance logged yet.</Text>
            <Text style={styles.emptyHint}>After completing a task, log it here to track your printer's service history.</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.bg },
    listContent: { padding: Spacing.md, paddingBottom: insets.bottom + 80 },
    backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
    backText:    { ...Typography.smallBold, color: C.primary },
    pageTitle:   { ...Typography.h2, color: C.textPrimary, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },

    card:       { backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: 4 },
    taskTitle:  { ...Typography.bodyBold, color: C.textPrimary },
    date:       { ...Typography.caption, color: C.textHint },
    cost:       { ...Typography.smallBold, color: C.warning },
    notes:      { ...Typography.body, color: C.textSecondary, marginBottom: 4 },
    hours:      { ...Typography.caption, color: C.textHint, marginTop: 2 },
    parts:      { ...Typography.small, color: C.info, marginTop: 2 },

    empty:     { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
    emptyText: { ...Typography.body, color: C.textSecondary },
    emptyHint: { ...Typography.small, color: C.textHint, textAlign: 'center', maxWidth: 280 },
  });
}
