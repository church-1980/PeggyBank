import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography, Shadow } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function AboutScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C, insets), [C, insets]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Ionicons name="construct" size={64} color={C.primary} />
        <Text style={styles.appName}>The Plastic Surgeon</Text>
        <Text style={styles.tagline}>Saving printers one layer at a time.</Text>
        <Text style={styles.creator}>Created by Jester's Workshop</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mission</Text>
        <Text style={styles.body}>
          The Plastic Surgeon exists to reduce failed prints, extend printer life, and make
          maintenance approachable for every maker — regardless of technical skill.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Privacy</Text>
        <Text style={styles.body}>
          Everything stays on your device. Inspection photos, maintenance records, and printer
          data are stored locally and never uploaded without your explicit action.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Architecture</Text>
        <Text style={styles.body}>
          Built offline-first with SQLite. All maintenance guides are bundled with the app —
          they work in your garage, workshop, or anywhere else without a network connection.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(C: any, insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content:   { padding: Spacing.md, paddingBottom: insets.bottom + 80 },

    backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.lg },
    backText: { ...Typography.smallBold, color: C.primary },

    hero:    { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.lg },
    appName: { ...Typography.h2, color: C.textPrimary, marginTop: Spacing.md },
    tagline: { ...Typography.body, color: C.primary, marginTop: Spacing.xs },
    creator: { ...Typography.small, color: C.textSecondary, marginTop: 4 },
    version: { ...Typography.caption, color: C.textHint, marginTop: 4 },

    section:      { backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.card },
    sectionTitle: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: Spacing.xs },
    body:         { ...Typography.body, color: C.textSecondary, lineHeight: 26 },
  });
}
