import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyForm — the ONE form scaffold. Owns the vertical rhythm between fields and
 * an optional grouped title + footer (e.g. the save button). Screens drop
 * PeggyInput / PeggyCurrencyInput / PeggyPickerTile inside; they never set their
 * own field spacing.
 */
interface Props {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyForm({ title, children, footer, style, testID }: Props) {
  const C = useColors();
  return (
    <View testID={testID} style={[{ gap: Spacing.md }, style]}>
      {title ? <Text style={[Typography.h3, { color: C.textPrimary }]}>{title}</Text> : null}
      <View style={{ gap: Spacing.md }}>{children}</View>
      {footer ? <View style={{ marginTop: Spacing.sm }}>{footer}</View> : null}
    </View>
  );
}
