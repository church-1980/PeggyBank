import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyChip — small pill label (encouragement, status, tags).
 *
 * Design Bible §7/§10: full radius, tinted fill, no border. Used for the
 * encouraging line on goal cards and for lightweight status labels.
 */

interface Props {
  label: string;
  color?: string;             // tint (defaults to primary)
  icon?: React.ReactNode;     // optional leading element
  onPress?: () => void;
  /**
   * Chips are also used to CHOOSE — a category, a filter. A selected chip
   * fills in rather than merely tinting, so the choice is visible without
   * comparing two shades of the same colour to each other.
   */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyChip({ label, color, icon, onPress, selected = false, style, testID }: Props) {
  const C = useColors();
  const tint = color ?? C.primary;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: selected ? tint : tint + '16',
          borderRadius: Radius.full,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[Typography.helper, { color: selected ? C.textOnPrimary : tint, fontWeight: selected ? '700' : '600' }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View testID={testID}>{content}</View>;
}
