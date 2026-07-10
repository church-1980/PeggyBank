import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyIllustration from './PeggyIllustration';
import PeggyButton from './PeggyButton';

/**
 * PeggyEmptyState — Design Bible §18 (Empty States).
 *
 * An empty screen is where a user is most likely to leave. It must read as an
 * invitation, never as an error or a void — in the same warm voice as the
 * header and the goal cards.
 *
 * RULE: No empty state may be a bare message. Every one has artwork, an
 * encouraging sentence, and exactly one next action.
 */

interface Props {
  title: string;                 // encouraging, never system language
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  artwork?: any;                 // illustration when it exists
  tint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  artwork,
  tint,
  style,
  testID,
}: Props) {
  const C = useColors();

  return (
    <View
      testID={testID}
      style={[{ alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md }, style]}
    >
      <PeggyIllustration size={96} circle source={artwork} tint={tint ?? C.primary} />

      <Text
        style={[Typography.cardTitle, { color: C.textPrimary, marginTop: Spacing.md, textAlign: 'center' }]}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[Typography.helper, { color: C.textSecondary, marginTop: 6, textAlign: 'center' }]}
        >
          {message}
        </Text>
      ) : null}

      {onAction && actionLabel ? (
        <PeggyButton
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: Spacing.md, alignSelf: 'center', paddingHorizontal: 28 }}
        />
      ) : null}
    </View>
  );
}
