/**
 * GoalProgressCard — Vacation prototype
 *
 * Card is 180–210px tall.
 * Journey strip is the hero (80px, ~45% of card).
 * Stats are support, not the focus.
 * Custom photo replaces the island shape, not the whole strip.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Path, Circle, Line, Ellipse, G,
  Defs, LinearGradient, Stop, Rect,
  Image as SvgImage, ClipPath,
} from 'react-native-svg';
import { SavingsGoal } from '../types';
import { GOAL_TYPES, GoalType } from '../data/goalTypes';
import { formatCurrency } from '../utils/helpers';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface Props {
  goal: SavingsGoal;
  onPress?: () => void;
  onUnpin?: () => void;
}

// ─── Strip geometry (DO NOT change without visual test) ───────────────────────
const STRIP_H   = 80;   // journey strip height
const HORIZON_Y = 52;   // where sky meets sea — path runs here
const ICON_EDGE = 44;   // airplane/island centers from each edge
const PATH_GAP  = 28;   // gap from icon center to path start/end

// Photo destination dimensions (used when custom_image_uri is set)
const PHOTO_W = 48;
const PHOTO_H = 60;
const PHOTO_R = 10;

// ─── Airplane (left, ~36px wide × 22px tall) ──────────────────────────────────
function Airplane({ a, cx, cy }: { a: string; cx: number; cy: number }) {
  const x = cx - 18;   // bounding box starts here
  const y = cy - 11;
  return (
    <G>
      {/* Fuselage */}
      <Path
        d={`M${x},${y+11} L${x+30},${y+8} L${x+36},${y+11} L${x+30},${y+14} Z`}
        fill={a} fillOpacity={0.68}
        stroke={a} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Top wing */}
      <Path
        d={`M${x+13},${y+11} L${x+20},${y+3} L${x+27},${y+3} L${x+21},${y+11}`}
        fill={a} fillOpacity={0.52}
        stroke={a} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Bottom wing */}
      <Path
        d={`M${x+13},${y+11} L${x+20},${y+19} L${x+27},${y+19} L${x+21},${y+11}`}
        fill={a} fillOpacity={0.52}
        stroke={a} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Tail fin top */}
      <Path
        d={`M${x+3},${y+11} L${x},${y+5} L${x+8},${y+8} Z`}
        fill={a} fillOpacity={0.44}
        stroke={a} strokeWidth={1.2} strokeLinejoin="round"
      />
      {/* Tail fin bottom */}
      <Path
        d={`M${x+3},${y+11} L${x},${y+17} L${x+8},${y+14} Z`}
        fill={a} fillOpacity={0.44}
        stroke={a} strokeWidth={1.2} strokeLinejoin="round"
      />
      {/* Windows */}
      <Ellipse cx={x+20} cy={y+10} rx={2} ry={1.5} fill={a} fillOpacity={0.85} />
      <Ellipse cx={x+24} cy={y+10} rx={2} ry={1.5} fill={a} fillOpacity={0.85} />
      <Ellipse cx={x+28} cy={y+10} rx={2} ry={1.5} fill={a} fillOpacity={0.85} />
    </G>
  );
}

