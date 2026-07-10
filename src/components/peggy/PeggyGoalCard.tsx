import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, IconSize } from '../../theme';
import { useColors, } from '../../context/ThemeContext';
import { ColorPalette } from '../../theme/colors';
import PeggyCard from './PeggyCard';
import PeggyIllustration from './PeggyIllustration';
import PeggyProgressBar from './PeggyProgressBar';

/**
 * PeggyGoalCard — Design Bible §4 (Goals) + §5 (Progress Bars).
 *
 * Anatomy: circular artwork · bold name · muted "of $X" · colored bar ·
 * bold % · encouraging sentence · chevron.
 *
 * RULE: A goal is never shown as bare numbers. Encouragement is a REQUIRED
 * field, not a flourish — it changes with progress so the user is met where
 * they are.
 */

/** Bar color encodes progress (Bible §5). Low = coral, high = green/teal. */
export function goalProgressColor(pct: number, C: ColorPalette): string {
  const p = Math.max(0, Math.min(1, pct));
  if (p < 0.4) return C.danger;   // Bible: 28% renders coral
  if (p < 0.7) return C.warning;  // inferred (no mid-range sample in the Bible)
  return C.success;               // Bible: 72% / 74% render green-teal
}

/**
 * Encouraging line. The three phrases below are taken verbatim from the Design
 * Bible. The completed-state phrase is an addition (the Bible shows no
 * completed goal) — flagged in docs.
 */
export function goalEncouragement(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  if (p >= 1)   return 'Goal reached!';
  if (p >= 0.7) return 'Almost there!';
  if (p >= 0.4) return "You're doing great!";
  return 'Every dollar gets you closer!';
}

interface Props {
  name: string;
  current: number;
  target: number;
  formatAmount: (n: number) => string;
  artwork?: any;                 // registry PNG when it exists; placeholder until then
  artworkTint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyGoalCard({
  name,
  current,
  target,
  formatAmount,
  artwork,
  artworkTint,
  onPress,
  style,
  testID,
}: Props) {
  const C = useColors();
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  const pctInt = Math.round(pct * 100);
  const barColor = goalProgressColor(pct, C);

  return (
    <PeggyCard onPress={onPress} style={style} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 }}>
        <PeggyIllustration size={52} circle source={artwork} tint={artworkTint ?? barColor} />

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[Typography.cardTitle, { color: C.textPrimary, flex: 1 }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[Typography.percent, { color: C.textSecondary, marginLeft: Spacing.sm }]}>
              {pctInt}%
            </Text>
          </View>

          <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 1 }]} numberOfLines={1}>
            {formatAmount(current)} of {formatAmount(target)}
          </Text>

          {/* Bar: percentage lives OUTSIDE the bar (Bible §5) */}
          <PeggyProgressBar pct={pct} color={barColor} height={7} style={{ marginTop: 8 }} />

          {/* Encouragement — required field */}
          <Text style={[Typography.helper, { color: barColor, fontWeight: '600', marginTop: 7 }]} numberOfLines={1}>
            {goalEncouragement(pct)}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={IconSize.sm} color={C.textHint} />
      </View>
    </PeggyCard>
  );
}
