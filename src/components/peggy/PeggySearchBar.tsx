import React from 'react';
import { View, TextInput, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Typography, IconSize } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggySearchBar — the ONE search field: a soft pill well with a search glyph
 * and a clear affordance. (search/close are UI affordances, not concept icons.)
 */
interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggySearchBar({ value, onChangeText, placeholder = 'Search', onClear, autoFocus, style, testID }: Props) {
  const C = useColors();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceMuted, borderRadius: Radius.full, paddingHorizontal: Spacing.md, height: 46 }, style]}>
      <Ionicons name="search" size={IconSize.sm} color={C.textHint} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textHint}
        autoFocus={autoFocus}
        style={[Typography.body, { flex: 1, color: C.textPrimary, padding: 0 }]}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={() => { onChangeText(''); onClear?.(); }}
          accessibilityRole="button"
          accessibilityLabel="Clear the search box"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={IconSize.sm} color={C.textHint} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
