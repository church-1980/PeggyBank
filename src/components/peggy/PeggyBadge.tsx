import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyBadge — a small status/count pill. One implementation for "3", "New",
 * "Overdue", etc. Tone sets the color family; `solid` fills, otherwise it's a
 * soft tinted chip.
 */
interface Props {
  label: string | number;
  tone?: string;            // defaults to primary
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyBadge({ label, tone, solid = false, style, testID }: Props) {
  const C = useColors();
  const color = tone ?? C.primary;
  return (
    <View
      testID={testID}
      style={[
        {
          alignSelf: 'flex-start',
          minWidth: 20,
          paddingHorizontal: 8,
          height: 20,
          borderRadius: Radius.full,
          backgroundColor: solid ? color : color + '1E',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={[Typography.label, { color: solid ? '#FFFFFF' : color, letterSpacing: 0.2 }]}>
        {label}
      </Text>
    </View>
  );
}
