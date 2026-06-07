import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Path, Circle, Line, Ellipse, G,
  Defs, LinearGradient, Stop, Rect,
} from 'react-native-svg';
import { SavingsGoal } from '../types';
import { GOAL_TYPES, GoalType } from '../data/goalTypes';
import { formatCurrency } from '../utils/helpers';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  goal: SavingsGoal;
  onPress?: () => void;
  onUnpin?: () => void;
}

const STRIP_H   = 36;
const HORIZON_Y = 24;
const ICON_EDGE = 22;
const PATH_GAP  = 14;

function SmallAirplane({ a, cx, cy }: { a: string; cx: number; cy: number }) {
  const x = cx - 9;
  const y = cy - 5.5;
  return (
    <G>
      <Path
        d={`M${x},${y+5.5} L${x+15},${y+4} L${x+18},${y+5.5} L${x+15},${y+7} Z`}
        fill={a} fillOpacity={0.72} stroke={a} strokeWidth={1} strokeLinejoin="round"
      />
      <Path
        d={`M${x+6.5},${y+5.5} L${x+10},${y+1.5} L${x+13.5},${y+1.5} L${x+10.5},${y+5.5}`}
        fill={a} fillOpacity={0.52} stroke={a} strokeWidth={1} strokeLinejoin="round"
      />
      <Path
        d={`M${x+6.5},${y+5.5} L${x+10},${y+9.5} L${x+13.5},${y+9.5} L${x+10.5},${y+5.5}`}
        fill={a} fillOpacity={0.52} stroke={a} strokeWidth={1} strokeLinejoin="round"
      />
    </G>
  );
}

function SmallIsland({ a, cx, cy }: { a: string; cx: number; cy: number }) {
  const x = cx - 11;
  const y = cy - 22;
  return (
    <G>
      <Path
        d={`M${x},${y+26} Q${x+11},${y+20} ${x+22},${y+26} Z`}
        fill={a} fillOpacity={0.62} stroke={a} strokeWidth={1.2} strokeLinejoin="round"
      />
      <Path
        d={`M${x+11},${y+26} Q${x+9.5},${y+18} ${x+8},${y+12}`}
        fill="none" stroke={a} strokeWidth={2.5} strokeLinecap="round" opacity={0.8}
      />
      <Path
        d={`M${x+8},${y+13} Q${x+21},${y+7} ${x+22},${y+13}`}
        fill={a} fillOpacity={0.52} stroke={a} strokeWidth={1.5} strokeLinecap="round"
      />
      <Path
        d={`M${x+8},${y+13} Q${x},${y+7} ${x+1},${y+14}`}
        fill={a} fillOpacity={0.52} stroke={a} strokeWidth={1.5} strokeLinecap="round"
      />
    </G>
  );
}

export default function GoalProgressWidget({ goal, onPress, onUnpin }: Props) {
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [stripW, setStripW] = useState(280);

  const typeKey  = (goal.goal_type ?? 'other') as GoalType;
  const typeInfo = GOAL_TYPES[typeKey] ?? GOAL_TYPES.other;
  const a        = typeInfo.color;

  const pct       = goal.target_amount > 0 ? Math.min(1, goal.current_amount / goal.target_amount) : 0;
  const pctInt    = Math.round(pct * 100);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);

  const pathStartX = ICON_EDGE + PATH_GAP;
  const pathEndX   = stripW - ICON_EDGE - PATH_GAP;
  const dotX       = pathStartX + (pathEndX - pathStartX) * pct;

  const skyId = `wsky${goal.id ?? 0}`;
  const seaId = `wsea${goal.id ?? 0}`;

  return (
    <TouchableOpacity
      style={[styles.widget, { borderColor: a + '40' }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: a, opacity: 0.025 }]} pointerEvents="none" />

      <View style={styles.topRow}>
        <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
        <View style={styles.rightInfo}>
          <Text style={[styles.pctText, { color: a }]}>{pctInt}%</Text>
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

      <View
        style={styles.stripWrap}
        onLayout={e => setStripW(e.nativeEvent.layout.width)}
      >
        <Svg width={stripW} height={STRIP_H}>
          <Defs>
            <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={a} stopOpacity="0.04" />
              <Stop offset="1" stopColor={a} stopOpacity="0.12" />
            </LinearGradient>
            <LinearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={a} stopOpacity="0.14" />
              <Stop offset="1" stopColor={a} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          <Rect x={0} y={0} width={stripW} height={HORIZON_Y} fill={`url(#${skyId})`} />
          <Rect x={0} y={HORIZON_Y} width={stripW} height={STRIP_H - HORIZON_Y} fill={`url(#${seaId})`} />
          <Line x1={0} y1={HORIZON_Y} x2={stripW} y2={HORIZON_Y} stroke={a} strokeWidth={0.7} opacity={0.22} />

          <Line
            x1={pathStartX} y1={HORIZON_Y}
            x2={Math.max(pathStartX, dotX - 8)} y2={HORIZON_Y}
            stroke={a} strokeWidth={2.5} strokeLinecap="round" opacity={0.72}
          />
          <Line
            x1={Math.min(pathEndX, dotX + 8)} y1={HORIZON_Y}
            x2={pathEndX} y2={HORIZON_Y}
            stroke={a} strokeWidth={2} strokeDasharray="5 7"
            strokeLinecap="round" opacity={0.22}
          />

          <SmallAirplane a={a} cx={ICON_EDGE} cy={HORIZON_Y - 5} />
          <SmallIsland   a={a} cx={stripW - ICON_EDGE} cy={HORIZON_Y} />

          {pct > 0.04 && pct < 0.96 && (
            <>
              <Circle cx={dotX} cy={HORIZON_Y} r={8} fill={a} fillOpacity={0.12} />
              <Circle cx={dotX} cy={HORIZON_Y} r={4} fill={a} stroke={C.bgCard} strokeWidth={2} />
            </>
          )}
        </Svg>
      </View>

      <Text style={[styles.remaining, { color: C.textSecondary }]}>
        {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal reached!'}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    widget: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
      overflow: 'hidden',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
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
    stripWrap: {
      height: STRIP_H,
      marginHorizontal: -Spacing.md,
      overflow: 'hidden',
    },
    remaining: {
      ...Typography.caption,
      marginTop: 4,
    },
  });
}
