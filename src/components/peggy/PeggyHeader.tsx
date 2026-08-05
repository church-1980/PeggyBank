import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography, HeaderHeight } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyBackButton from './PeggyBackButton';

/**
 * PeggyHeader — the ONE screen header. Three variants, identical spacing so
 * every screen's top reads the same:
 *   - `standard`  : [back?]  Title            [right?]
 *   - `large`     : [back?]                   [right?]   /   Big Title + subtitle
 *   - `dashboard` : avatar   Greeting/sub     [right?]
 *
 * Titles are left-aligned (modern), never centered. Screens pass content and
 * an optional right action; they never build their own header row.
 */

type Variant = 'standard' | 'large' | 'dashboard';

interface Props {
  variant?: Variant;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  avatar?: React.ReactNode;      // dashboard variant (a <PeggyAvatar/>)
  right?: React.ReactNode;       // right-side action(s)
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyHeader({
  variant = 'standard', title, subtitle, onBack, avatar, right, style, testID,
}: Props) {
  const C = useColors();

  if (variant === 'large') {
    return (
      <View testID={testID} style={[{ paddingTop: Spacing.sm }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
          {onBack ? <PeggyBackButton onPress={onBack} /> : <View style={{ width: 40 }} />}
          {right ?? <View style={{ width: 40 }} />}
        </View>
        {title ? <Text style={[Typography.h1, { color: C.textPrimary, marginTop: Spacing.sm }]}>{title}</Text> : null}
        {subtitle ? <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
    );
  }

  if (variant === 'dashboard') {
    return (
      <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center', minHeight: HeaderHeight.dashboard }, style]}>
        {avatar}
        <View style={{ flex: 1, marginLeft: Spacing.sm + 4 }}>
          {title ? <Text style={[Typography.greeting, { color: C.textPrimary }]} numberOfLines={1}>{title}</Text> : null}
          {subtitle ? <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 1 }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    );
  }

  // standard
  return (
    <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center', minHeight: HeaderHeight.standard }, style]}>
      {onBack ? <PeggyBackButton onPress={onBack} /> : null}
      <Text style={[Typography.h3, { color: C.textPrimary, flex: 1, marginLeft: onBack ? Spacing.sm : 0 }]} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
