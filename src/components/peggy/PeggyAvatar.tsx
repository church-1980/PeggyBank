import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyAvatar — Design Bible §2 (Header).
 *
 * Circular profile image. Falls back to the user's initial on a soft purple
 * tint. Reserves the exact space the photo will occupy.
 */

interface Props {
  size?: number;
  source?: any;      // require(...) or { uri }
  name?: string;     // used for the initial fallback
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyAvatar({ size = 40, source, name, style, testID }: Props) {
  const C = useColors();
  const initial = (name ?? '').trim().charAt(0).toUpperCase();

  return (
    <View
      testID={testID}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: C.primary + '1F',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {source ? (
        <Image source={source} style={{ width: size, height: size, resizeMode: 'cover' }} />
      ) : (
        <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: C.primary }}>
          {initial || '·'}
        </Text>
      )}
    </View>
  );
}
