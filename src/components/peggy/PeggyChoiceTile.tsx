import React from 'react';
import { Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * One choice in a small set, with a line of plain English under it.
 *
 * PeggyPickerTile already covers picking a CONCEPT — a category, a goal type —
 * where an icon carries the meaning. This covers picking a BEHAVIOUR, where the
 * meaning needs a short sentence instead: "Auto-pay / It comes out on its own."
 *
 * It exists because BillsScreen had grown its own version of exactly this, which
 * is how a design system quietly stops being one.
 */

interface Props {
  title: string;
  /** One short line. Say what will happen, not what the setting is called. */
  help?: string;
  selected?: boolean;
  onPress: () => void;
  /** Tint for the selected state. Defaults to the app's primary. */
  tone?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyChoiceTile({
  title, help, selected = false, onPress, tone, style, testID,
}: Props) {
  const C = useColors();
  const tint = tone ?? C.primary;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={help ? title + '. ' + help : title}
      style={[
        {
          flex: 1,
          minHeight: 64,
          padding: Spacing.sm + 4,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: selected ? tint : C.border,
          backgroundColor: selected ? tint + '18' : 'transparent',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={[Typography.bodyBold, { color: selected ? tint : C.textPrimary }]}>{title}</Text>
      {help ? (
        <Text style={[Typography.caption, { color: C.textSecondary, marginTop: 2 }]}>{help}</Text>
      ) : null}
    </TouchableOpacity>
  );
}
