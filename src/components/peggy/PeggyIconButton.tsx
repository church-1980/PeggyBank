import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyIconButton — a single circular tap target for a UI affordance
 * (back, close, bell, more). This is the ONE circular icon button; screens
 * never hand-roll a TouchableOpacity around an Ionicon.
 */

type Variant = 'plain' | 'soft' | 'solid';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;          // container diameter (default 40)
  variant?: Variant;
  tone?: string;          // icon / accent color (default textSecondary)
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyIconButton({
  icon, onPress, size = 40, variant = 'plain', tone, accessibilityLabel, style, testID,
}: Props) {
  const C = useColors();
  const color = tone ?? C.textSecondary;
  const bg =
    variant === 'solid' ? (tone ?? C.primary) :
    variant === 'soft'  ? color + '18' : 'transparent';
  const glyph = variant === 'solid' ? '#FFFFFF' : color;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.55} color={glyph} />
    </TouchableOpacity>
  );
}
