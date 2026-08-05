import React from 'react';
import { View, Text, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyLoadingState — the ONE loading treatment. Centered spinner + calm line.
 */
interface Props {
  message?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyLoadingState({ message = 'One moment…', style, testID }: Props) {
  const C = useColors();
  return (
    <View testID={testID} style={[{ paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.md }, style]}>
      <ActivityIndicator color={C.primary} />
      <Text style={[Typography.helper, { color: C.textSecondary }]}>{message}</Text>
    </View>
  );
}
