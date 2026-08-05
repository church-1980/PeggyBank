import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Typography, Shadow } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyAvatar — Design Bible §2. THE only component that draws a profile/brand
 * circle. It owns the circular mask, background, optional border, shadow,
 * notification badge, and status dot.
 *
 * The asset MUST be transparent and borderless — the component supplies the one
 * and only circle. Three render modes, in priority order:
 *   1. `source`  → the user's photo, cropped `cover`.
 *   2. `brand`   → the Peggy mascot logo, `contain` on white (never cropped).
 *   3. initial   → first letter of `name` on a soft purple tint.
 *
 * Never place an image that already contains a circle inside this component.
 */

interface Props {
  size?: number;
  source?: any;          // user photo — { uri } or require(...)
  name?: string;         // initial fallback
  brand?: boolean;       // no photo → show the Peggy logo instead of an initial
  badgeCount?: number;   // small notification badge (top-right)
  dotColor?: string;     // status dot (bottom-right)
  bordered?: boolean;    // white ring + soft shadow (for photos on colored grounds)
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MASCOT = require('../../../assets/peggy-mascot.png');

export default function PeggyAvatar({
  size = 44,
  source,
  name,
  brand = false,
  badgeCount,
  dotColor,
  bordered = false,
  onPress,
  style,
  testID,
}: Props) {
  const C = useColors();
  const initial = (name ?? '').trim().charAt(0).toUpperCase();
  const r = size / 2;

  const circle = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: source ? C.bgCard : brand ? '#FFFFFF' : C.primary + '1F',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        bordered && { borderWidth: 2, borderColor: '#FFFFFF', ...Shadow.card },
      ]}
    >
      {source ? (
        <Image source={source} style={{ width: size, height: size, resizeMode: 'cover' }} />
      ) : brand ? (
        <Image source={MASCOT} style={{ width: size * 0.82, height: size * 0.82, resizeMode: 'contain' }} />
      ) : (
        <Text style={[Typography.cardTitle, { fontSize: size * 0.4, color: C.primary }]}>
          {initial || '·'}
        </Text>
      )}
    </View>
  );

  const wrapped = (
    <View testID={testID} style={[{ width: size, height: size }, style]}>
      {circle}

      {dotColor ? (
        <View
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
            backgroundColor: dotColor, borderWidth: 2, borderColor: C.bg,
          }}
        />
      ) : null}

      {badgeCount && badgeCount > 0 ? (
        <View
          style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: size * 0.4, height: size * 0.4, borderRadius: size * 0.2,
            paddingHorizontal: 4, backgroundColor: C.danger,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: C.bg,
          }}
        >
          <Text style={{ color: '#fff', fontSize: size * 0.22, fontWeight: '800' }}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        {wrapped}
      </TouchableOpacity>
    );
  }
  return wrapped;
}
