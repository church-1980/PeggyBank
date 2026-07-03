import React, { useState } from 'react';
import { View } from 'react-native';
import { useColors } from '../context/ThemeContext';

/**
 * GoalBar — a motivational progress bar whose fill color climbs a spectrum as
 * the goal fills: red → orange → green → teal → blue. The fill width tracks
 * progress, and its color reflects how far along you are. The closer to the
 * goal, the "cooler"/more rewarding the color — a small dopamine cue that
 * research on progress feedback (goal-gradient effect) shows keeps people
 * motivated as completion nears.
 *
 * Implemented with plain Views (no SVG) for reliable rendering on-device.
 */

// Spectrum stops (progress 0→1).
const STOPS: { o: number; c: string }[] = [
  { o: 0,    c: '#FF3B30' }, // red    — just starting
  { o: 0.25, c: '#FF9500' }, // orange
  { o: 0.5,  c: '#34C759' }, // green  — halfway
  { o: 0.75, c: '#22C3C9' }, // teal
  { o: 1,    c: '#3B7BFF' }, // blue   — complete
];

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// Color at a given progress point — used for the fill, the % text, and the
// encouragement so they all match.
export function goalBarColor(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  for (let i = 1; i < STOPS.length; i++) {
    if (p <= STOPS[i].o) {
      const a = STOPS[i - 1];
      const b = STOPS[i];
      const t = (p - a.o) / (b.o - a.o || 1);
      const ca = hexToRgb(a.c);
      const cb = hexToRgb(b.c);
      const r = Math.round(ca.r + (cb.r - ca.r) * t);
      const g = Math.round(ca.g + (cb.g - ca.g) * t);
      const bl = Math.round(ca.b + (cb.b - ca.b) * t);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  return STOPS[STOPS.length - 1].c;
}

// Encouraging line that changes as the goal fills.
export function goalMilestone(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  if (p >= 1)    return 'Goal reached! 🎉';
  if (p >= 0.75) return 'Almost there — keep going!';
  if (p >= 0.5)  return 'Over halfway there!';
  if (p >= 0.25) return 'Building momentum';
  if (p > 0)     return 'Off to a good start';
  return "Let's get started";
}

interface Props {
  pct: number;          // 0..1
  id?: string | number; // kept for call-site compatibility
  height?: number;
  ticks?: boolean;      // show 25/50/75 milestone marks
}

export default function GoalBar({ pct, height = 14, ticks = true }: Props) {
  const C = useColors();
  const [w, setW] = useState(0);

  const p = Math.max(0, Math.min(1, pct));
  const r = height / 2;
  const color = goalBarColor(p);
  // Guarantee a rounded nub is visible for tiny (>0) progress.
  const fillW = p <= 0 ? 0 : Math.max(height, w * p);

  return (
    <View
      style={{ height, borderRadius: r, backgroundColor: C.bgElevated, overflow: 'hidden' }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {/* Milestone ticks (covered once the fill passes them) */}
      {ticks && w > 0 &&
        [0.25, 0.5, 0.75].map((t) => (
          <View
            key={t}
            style={{
              position: 'absolute',
              left: w * t - 1,
              top: height * 0.3,
              width: 2,
              height: height * 0.4,
              borderRadius: 1,
              backgroundColor: C.border,
              opacity: 0.8,
            }}
          />
        ))}

      {/* Fill */}
      {w > 0 && fillW > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: fillW,
            borderRadius: r,
            backgroundColor: color,
          }}
        />
      )}
    </View>
  );
}
