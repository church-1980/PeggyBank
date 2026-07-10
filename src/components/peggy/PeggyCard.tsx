import React from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Radius, Shadow } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyCard — Design Bible §7 (Cards), §8 (Shadows), §9 (Borders), §10 (Radius).
 *
 * White surface on the off-white background. Generously rounded. Separated by a
 * soft, purple-tinted shadow — NEVER by a border. All content in PeggyBank is
 * grouped in these cards.
 */

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;                 // inner padding (default true)
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyCard({ children, onPress, padded = true, style, testID }: Props) {
  const C = useColors();

  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      padding: padded ? Spacing.md : 0,
      shadowColor: Shadow.card.shadowColor,
      shadowOffset: Shadow.card.shadowOffset,
      shadowOpacity: Shadow.card.shadowOpacity,
      shadowRadius: Shadow.card.shadowRadius,
      elevation: Shadow.card.elevation,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity testID={testID} style={cardStyle} onPress={onPress} activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View testID={testID} style={cardStyle}>{children}</View>;
}
