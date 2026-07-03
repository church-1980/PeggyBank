/**
 * GoalProgressCard — full goal card for the Goals screen.
 *
 * The hero is a motivational color-climbing progress bar (red → green → blue as
 * it fills). No illustrations — the bar, the big percentage, and the numbers do
 * the work. See GoalBar for the color logic.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SavingsGoal } from '../types';
import { GOAL_TYPES, GoalType } from '../data/goalTypes';
import { formatCurrency } from '../utils/helpers';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import GoalBar, { goalBarColor, goalMilestone } from './GoalBar';

interface Props {
  goal: SavingsGoal;
  onPress?: () => void;
  onUnpin?: () => void;
}

export default function GoalProgressCard({ goal, onPress, onUnpin }: Props) {
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const typeKey  = (goal.goal_type ?? 'other') as GoalType;
  const typeInfo = GOAL_TYPES[typeKey] ?? GOAL_TYPES.other;

  const pct       = goal.target_amount > 0 ? Math.min(1, goal.current_amount / goal.target_amount) : 0;
  const pctInt    = Math.round(pct * 100);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const barColor  = goalBarColor(pct);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {onUnpin && (
        <TouchableOpacity
          style={styles.unpinBtn}
          onPress={onUnpin}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={styles.unpinX}>×</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typePill, { backgroundColor: barColor + '1E', borderColor: barColor + '40' }]}>
          <Text style={[styles.typePillText, { color: barColor }]}>{typeInfo.label.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>

      {/* Big percentage + encouragement */}
      <View style={styles.pctRow}>
        <View style={styles.pctBlock}>
          <Text style={[styles.pctNum, { color: barColor }]}>{pctInt}</Text>
          <Text style={[styles.pctSign, { color: barColor }]}>%</Text>
        </View>
        <Text style={[styles.milestone, { color: barColor }]} numberOfLines={1}>
          {goalMilestone(pct)}
        </Text>
      </View>

      {/* Hero bar */}
      <GoalBar pct={pct} id={goal.id ?? 0} height={16} />

      {/* Numbers */}
      <View style={styles.statsRow}>
        <Text style={styles.savedAmt}>
          {formatCurrency(goal.current_amount)} <Text style={styles.statsSub}>saved</Text>
        </Text>
        <Text style={styles.statsSub}>
          {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal reached'}
        </Text>
      </View>
      <Text style={styles.targetSub}>
        {'of ' + formatCurrency(goal.target_amount) + (goal.deadline ? '  ·  by ' + goal.deadline : '')}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      paddingTop: 14,
      paddingHorizontal: Spacing.md,
      paddingBottom: 14,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 4,
    },
    unpinBtn: { position: 'absolute', top: 8, right: 10, zIndex: 10 },
    unpinX:   { fontSize: 22, lineHeight: 24, fontWeight: '300', color: C.textHint },

    header:  { flexDirection: 'row', marginBottom: 5 },
    typePill: {
      borderWidth: 1, borderRadius: Radius.full,
      paddingHorizontal: 9, paddingVertical: 3,
    },
    typePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9 },

    goalName: {
      ...Typography.bodyBold, color: C.textPrimary,
      paddingRight: 24, marginBottom: 10,
    },

    pctRow: {
      flexDirection: 'row', alignItems: 'flex-end',
      justifyContent: 'space-between', marginBottom: 8,
    },
    pctBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
    pctNum:   { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
    pctSign:  { fontSize: 18, fontWeight: '700', lineHeight: 30, letterSpacing: -0.5 },
    milestone: {
      ...Typography.smallBold, fontWeight: '700',
      flexShrink: 1, textAlign: 'right', paddingLeft: Spacing.sm, paddingBottom: 4,
    },

    statsRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginTop: 12,
    },
    savedAmt: { ...Typography.smallBold, color: C.textPrimary },
    statsSub: { ...Typography.caption, color: C.textSecondary, fontWeight: '400' },
    targetSub: { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
  });
}
