import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, IconSize } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyButton from './PeggyButton';

/**
 * PeggyErrorState — the ONE error treatment. Calm, plain-language, with a single
 * recovery action. No red walls of text.
 */
interface Props {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyErrorState({
  title = 'Something went sideways',
  message = "It's not you. Give it another try.",
  retryLabel = 'Try again',
  onRetry,
  style,
  testID,
}: Props) {
  const C = useColors();
  return (
    <View testID={testID} style={[{ paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.sm }, style]}>
      <Ionicons name="cloud-offline-outline" size={IconSize.xl} color={C.textHint} />
      <Text style={[Typography.cardTitle, { color: C.textPrimary, marginTop: Spacing.xs }]}>{title}</Text>
      <Text style={[Typography.helper, { color: C.textSecondary, textAlign: 'center', maxWidth: 260 }]}>{message}</Text>
      {onRetry ? (
        <PeggyButton label={retryLabel} onPress={onRetry} style={{ marginTop: Spacing.md, alignSelf: 'center', paddingHorizontal: 28 }} />
      ) : null}
    </View>
  );
}
