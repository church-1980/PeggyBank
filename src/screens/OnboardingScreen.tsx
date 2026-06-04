import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface Step {
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'primary' | 'income' | 'goals' | 'bills';
  headline: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon:     'heart-outline',
    colorKey: 'primary',
    headline: "Let's make money feel less stressful.",
    body:     "PeggyBank is a calm, private space for your finances. No judgement. No pressure. Just you, at your own pace.",
  },
  {
    icon:     'lock-closed-outline',
    colorKey: 'income',
    headline: "Everything stays on your phone.",
    body:     "No accounts. No internet. No one can see your numbers. Your financial life is completely private and yours alone.",
  },
  {
    icon:     'shield-checkmark-outline',
    colorKey: 'goals',
    headline: "We'll take this one step at a time.",
    body:     "Start by logging what comes in and what goes out. PeggyBank will do the thinking so you don't have to.",
  },
  {
    icon:     'sunny-outline',
    colorKey: 'bills',
    headline: "You're already doing something good.",
    body:     "Just opening this app is a step toward feeling better about money. Peggy would be proud.",
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goNext = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setStep((s) => s + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const finish = async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_done', '1')`
    );
    navigation.replace('Home');
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const stepColor = C[current.colorKey];

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={[styles.iconCircle, { backgroundColor: stepColor + '18' }]}>
          <Ionicons name={current.icon} size={52} color={stepColor} />
        </View>

        <Text style={styles.headline}>{current.headline}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </Animated.View>

      <View style={styles.actions}>
        {isLast ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={finish} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color={C.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={C.textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} onPress={finish}>
              <Text style={styles.skipText}>Skip intro</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: Spacing.lg,
      paddingTop: 80,
      paddingBottom: 48,
      justifyContent: 'space-between',
    },
    dots: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.border,
    },
    dotActive: {
      backgroundColor: C.primary,
      width: 24,
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    iconCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    headline: {
      ...Typography.h2,
      color: C.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.md,
      lineHeight: 32,
    },
    body: {
      ...Typography.body,
      color: C.textSecondary,
      textAlign: 'center',
      lineHeight: 28,
    },
    actions: {
      gap: Spacing.sm,
    },
    primaryBtn: {
      backgroundColor: C.primary,
      borderRadius: Radius.lg,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    primaryBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    skipBtn:        { paddingVertical: 14, alignItems: 'center' },
    skipText:       { ...Typography.small, color: C.textHint },
  });
}
