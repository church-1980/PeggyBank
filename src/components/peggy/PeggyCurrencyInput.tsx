import React from 'react';
import { View, Text, TextInput, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyCurrencyInput — the ONE money-entry field. Big, calm, currency symbol
 * baked in. Used on every "enter an amount" screen so amounts are entered the
 * same way everywhere.
 */
interface Props {
  value: string;
  onChangeText: (t: string) => void;
  currency?: string;               // default '$'
  placeholder?: string;            // default '0.00'
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyCurrencyInput({
  value, onChangeText, currency = '$', placeholder = '0.00', autoFocus, style, testID,
}: Props) {
  const C = useColors();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.bgInput,
          borderRadius: Radius.lg,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
        },
        style,
      ]}
    >
      <Text style={[Typography.heroAmount, { color: C.textSecondary, fontSize: 30 }]}>{currency}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textHint}
        keyboardType="decimal-pad"
        autoFocus={autoFocus}
        style={[Typography.heroAmount, { flex: 1, marginLeft: 4, color: C.textPrimary, fontSize: 34, paddingVertical: 0 }]}
      />
    </View>
  );
}
