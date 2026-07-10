import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyDivider — Design Bible §9 (Borders).
 *
 * PeggyBank separates content with elevation and whitespace, not lines. This
 * component exists for the rare case where a hairline is genuinely needed
 * INSIDE a card (e.g. a totals row). It is deliberately barely visible.
 *
 * RULE: Reach for space first, tint second, this last. Never use a divider
 * between cards or between list rows.
 */

interface Props {
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export default function PeggyDivider({ spacing = Spacing.sm + 4, style }: Props) {
  const C = useColors();
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: C.borderLight,
          marginVertical: spacing,
        },
        style,
      ]}
    />
  );
}
