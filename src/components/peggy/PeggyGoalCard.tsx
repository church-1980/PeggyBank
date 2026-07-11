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

/**
 * Bar color encodes progress by MILESTONE BAND (Design System §5) — discrete,
 * never a continuous blend, so the user instantly understands their stage:
 *   0–24% coral · 25–49% orange · 50–74% purple · 75–99% teal/green · 100% gold
 */
export function goalProgressColor(pct: number, C: ColorPalette): string {
  const p = Math.max(0, Math.min(1, pct));
  if (p >= 1)    return C.gold;     // complete (paired with a green success accent)
  if (p >= 0.75) return C.success;  // teal/green
  if (p >= 0.5)  return C.primary;  // PeggyBank purple
  if (p >= 0.25) return C.warning;  // orange
  return C.danger;                  // coral
}

/**
 * Primary encouraging line. The three in-progress phrases are verbatim from the
 * Design Bible; the completed phrase is the approved completed state.
 */
export function goalEncouragement(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  if (p >= 1)   return 'You did it!';
  if (p >= 0.7) return 'Almost there!';
  if (p >= 0.4) return "You're doing great!";
  return 'Every dollar gets you closer!';
}

/** Secondary line — only the approved completed state has one. */
export function goalEncouragementSecondary(pct: number): string | null {
  return pct >= 1 ? 'Goal complete — amazing work! 🎉' : null;
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
  const done = pct >= 1;
  // Completed = gold bar with a subtle green success accent on the text (§5).
  const encColor = done ? C.success : barColor;
  const secondary = goalEncouragementSecondary(pct);

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

          {/* Encouragement — required field, with a small leading icon (Bible §4) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 }}>
            <Ionicons
              name={done ? 'trophy' : 'sparkles'}
              size={12}
              color={encColor}
            />
            <Text style={[Typography.helper, { color: encColor, fontWeight: '700' }]} numberOfLines={1}>
              {goalEncouragement(pct)}
            </Text>
          </View>
          {secondary ? (
            <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {secondary}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={IconSize.sm} color={C.textHint} />
      </View>
    </PeggyCard>
  );
}
