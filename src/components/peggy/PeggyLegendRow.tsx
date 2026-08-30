import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * One line of a chart's key: a colour, what it is, and how much.
 *
 * A chart's legend is the part that actually has to be readable. The ring is
 * the impression; this is the information — and it is what someone who cannot
 * separate the colours reads instead, so it is never optional decoration.
 *
 * PeggyListRow is for records you can open. A legend line explains a picture,
 * carries a colour swatch rather than an icon, and usually goes nowhere, which
 * is why it is its own component rather than a variant of that one.
 */

interface Props {
  color: string;
  label: string;
  /** Already formatted for display — this component does no money maths. */
  amount: string;
  /** Whole percent. Omitted when a share would be meaningless. */
  percent?: number;
  /**
   * Opens what the row stands for. A total nobody can open is a dead end:
   * the person sees what Restaurants cost and not what it was spent on.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyLegendRow({ color, label, amount, percent, onPress, style, testID }: Props) {
  const C = useColors();

  const Row: any = onPress ? TouchableOpacity : View;

  return (
    <Row
      testID={testID}
      onPress={onPress}
      // Read as one sentence rather than four disconnected fragments, and say
      // that it opens when it does — a swatch gives no hint that it is a button.
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        label + ', ' + amount + (percent != null ? ', ' + percent + ' percent' : '')
        + (onPress ? '. Tap to see what this was.' : '')
      }
      style={[
        { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: Spacing.sm },
        style,
      ]}
    >
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text style={[Typography.body, { color: C.textPrimary, flex: 1 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[Typography.body, { color: C.textPrimary, fontVariant: ['tabular-nums'] }]}>
        {amount}
      </Text>
      {percent != null ? (
        <Text
          style={[Typography.caption, {
            color: C.textSecondary, width: 42, textAlign: 'right',
            fontVariant: ['tabular-nums'],
          }]}
        >
          {percent}%
        </Text>
      ) : null}
    </Row>
  );
}
