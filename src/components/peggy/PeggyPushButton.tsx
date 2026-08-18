import React, { useRef } from 'react';
import {
  Animated, Pressable, Text, View, StyleProp, ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * A button that behaves like a real one.
 *
 * Instead of a flat rectangle that changes opacity, this sits on a darker base
 * so it has visible height. Pressing travels the cap down onto that base and
 * fires a haptic tap, then it springs back — so a choice feels pushed, not
 * tapped. Used for decisions that deserve weight, like confirming what a
 * photographed receipt is.
 */

interface Props {
  label: string;
  onPress: () => void;
  tone?: 'confirm' | 'neutral' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEPTH = 5; // how tall the button sits off its base

export default function PeggyPushButton({
  label, onPress, tone = 'confirm', icon, disabled = false, style, testID,
}: Props) {
  const C = useColors();
  const travel = useRef(new Animated.Value(0)).current;

  const face =
    tone === 'confirm' ? C.income :
    tone === 'danger'  ? C.danger :
    C.bgCard;

  const textColor = tone === 'neutral' ? C.textPrimary : C.textOnPrimary;

  // The base is a darkened copy of the face, so the button reads as one object
  // with thickness rather than two stacked shapes.
  const base = tone === 'neutral' ? C.border : shade(face);

  const press = (to: number) =>
    Animated.spring(travel, {
      toValue: to, useNativeDriver: true, speed: 40, bounciness: 6,
    }).start();

  return (
    <View style={[{ borderRadius: Radius.lg, backgroundColor: base, paddingBottom: DEPTH }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={() => {
          press(DEPTH);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }}
        onPressOut={() => press(0)}
        onPress={onPress}
      >
        <Animated.View
          style={{
            transform: [{ translateY: travel }],
            backgroundColor: face,
            borderRadius: Radius.lg,
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: disabled ? 0.5 : 1,
            borderWidth: tone === 'neutral' ? 1 : 0,
            borderColor: C.border,
          }}
        >
          {icon ? <Ionicons name={icon} size={22} color={textColor} /> : null}
          <Text style={[Typography.bodyBold, { color: textColor }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Darken a hex colour for the button's base, so the depth reads as one piece. */
function shade(hex: string, amount = 0.72): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const to = (v: string) => Math.round(parseInt(v, 16) * amount).toString(16).padStart(2, '0');
  return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
}
