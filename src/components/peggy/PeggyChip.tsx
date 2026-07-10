import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyChip — small pill label (encouragement, status, tags).
 *
 * Design Bible §7/§10: full radius, tinted fill, no border. Used for the
 * encouraging line on goal cards and for lightweight status labels.
 */

interface Props {
  label: string;
  color?: string;             // tint (defaults to primary)
  icon?: React.ReactNode;     // optional leading element
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyChip({ label, color, icon, onPress, style, testID }: Props) {
  const C = useColors();
  const tint = color ?? C.primary;

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: tint + '16',
          borderRadius: Radius.full,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        style,
      ]}
    >
      {icon}
      <Text style={[Typography.helper, { color: tint, fontWeight: '600' }]}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View testID={testID}>{content}</View>;
}
