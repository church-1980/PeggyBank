import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { PEGGY_ICONS, PeggyIconKey } from '../data/peggyIcons';

type PeggyIconProps = {
  name: PeggyIconKey;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function PeggyIcon({ name, size = 44, style }: PeggyIconProps) {
  return (
    <Image
      source={PEGGY_ICONS[name]}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
    />
  );
}
