import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, IconFrameSize, IconFrameSizeName, CONCEPT_ICON, CONCEPT_ICON_FILL } from '../../theme';
import { ICON_REGISTRY, IconKey, iconLabel } from '../../data/iconRegistry';

/**
 * PeggyIconFrame — THE one container for every concept icon (Design System §13).
 *
 * The artwork and its container are separate systems:
 *   - the PNG in the registry is transparent + borderless,
 *   - THIS component supplies the shape, size, tint, padding, and states.
 *
 * No screen may draw its own circle/tile behind an icon, place a raw PNG, or
 * use a gray placeholder. Everything routes: concept → registry → PeggyIconFrame.
 *
 * Size is SEMANTIC (compact | standard | card | feature | hero) — never a raw
 * number in a screen. Artwork resolves to the premium PNG, or the Ionicon
 * fallback when a concept's art is still 'pending'.
 */

interface Props {
  iconKey: IconKey;
  size?: IconFrameSizeName | number;   // semantic name preferred; number only for internal use
  shape?: 'circle' | 'tile';
  tone?: string;                       // tint override (defaults to the concept's registry color)
  tinted?: boolean;                    // soft tinted background (default true)
  bg?: string;                         // explicit background (e.g. a pastel tile)
  selected?: boolean;
  disabled?: boolean;
  overrideSource?: any;                // user-attached custom logo — overrides the concept icon
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyIconFrame({
  iconKey,
  size = 'card',
  shape = 'circle',
  tone,
  tinted = true,
  bg,
  selected = false,
  disabled = false,
  overrideSource,
  style,
  testID,
}: Props) {
  const entry = ICON_REGISTRY[iconKey] ?? ICON_REGISTRY.other;
  // UNIFORM SIZE: `size` is accepted for compatibility but every concept icon
  // renders at CONCEPT_ICON so all screens match exactly.
  const px = CONCEPT_ICON;
  const color = tone ?? entry.color;
  const radius = shape === 'circle' ? px / 2 : Radius.tile;

  const background = overrideSource
    ? '#FFFFFF'
    : bg ?? (selected ? color + '2E' : tinted ? color + '1A' : 'transparent');

  return (
    <View
      testID={testID}
      accessibilityLabel={iconLabel(iconKey)}
      style={[
        {
          width: px,
          height: px,
          borderRadius: radius,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
        },
        selected && { borderWidth: 2, borderColor: color },
        style,
      ]}
    >
      {overrideSource ? (
        <Image source={overrideSource} style={{ width: px, height: px, resizeMode: 'cover' }} />
      ) : entry.image ? (
        <Image
          source={entry.image}
          style={{ width: px * CONCEPT_ICON_FILL, height: px * CONCEPT_ICON_FILL, resizeMode: 'contain' }}
        />
      ) : (
        <Ionicons name={entry.ionicon} size={px * 0.5} color={color} />
      )}
    </View>
  );
}
