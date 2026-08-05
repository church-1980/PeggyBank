import React, { useState } from 'react';
import { View, Text, TextInput, StyleProp, ViewStyle, TextInputProps } from 'react-native';
import { Radius, Typography, Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyInput — Design Bible §17 (Inputs).
 *
 * A soft FILLED WELL, never an outlined box. Focus is shown with a purple tint,
 * never a hard border. One height and one radius across the whole app.
 *
 * RULE: Outlined inputs are forbidden — they are the most "form-like" element
 * in software and instantly break the premium feel.
 */

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;                 // shows a soft danger-tinted well + message
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyInput({ label, error, containerStyle, testID, ...inputProps }: Props) {
  const C = useColors();
  const [focused, setFocused] = useState(false);
  const wellBg = error ? C.danger + '12' : focused ? C.primary + '12' : C.surfaceMuted;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text style={[Typography.helper, { color: C.textSecondary, marginBottom: 6 }]}>{label}</Text>
      ) : null}
      <View
        style={{
          height: 52,
          borderRadius: Radius.md,
          backgroundColor: wellBg,
          paddingHorizontal: Spacing.md,
          justifyContent: 'center',
        }}
      >
        <TextInput
          testID={testID}
          placeholderTextColor={C.textHint}
          {...inputProps}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          style={{
            ...Typography.body,
            color: C.textPrimary,
            padding: 0,
          }}
        />
      </View>
      {error ? (
        <Text style={[Typography.caption, { color: C.danger, marginTop: 5 }]}>{error}</Text>
      ) : null}
    </View>
  );
}
