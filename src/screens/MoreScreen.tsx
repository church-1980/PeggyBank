import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function MoreScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  const items = [
    { label: 'Settings', icon: 'settings-outline',          route: 'Settings' },
    { label: 'About',    icon: 'information-circle-outline', route: 'About' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.pageTitle}>More</Text>
      {items.map(item => (
        <TouchableOpacity
          key={item.label}
          style={styles.row}
          onPress={() => navigation.navigate(item.route)}
        >
          <Ionicons name={item.icon as any} size={22} color={C.primary} />
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textHint} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content:   { padding: Spacing.md, paddingBottom: insets.bottom + 80 },
    pageTitle: { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.lg },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      backgroundColor: C.bgCard, borderRadius: Radius.md,
      padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card,
    },
    rowLabel: { ...Typography.body, color: C.textPrimary, flex: 1 },
  });
}
