import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Radius, IconSize, IconBadgeSize,
  CONCEPT_ICON, CONCEPT_ICON_INLINE, CONCEPT_ICON_TIER_THRESHOLD, CONCEPT_ICON_FILL,
} from '../theme';
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
  overrideSource?: any;   // user-attached custom logo — overrides the concept icon
  style?: StyleProp<ViewStyle>;
}

export default function IconBadge({
  iconKey,
  color,
  size = IconBadgeSize,
  iconSize = IconSize.sm,
  tinted = true,
  overrideSource,
  style,
}: Props) {
  const entry = ICON_REGISTRY[iconKey] ?? ICON_REGISTRY.other;
  // Snap to one of two uniform tiers so icons match everywhere in the same
  // context: inline (chips/tabs/toggles) or standard (tiles/rows/cards).
  const box = size < CONCEPT_ICON_TIER_THRESHOLD ? CONCEPT_ICON_INLINE : CONCEPT_ICON;
  const img = Math.round(box * CONCEPT_ICON_FILL);
  const glyph = Math.round(box * 0.62);
  return (
    <View
      style={[
        {
          width: box,
          height: box,
          borderRadius: Radius.sm,
          backgroundColor: overrideSource ? '#FFFFFF' : tinted ? color + '18' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {overrideSource ? (
        <Image source={overrideSource} style={{ width: box, height: box, resizeMode: 'cover' }} />
      ) : entry.image ? (
        <Image
          source={entry.image}
          style={{ width: img, height: img, resizeMode: 'contain' }}
        />
      ) : (
        <Ionicons name={entry.ionicon} size={glyph} color={color} />
      )}
    </View>
  );
}
