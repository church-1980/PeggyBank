import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleProp, ViewStyle } from 'react-native';
import { Radius } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyProgressBar — Design Bible §5 (Progress Bars) + §19 (Animation).
 *
 * Rounded track, rounded colored fill, animates on load so progress "feels
 * alive". The bar's color encodes progress.
 *
 * RULES:
 *  - The percentage is rendered OUTSIDE the bar by the caller. Never inside.
 *  - No artwork of any kind may live inside a bar.
 *  - Animate to show progress, gently and briefly. Nothing bounces.
 */

interface Props {
  pct: number;                  // 0..1
  color?: string;               // fill color (encodes progress); defaults to primary
  height?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyProgressBar({
  pct,
  color,
  height = 8,
  trackColor,
  style,
  testID,
}: Props) {
  const C = useColors();
  const [w, setW] = useState(0);
  const p = Math.max(0, Math.min(1, pct));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: p,
      duration: 650,
      useNativeDriver: false, // width animation
    }).start();
  }, [p, anim]);

  const fillWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, w)],
  });

  return (
    <View
      testID={testID}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        {
          height,
          borderRadius: Radius.full,
          backgroundColor: trackColor ?? C.surfaceMuted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {w > 0 && (
        <Animated.View
          style={{
            height,
            width: fillWidth,
            borderRadius: Radius.full,
            backgroundColor: color ?? C.primary,
          }}
        />
      )}
    </View>
  );
}
