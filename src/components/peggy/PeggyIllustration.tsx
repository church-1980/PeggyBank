import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import { Radius } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyIllustration — the artwork slot.
 *
 * Reserves the EXACT space a future PeggyBank illustration will occupy. When
 * the artwork arrives, drop it into `source` and nothing on the screen moves.
 *
 * Until then it renders a soft, tinted placeholder — never an emoji, never a
 * borrowed icon, never a gray box with a cross through it.
 *
 * RULE: Every illustration in PeggyBank is rendered through this component so
 * layout is identical before and after artwork exists.
 */

interface Props {
  size: number;                 // reserved square size
  source?: any;                 // require('...png') when the artwork exists
  circle?: boolean;             // circular slot (goal thumbnails, avatars)
  tint?: string;                // placeholder tint (defaults to primary)
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyIllustration({
  size,
  source,
  circle = false,
  tint,
  style,
  testID,
}: Props) {
  const C = useColors();
  const radius = circle ? size / 2 : Radius.md;
  const color = tint ?? C.primary;

  return (
    <View
      testID={testID}
      style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }, style]}
    >
      {source ? (
        <Image source={source} style={{ width: size, height: size, resizeMode: 'cover' }} />
      ) : (
        // Placeholder: soft tinted fill. Occupies the exact final footprint.
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: color + '1F',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderRadius: circle ? size : Radius.sm,
              backgroundColor: color + '33',
            }}
          />
        </View>
      )}
    </View>
  );
}
