import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius, Shadow } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyHeroCard — Design Bible §3 (Hero Card).
 *
 * The ONE dominant element on a screen, carrying that screen's most important
 * number. Purple gradient, largest type, only gradient on the screen.
 *
 * RULE: A screen may have at most one hero. Nothing else may use a gradient or
 * exceed the hero's type size. If a screen has no single most-important number,
 * it has no hero.
 */

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyHeroCard({ children, style, testID }: Props) {
  const C = useColors();

  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius: Radius.hero,
          shadowColor: Shadow.hero.shadowColor,
          shadowOffset: Shadow.hero.shadowOffset,
          shadowOpacity: Shadow.hero.shadowOpacity,
          shadowRadius: Shadow.hero.shadowRadius,
          elevation: Shadow.hero.elevation,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[C.heroFrom, C.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: Radius.hero, padding: Spacing.md + 4, overflow: 'hidden' }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}
