import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, IconSize } from '../../theme';
import { ICON_REGISTRY, IconKey } from '../../data/iconRegistry';

/**
 * PeggyIconBadge — Design Bible §13 (Icons) + §10 (Radius).
 *
 * The container for every concept icon. Two shapes, chosen by context:
 *  - `circle` → list rows (Coming Up, history rows)
 *  - `square` → grids/tiles (pickers, quick actions)
 *
 * Artwork always resolves from the single icon registry: the premium PNG when
 * it exists, the Ionicon fallback until then. No screen may define its own icon.
 *
 * RULE: One concept = one artwork, everywhere, forever.
 */

interface Props {
  iconKey: IconKey;
  color: string;                    // concept color (tints bg + glyph)
  size?: number;                    // container size
  iconSize?: number;                // glyph size — use only IconSize.*
  shape?: 'circle' | 'square';
  bg?: string;                      // explicit background (e.g. pastel tile)
  tinted?: boolean;                 // tinted background (default true)
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyIconBadge({
  iconKey,
  color,
  size = 40,
  iconSize = IconSize.sm,
  shape = 'circle',
  bg,
  tinted = true,
  style,
  testID,
}: Props) {
  const entry = ICON_REGISTRY[iconKey] ?? ICON_REGISTRY.other;
  const radius = shape === 'circle' ? size / 2 : Radius.sm;

  return (
    <View
      testID={testID}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg ?? (tinted ? color + '18' : 'transparent'),
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
