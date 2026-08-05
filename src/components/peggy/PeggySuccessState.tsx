import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyButton from './PeggyButton';

/**
 * PeggySuccessState — the ONE success confirmation (saved, done, goal reached).
 * A soft success ring + checkmark + calm message. (checkmark is an affordance.)
 */
interface Props {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggySuccessState({ title = 'All set!', message, actionLabel, onAction, style, testID }: Props) {
  const C = useColors();
  return (
    <View testID={testID} style={[{ alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm }, style]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.success + '1F', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={40} color={C.success} />
      </View>
      <Text style={[Typography.h3, { color: C.textPrimary, marginTop: Spacing.xs }]}>{title}</Text>
      {message ? <Text style={[Typography.helper, { color: C.textSecondary, textAlign: 'center', maxWidth: 280 }]}>{message}</Text> : null}
      {onAction && actionLabel ? (
        <PeggyButton label={actionLabel} onPress={onAction} style={{ marginTop: Spacing.md, alignSelf: 'center', paddingHorizontal: 28 }} />
      ) : null}
    </View>
  );
}
