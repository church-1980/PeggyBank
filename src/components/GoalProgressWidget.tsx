import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SavingsGoal } from '../types';
import { formatCurrency } from '../utils/helpers';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import GoalBar, { goalBarColor, goalMilestone } from './GoalBar';

interface Props {
  goal: SavingsGoal;
  onPress?: () => void;
  onUnpin?: () => void;
}

export default function GoalProgressWidget({ goal, onPress, onUnpin }: Props) {
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const pct       = goal.target_amount > 0 ? Math.min(1, goal.current_amount / goal.target_amount) : 0;
  const pctInt    = Math.round(pct * 100);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const barColor  = goalBarColor(pct);

  return (
    <TouchableOpacity style={styles.widget} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.topRow}>
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        <View style={styles.rightInfo}>
          <Text style={[styles.pctText, { color: barColor }]}>{pctInt}%</Text>
          {onUnpin && (
            <TouchableOpacity
              onPress={onUnpin}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              style={styles.unpinBtn}
              testID="unpin-button"
            >
              <Ionicons name="close-outline" size={18} color={C.textHint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <GoalBar pct={pct} id={goal.id ?? 0} height={12} />

      <View style={styles.bottomRow}>
        <Text style={[styles.remaining, { color: C.textSecondary }]}>
          {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal reached!'}
        </Text>
        <Text style={[styles.milestone, { color: barColor }]} numberOfLines={1}>
          {goalMilestone(pct)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    widget: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.border,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
      overflow: 'hidden',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    goalName: {
      ...Typography.smallBold,
      color: C.textPrimary,
      flex: 1,
      paddingRight: Spacing.sm,
    },
    rightInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pctText: {
      ...Typography.smallBold,
      fontSize: 15,
    },
    unpinBtn: {
      marginLeft: 2,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    remaining: {
      ...Typography.caption,
    },
    milestone: {
      ...Typography.caption,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'right',
      paddingLeft: Spacing.sm,
    },
  });
}
