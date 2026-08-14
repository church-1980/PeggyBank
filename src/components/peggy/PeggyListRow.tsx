import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import { useCustomLogos } from '../../context/CustomLogoContext';
import PeggyIconFrame from './PeggyIconFrame';
import { IconKey } from '../../data/iconRegistry';

/**
 * PeggyListRow — Design Bible §14 (List Rows).
 *
 * Anatomy, identical everywhere:
 *   circular icon badge · bold name over muted context · right-aligned bold amount
 *
 * RULES:
 *  - Amounts always align right so figures compare vertically at a glance.
 *  - Rows are separated by space, never by heavy lines.
 */

interface Props {
  iconKey: IconKey;
  iconColor: string;
  title: string;
  subtitle?: string;
  amount?: string;
  amountColor?: string;
  onPress?: () => void;
  right?: React.ReactNode;    // overrides `amount` when provided (e.g. chevron)
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyListRow({
  iconKey,
  iconColor,
  title,
  subtitle,
  amount,
  amountColor,
  onPress,
  right,
  style,
  testID,
}: Props) {
  const C = useColors();
  const { logoFor } = useCustomLogos();
  const logo = logoFor(title);    // a user-attached logo for this item name, if any

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm + 4,
          paddingVertical: Spacing.sm + 6, // ~14
        },
        style,
      ]}
    >
      <PeggyIconFrame
        iconKey={iconKey}
        tone={iconColor}
        shape="circle"
        size="card"
        overrideSource={logo ? { uri: logo } : undefined}
      />

      <View style={{ flex: 1 }}>
        <Text style={[Typography.cardTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ??
        (amount ? (
          <Text style={[Typography.amountRow, { color: amountColor ?? C.amount }]}>{amount}</Text>
        ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.85}>
        {body}
      </TouchableOpacity>
    );
  }
  return <View testID={testID}>{body}</View>;
}
