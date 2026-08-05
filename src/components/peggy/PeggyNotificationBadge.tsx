import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyNotificationBadge — the ONE count/dot badge for overlaying an icon
 * (bell, tab, avatar). Position it with `style` (absolute) from the parent.
 */
interface Props {
  count?: number;         // omit or 0 → nothing (unless `dot`)
  dot?: boolean;          // show a plain dot instead of a number
  tone?: string;          // default danger
  size?: number;          // pill/dot height (default 18)
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyNotificationBadge({ count, dot = false, tone, size = 18, style, testID }: Props) {
  const C = useColors();
  const bg = tone ?? C.danger;

  if (dot) {
    const d = size * 0.55;
    return <View testID={testID} style={[{ width: d, height: d, borderRadius: d / 2, backgroundColor: bg, borderWidth: 2, borderColor: C.bg }, style]} />;
  }
  if (!count || count <= 0) return null;
  return (
    <View testID={testID} style={[{ minWidth: size, height: size, borderRadius: size / 2, paddingHorizontal: 5, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg }, style]}>
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.6, fontWeight: '800' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}
