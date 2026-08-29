import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * A tick box with a label beside it.
 *
 * The app had no canonical one, so screens drew their own square and their own
 * checkmark whenever they needed a yes/no that is not a whole switch.
 *
 * The whole row is the target, not just the box: a 22pt square is a hard thing
 * to hit with a thumb, and the label is the part people aim at anyway.
 */

interface Props {
  label: string;
  checked: boolean;
  onToggle: () => void;
  /** Tint when checked. Defaults to the app's primary. */
  tone?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyCheckbox({ label, checked, onToggle, tone, style, testID }: Props) {
  const C = useColors();
  const tint = tone ?? C.primary;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2, minHeight: 48 },
        style,
      ]}
    >
      <View
        style={{
          width: 22, height: 22, borderRadius: Radius.sm / 2,
          borderWidth: 1,
          borderColor: checked ? tint : C.border,
          backgroundColor: checked ? tint : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked ? <Ionicons name="checkmark" size={14} color={C.textOnPrimary} /> : null}
      </View>
      <Text style={[Typography.caption, { color: C.textSecondary, flex: 1 }]}>{label}</Text>
    </TouchableOpacity>
  );
}
