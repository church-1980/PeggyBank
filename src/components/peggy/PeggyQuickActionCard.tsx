import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Typography, IconSize, Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyIconBadge from './PeggyIconBadge';
import { IconKey } from '../../data/iconRegistry';

/**
 * PeggyQuickActionCard — Design Bible §6 (Quick Actions).
 *
 * A uniform square tile: soft pastel background, filled icon, small label.
 *
 * RULES:
 *  - Tiles are always identical in size, radius, elevation, and spacing.
 *    They differ ONLY by pastel color and icon.
 *  - Never use an outline icon in a tile.
 *  - If one action needs emphasis over the others, it does not belong here.
 */

export type PastelTone = 'green' | 'blue' | 'peach' | 'purple';

interface Props {
  label: string;
  tone: PastelTone;
  onPress: () => void;
  iconKey?: IconKey;                              // concept icon (from registry)
  ionicon?: keyof typeof Ionicons.glyphMap;       // action-icon placeholder until PeggyBank action artwork exists
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyQuickActionCard({ iconKey, ionicon, label, tone, onPress, style, testID }: Props) {
  const C = useColors();

  const tones: Record<PastelTone, { bg: string; tint: string }> = {
    green:  { bg: C.pastelGreenBg,  tint: C.pastelGreen },
    blue:   { bg: C.pastelBlueBg,   tint: C.pastelBlue },
    peach:  { bg: C.pastelPeachBg,  tint: C.pastelPeach },
    purple: { bg: C.pastelPurpleBg, tint: C.pastelPurple },
  };
  const { bg, tint } = tones[tone];

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        {
          flex: 1,
          backgroundColor: bg,
          borderRadius: Radius.tile,
          paddingVertical: Spacing.sm + 4,
          paddingHorizontal: 6,
          alignItems: 'center',
        },
        style,
      ]}
    >
      {ionicon ? (
        // Placeholder path: filled Ionicon in the pastel square until PeggyBank
        // action artwork exists. Reserves the same 40 footprint.
        <View
          style={{
            width: 40, height: 40, borderRadius: Radius.sm,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={ionicon} size={IconSize.md} color={tint} />
        </View>
      ) : (
        <PeggyIconBadge
          iconKey={iconKey ?? 'other'}
          color={tint}
          shape="square"
          size={40}
          iconSize={IconSize.md}
          tinted={false}
        />
      )}
      <Text
        style={[Typography.helper, { color: C.textPrimary, fontWeight: '600', textAlign: 'center', marginTop: 2 }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
