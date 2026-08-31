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
 *
 * COMPACT is for a row of actions that sits near something more important.
 * At full size these tiles carry as much visual weight as the Safe to Spend
 * card, which is wrong for four utilities: the eye lands on them and gets
 * nothing back. Compact keeps the same tap target and halves the presence.
 */

export type PastelTone = 'green' | 'blue' | 'peach' | 'purple';

interface Props {
  label: string;
  tone: PastelTone;
  onPress: () => void;
  iconKey?: IconKey;                              // concept icon (from registry)
  ionicon?: keyof typeof Ionicons.glyphMap;       // action-icon placeholder until PeggyBank action artwork exists
  /** Smaller icon, one line of text. Same tap target. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyQuickActionCard({ iconKey, ionicon, label, tone, onPress, compact = false, style, testID }: Props) {
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
          paddingVertical: compact ? Spacing.sm : Spacing.sm + 4,
          paddingHorizontal: 6,
          alignItems: 'center',
          // A tap target stays a tap target however small the art gets.
          minHeight: 64,
          justifyContent: 'center',
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
          size={compact ? 36 : 56}
          iconSize={IconSize.md}
          tinted={false}
        />
      )}
      <Text
        style={[Typography.helper, { color: C.textPrimary, fontWeight: '600', textAlign: 'center', marginTop: 2 }]}
        // One line when compact: a row where some labels wrap and others do not
        // reads as broken before anyone works out why.
        numberOfLines={compact ? 1 : 2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
