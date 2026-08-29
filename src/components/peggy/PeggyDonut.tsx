import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/helpers';
import type { ChartSegment } from '../../core/spendingChart';

/**
 * A donut, drawn with the react-native-svg the project already ships.
 *
 * Each slice is one circle with a dashed stroke: one dash exactly as long as
 * the slice, then a gap for the rest of the ring, offset by everything drawn
 * before it. It needs no arc maths, so the two cases that break hand-rolled
 * arc paths — a single slice covering the whole ring, and a slice smaller than
 * a degree — both come out right without special handling.
 *
 * The chart is never the only way to read this: the list beside it carries the
 * same numbers in words, so nothing here depends on telling colours apart.
 */

interface Props {
  segments: ChartSegment[];
  /** The one number in the middle. */
  centreAmount: number;
  centreLabel: string;
  size?: number;
}

export default function PeggyDonut({ segments, centreAmount, centreLabel, size = 168 }: Props) {
  const C = useColors();
  const stroke = Math.round(size * 0.17);          // ring thickness, proportional
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.amount, 0);

  let drawn = 0;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="image"
      accessibilityLabel={accessibleSummary(segments, centreAmount)}
    >
      <Svg width={size} height={size}>
        {/* Start at the top rather than at three o'clock, which is where people
            expect a chart like this to begin reading. */}
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={C.borderLight} strokeWidth={stroke} fill="none"
          />
          {segments.map((seg) => {
            const len = total > 0 ? (seg.amount / total) * circumference : 0;
            const offset = -drawn;
            drawn += len;
            return (
              <Circle
                key={seg.key}
                cx={size / 2} cy={size / 2} r={r}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={[len, Math.max(0, circumference - len)]}
                strokeDashoffset={offset}
              />
            );
          })}
        </G>
      </Svg>

      {/* One number. Not a dashboard. */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={[Typography.cardTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {formatCurrency(centreAmount)}
        </Text>
        <Text style={[Typography.caption, { color: C.textSecondary }]}>{centreLabel}</Text>
      </View>
    </View>
  );
}

/**
 * What a screen reader says instead of seeing the ring. Only the biggest few,
 * because a spoken list of nine slices is not information, it is an obstacle.
 */
export function accessibleSummary(segments: ChartSegment[], total: number): string {
  if (!segments.length) return 'No spending to show this month.';
  const top = segments.slice(0, 3).map(s => s.label + ', ' + s.percent + ' percent');
  return 'Where ' + formatCurrency(total) + ' went. ' + top.join('. ') + '.';
}
