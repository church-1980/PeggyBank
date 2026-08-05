import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PeggyIconButton from './PeggyIconButton';

/**
 * PeggyBackButton — the ONE back affordance. Same glyph, size, and hit area on
 * every screen. Wraps PeggyIconButton so there is a single implementation.
 */
interface Props {
  onPress: () => void;
  tone?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyBackButton({ onPress, tone, style, testID }: Props) {
  return (
    <PeggyIconButton
      icon="chevron-back"
      onPress={onPress}
      variant="soft"
      tone={tone}
      accessibilityLabel="Go back"
      style={style}
      testID={testID}
    />
  );
}
