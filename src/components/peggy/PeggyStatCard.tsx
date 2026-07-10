import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyCard from './PeggyCard';

/**
 * PeggyStatCard — a single figure with its label.
 *
 * Design Bible §12 (Typography) + §21 (Hierarchy): the money is the boldest
 * element in the container; the label is muted beneath it.
 *
 * RULE: Never render a bare number without a muted label, and never make the
 * label louder than the figure.
 */

interface Props {
  label: string;
  value: string;
  valueColor?: string;
  caption?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyStatCard({ label, value, valueColor, caption, style, testID }: Props) {
  const C = useColors();

  return (
    <PeggyCard style={style} testID={testID}>
      <Text style={[Typography.helper, { color: C.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[Typography.h2, { color: valueColor ?? C.textPrimary, marginTop: 4 }]} numberOfLines={1}>
        {value}
      </Text>
      {caption ? (
        <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </PeggyCard>
  );
}
