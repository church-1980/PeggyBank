import React from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyScreen — Design Bible §1 (Background) + §20 (Whitespace).
 *
 * Every screen sits on the warm off-white background, never pure white, with
 * consistent horizontal padding and vertical rhythm. Do not set a background
 * color on a screen anywhere else.
 */

interface Props {
  children: React.ReactNode;
  scroll?: boolean;             // default true
  padded?: boolean;             // horizontal screen padding (default true)
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl']; // pull-to-refresh (scroll mode only)
  // Form screens need this: without it, the first tap on a button while the
  // keyboard is open only dismisses the keyboard, and the button never fires.
  keyboardShouldPersistTaps?: React.ComponentProps<typeof ScrollView>['keyboardShouldPersistTaps'];
  testID?: string;
}

export default function PeggyScreen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
  refreshControl,
  keyboardShouldPersistTaps,
  testID,
}: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();

  const inner: StyleProp<ViewStyle> = [
    padded && { paddingHorizontal: Spacing.lg - 4 }, // ~20
    { paddingBottom: insets.bottom + Spacing.lg },
    contentStyle,
  ];

  if (!scroll) {
    return (
      <View testID={testID} style={[styles.fill, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <View style={inner}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={[styles.fill, { backgroundColor: C.bg }]}
      contentContainerStyle={[{ paddingTop: insets.top }, inner]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
