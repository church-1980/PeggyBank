import React from 'react';
import { View, ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyPage — THE page shell. Owns safe-area, the warm background, horizontal
 * page margins, scroll behavior, and bottom-nav clearance. A `header` sits
 * fixed above the scroll body; a `footer` (bottom nav / sticky action) sits
 * fixed below it. Screens supply content + config, never their own SafeAreaView,
 * background color, or page padding.
 */

interface Props {
  header?: React.ReactNode;
  footer?: React.ReactNode;                  // e.g. <PeggyBottomNav/> or a sticky save bar
  children: React.ReactNode;
  scroll?: boolean;                          // default true
  padded?: boolean;                          // horizontal page padding (default true)
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyPage({
  header, footer, children, scroll = true, padded = true, refreshControl, contentStyle, testID,
}: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const padH = padded ? Spacing.lg - 4 : 0; // ~20

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingHorizontal: padH, paddingBottom: Spacing.lg }, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: padH }, contentStyle]}>{children}</View>
  );

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {header ? <View style={{ paddingHorizontal: padH }}>{header}</View> : null}
      {body}
      {footer ? <View style={{ paddingBottom: insets.bottom }}>{footer}</View> : null}
    </View>
  );
}
