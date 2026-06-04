import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Spacing, Radius, Typography, Shadow, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

const SHARE_URL = 'https://peggybank.app';
const SHARE_MESSAGE = `PeggyBank — calm, private budgeting that lives entirely on your phone.\n\nNo accounts. No internet. No stress.\n\n${SHARE_URL}`;

export default function ShareScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const handleShare = async () => {
    await Share.share({ message: SHARE_MESSAGE, title: 'PeggyBank' });
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Share PeggyBank</Text>
      </View>

      <Text style={styles.subtitle}>
        Know someone who worries about money? Share this calm, private budgeting app with them.
      </Text>

      <View style={styles.qrCard}>
        <View style={styles.qrLogoRow}>
          <View style={styles.qrLogoIcon}>
            <Ionicons name="heart" size={20} color={C.primary} />
          </View>
          <Text style={styles.qrAppName}>PeggyBank</Text>
        </View>

        <Text style={styles.qrTagline}>Calm. Private. Yours.</Text>

        <View style={styles.qrBox}>
          <QRCode
            value={SHARE_URL}
            size={180}
            backgroundColor="transparent"
            color={C.textPrimary}
          />
        </View>

        <Text style={styles.qrInstructions}>Scan with your phone's camera</Text>
        <Text style={styles.qrUrl}>{SHARE_URL}</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Ionicons name="share-social-outline" size={20} color={C.textOnPrimary} />
        <Text style={styles.shareBtnText}>Share with a Friend</Text>
      </TouchableOpacity>

      <View style={styles.noteCard}>
        <Ionicons name="lock-closed-outline" size={16} color={C.income} />
        <Text style={styles.noteText}>
          Sharing this app never sends your personal data. Only the app link is shared.
        </Text>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.bg },
    content:     { padding: Spacing.md },

    header:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, paddingTop: Spacing.sm },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    title:       { ...Typography.h2, color: C.textPrimary },
    subtitle:    { ...Typography.small, color: C.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },

    qrCard: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: Spacing.lg,
      ...Shadow.soft,
    },
    qrLogoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    qrLogoIcon: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: C.primary + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    qrAppName:   { ...Typography.h3, color: C.textPrimary },
    qrTagline:   { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.xl },
    qrBox: {
      backgroundColor: C.bg,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
    },
    qrInstructions: { ...Typography.small, color: C.textSecondary, marginBottom: 6 },
    qrUrl:           { ...Typography.caption, color: C.textHint },

    shareBtn: {
      backgroundColor: C.primary,
      borderRadius: Radius.lg,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: Spacing.md,
    },
    shareBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },

    noteCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
      backgroundColor: C.income + '0E',
      borderRadius: Radius.md,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: C.income + '30',
    },
    noteText: { ...Typography.small, color: C.textSecondary, flex: 1, lineHeight: 22 },
  });
}
