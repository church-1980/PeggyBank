import React from 'react';
import { TouchableOpacity, Text, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyIconFrame from './PeggyIconFrame';
import { IconKey, ICON_REGISTRY } from '../../data/iconRegistry';

/**
 * PeggyPickerTile — the ONE selectable concept tile (category/goal-type pickers).
 * Icon frame + label, with a single shared selected treatment. Screens never
 * build their own picker cell.
 */
interface Props {
  iconKey: IconKey;
  label?: string;                 // defaults to the concept label
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyPickerTile({ iconKey, label, selected = false, onPress, style, testID }: Props) {
  const C = useColors();
  const entry = ICON_REGISTRY[iconKey] ?? ICON_REGISTRY.other;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          alignItems: 'center',
          gap: 6,
          padding: Spacing.sm,
          borderRadius: Radius.lg,
          backgroundColor: selected ? entry.color + '14' : 'transparent',
          borderWidth: 1.5,
          borderColor: selected ? entry.color : C.border,
        },
        style,
      ]}
    >
      <PeggyIconFrame iconKey={iconKey} size="card" shape="tile" selected={selected} />
      <Text style={[Typography.helper, { color: C.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
        {label ?? entry.label}
      </Text>
    </TouchableOpacity>
  );
}
