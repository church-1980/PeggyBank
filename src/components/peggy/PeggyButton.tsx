import React from 'react';
import { Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { Radius, Typography, Shadow } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyButton — Design Bible §16 (Buttons).
 *
 * Variants:
 *  - `primary` : purple fill, white text, radius 16, generous height (~52).
 *  - `pill`    : semi-transparent white pill, used on the hero for optional depth.
 *  - `fab`     : ~56 purple circle carrying the app's core verb.
 *
 * RULE: One primary button per screen. Secondary actions are pills or text
 * links — never a second filled button. Buttons are never sharp-cornered.
 */

type Variant = 'primary' | 'pill' | 'fab';

interface Props {
  label?: string;                 // not used by `fab`
  onPress: () => void;
  variant?: Variant;
  icon?: React.ReactNode;         // leading element (or the fab's glyph)
  iconRight?: React.ReactNode;    // trailing element
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  disabled = false,
  style,
  testID,
}: Props) {
  const C = useColors();

  if (variant === 'fab') {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Shadow.hero.shadowColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 14,
            elevation: 6,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {icon}
      </TouchableOpacity>
    );
  }

  const isPill = variant === 'pill';

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: isPill ? Radius.full : Radius.md,
          backgroundColor: isPill ? 'rgba(255,255,255,0.18)' : C.primary,
          paddingHorizontal: isPill ? 16 : 20,
          height: isPill ? 38 : 52,
          alignSelf: isPill ? 'flex-start' : 'stretch',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon}
      {label ? (
        <Text
          style={[
            isPill ? Typography.helper : Typography.cardTitle,
            { color: C.textOnPrimary, fontWeight: isPill ? '600' : '700' },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {iconRight}
    </TouchableOpacity>
  );
}
