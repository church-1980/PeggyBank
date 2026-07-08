import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, IconSize, IconBadgeSize } from '../theme';
import { ICON_REGISTRY, IconKey } from '../data/iconRegistry';

/**
 * IconBadge — THE single standard container for a category/concept icon.
 *
 * One shape everywhere: a soft rounded square tinted with the concept color.
 * Resolves its artwork from the icon registry by `iconKey`, so it renders the
 * premium PNG the moment one exists for that bucket, and the Ionicon fallback
 * until then — no call site changes when the PNGs land.
 *
 * Use this for every category/goal concept icon. Do not build ad-hoc icon
 * wrappers on individual screens.
 */

interface Props {
  iconKey: IconKey;
  color: string;
  size?: number;      // container size (default = IconBadgeSize)
  iconSize?: number;  // glyph size (default = IconSize.sm) — use only IconSize.*
  tinted?: boolean;   // tinted background (default true)
  style?: StyleProp<ViewStyle>;
}

export default function IconBadge({
  iconKey,
  color,
  size = IconBadgeSize,
  iconSize = IconSize.sm,
  tinted = true,
  style,
}: Props) {
  const entry = ICON_REGISTRY[iconKey] ?? ICON_REGISTRY.other;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: Radius.sm,
          backgroundColor: tinted ? color + '18' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {entry.image ? (
        <Image
          source={entry.image}
          style={{ width: iconSize + 10, height: iconSize + 10, resizeMode: 'contain' }}
        />
      ) : (
        <Ionicons name={entry.ionicon} size={iconSize} color={color} />
      )}
    </View>
  );
}