// ─── Palm island (right, ~44px wide × 52px tall) ──────────────────────────────
function Island({ a, cx, cy }: { a: string; cx: number; cy: number }) {
  // cy = HORIZON_Y; island base sits 4px below horizon
  const x = cx - 22;
  const y = cy - 46;
  return (
    <G>
      {/* Island base — bold filled mound */}
      <Path
        d={`M${x},${y+52} Q${x+22},${y+40} ${x+44},${y+52} Z`}
        fill={a} fillOpacity={0.62}
        stroke={a} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Trunk — thick, curves left as it rises */}
      <Path
        d={`M${x+22},${y+52} Q${x+19},${y+36} ${x+16},${y+24}`}
        fill="none" stroke={a} strokeWidth={4} strokeLinecap="round" opacity={0.82}
      />
      {/* Leaf sweeping right */}
      <Path
        d={`M${x+16},${y+25} Q${x+42},${y+13} ${x+44},${y+26}`}
        fill={a} fillOpacity={0.56}
        stroke={a} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* Leaf sweeping left */}
      <Path
        d={`M${x+16},${y+25} Q${x},${y+14} ${x+2},${y+28}`}
        fill={a} fillOpacity={0.56}
        stroke={a} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* Leaf upper-right — goes tall */}
      <Path
        d={`M${x+16},${y+25} Q${x+36},${y+6} ${x+42},${y+18}`}
        fill={a} fillOpacity={0.48}
        stroke={a} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* Leaf upper-left */}
      <Path
        d={`M${x+16},${y+25} Q${x+2},${y+6} ${x},${y+18}`}
        fill={a} fillOpacity={0.42}
        stroke={a} strokeWidth={2.5} strokeLinecap="round"
      />
    </G>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GoalProgressCard({ goal, onPress, onUnpin }: Props) {
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [stripW, setStripW] = useState(320);

  const typeKey  = (goal.goal_type ?? 'other') as GoalType;
  const typeInfo = GOAL_TYPES[typeKey] ?? GOAL_TYPES.other;
  const a        = typeInfo.color; // accent shorthand

  const pct       = goal.target_amount > 0 ? Math.min(1, goal.current_amount / goal.target_amount) : 0;
  const pctInt    = Math.round(pct * 100);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);

  // Path endpoints
  const pathStartX = ICON_EDGE + PATH_GAP;          // ~72
  const pathEndX   = stripW - ICON_EDGE - PATH_GAP; // ~stripW-72
  const dotX       = pathStartX + (pathEndX - pathStartX) * pct;

  // Destination photo position (when custom image is set)
  const destCX   = stripW - ICON_EDGE;
  const photoX   = destCX - PHOTO_W / 2;
  const photoY   = HORIZON_Y - PHOTO_H + 6; // sits above+below horizon

  const skyId    = `sky${goal.id ?? 0}`;
  const seaId    = `sea${goal.id ?? 0}`;
  const clipId   = `clip${goal.id ?? 0}`;
  const hasPhoto = !!goal.custom_image_uri;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: a + '45' }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Subtle teal tint over whole card */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: a, opacity: 0.025 }]} pointerEvents="none" />

      {/* Unpin */}
      {onUnpin && (
        <TouchableOpacity
          style={styles.unpinBtn}
          onPress={onUnpin}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={styles.unpinX}>×</Text>
        </TouchableOpacity>
      )}

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.typePill, { backgroundColor: a + '1E', borderColor: a + '40' }]}>
          <Text style={[styles.typePillText, { color: a }]}>{typeInfo.label.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>

      {/* ── Journey strip ── */}
      <View
        style={styles.stripWrap}
        onLayout={e => setStripW(e.nativeEvent.layout.width)}
      >
        <Svg width={stripW} height={STRIP_H}>
          <Defs>
            {/* Sky — faint tint, darker near horizon */}
            <LinearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"   stopColor={a} stopOpacity="0.04" />
              <Stop offset="1"   stopColor={a} stopOpacity="0.13" />
            </LinearGradient>
            {/* Sea — richer tint below horizon */}
            <LinearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={a} stopOpacity="0.15" />
              <Stop offset="1" stopColor={a} stopOpacity="0.06" />
            </LinearGradient>
            {/* Custom photo clip */}
            {hasPhoto && (
              <ClipPath id={clipId}>
                <Rect x={photoX} y={photoY} width={PHOTO_W} height={PHOTO_H} rx={PHOTO_R} />
              </ClipPath>
            )}
          </Defs>

          {/* Sky zone */}
          <Rect x={0} y={0} width={stripW} height={HORIZON_Y} fill={`url(#${skyId})`} />
          {/* Sea zone */}
          <Rect x={0} y={HORIZON_Y} width={stripW} height={STRIP_H - HORIZON_Y} fill={`url(#${seaId})`} />
          {/* Horizon line */}
          <Line x1={0} y1={HORIZON_Y} x2={stripW} y2={HORIZON_Y} stroke={a} strokeWidth={0.8} opacity={0.25} />

          {/* Completed path */}
          <Line
            x1={pathStartX} y1={HORIZON_Y}
            x2={Math.max(pathStartX, dotX - 12)} y2={HORIZON_Y}
            stroke={a} strokeWidth={3} strokeLinecap="round" opacity={0.72}
          />
          {/* Remaining path */}
          <Line
            x1={Math.min(pathEndX, dotX + 12)} y1={HORIZON_Y}
            x2={pathEndX} y2={HORIZON_Y}
            stroke={a} strokeWidth={2.5} strokeDasharray="6 9"
            strokeLinecap="round" opacity={0.24}
          />

          {/* Origin: airplane */}
          <Airplane a={a} cx={ICON_EDGE} cy={HORIZON_Y - 10} />

          {/* Destination: island OR custom photo */}
          {hasPhoto ? (
            <>
              {/* Subtle glow behind photo */}
              <Circle cx={destCX} cy={HORIZON_Y - 8} r={30} fill={a} fillOpacity={0.10} />
              <SvgImage
                href={goal.custom_image_uri!}
                x={photoX} y={photoY}
                width={PHOTO_W} height={PHOTO_H}
                clipPath={`url(#${clipId})`}
                preserveAspectRatio="xMidYMid slice"
              />
              {/* Border ring around photo */}
              <Rect
                x={photoX} y={photoY}
                width={PHOTO_W} height={PHOTO_H}
                rx={PHOTO_R}
                fill="none"
                stroke={a} strokeWidth={1.5} opacity={0.60}
              />
            </>
          ) : (
            <Island a={a} cx={destCX} cy={HORIZON_Y} />
          )}

          {/* Progress marker */}
          {pct > 0.04 && pct < 0.96 && (
            <>
              <Circle cx={dotX} cy={HORIZON_Y} r={14} fill={a} fillOpacity={0.14} />
              <Circle cx={dotX} cy={HORIZON_Y} r={7}  fill={a} stroke={C.bgCard} strokeWidth={2.5} />
            </>
          )}
        </Svg>
      </View>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.pctBlock}>
          <Text style={[styles.pctNum, { color: a }]}>{pctInt}</Text>
          <Text style={[styles.pctSign, { color: a }]}>%</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: a + '38' }]} />
        <View style={styles.statsRight}>
          <Text style={styles.savedAmt}>{formatCurrency(goal.current_amount)} saved</Text>
          <Text style={styles.statsSub}>
            {'of ' + formatCurrency(goal.target_amount) +
             (remaining > 0 ? '  ·  ' + formatCurrency(remaining) + ' to go' : '  ·  Goal reached')}
          </Text>
          {goal.deadline ? (
            <Text style={styles.statsSub}>Target: {goal.deadline}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      paddingTop: 14,
      paddingHorizontal: Spacing.md,
      paddingBottom: 14,
      marginBottom: Spacing.sm,
      overflow: 'hidden',
      // Soft shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 4,
    },
    unpinBtn: { position: 'absolute', top: 8, right: 10, zIndex: 10 },
    unpinX:   { fontSize: 22, lineHeight: 24, fontWeight: '300', color: C.textHint },

    header:      { flexDirection: 'row', marginBottom: 5 },
    typePill: {
      borderWidth: 1, borderRadius: Radius.full,
      paddingHorizontal: 9, paddingVertical: 3,
    },
    typePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9 },

    goalName: {
      ...Typography.bodyBold, color: C.textPrimary,
      paddingRight: 24, marginBottom: 10,
    },

    stripWrap: {
      height: STRIP_H,
      marginHorizontal: -Spacing.md,
      marginBottom: 12,
      overflow: 'hidden',
    },

    statsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    pctBlock: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 1, minWidth: 60,
    },
    pctNum:  { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 38 },
    pctSign: { fontSize: 18, fontWeight: '700', lineHeight: 34, letterSpacing: -0.5 },
    divider: { width: 1.5, height: 40, borderRadius: 1 },
    statsRight: { flex: 1, gap: 3 },
    savedAmt:   { ...Typography.smallBold, color: C.textPrimary },
    statsSub:   { ...Typography.caption, color: C.textSecondary },
  });
}
