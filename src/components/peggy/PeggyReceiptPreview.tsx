import React from 'react';
import { View, Text, Image, StyleProp, ViewStyle } from 'react-native';
import { Radius, Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyLoadingState from './PeggyLoadingState';

/**
 * PeggyReceiptPreview — the ONE captured-image preview used by the camera flow.
 * Shows the shot; when `state="scanning"` it dims and reuses PeggyLoadingState
 * inside a light card so the loading treatment stays consistent.
 */
interface Props {
  uri: string;
  state?: 'scanning' | 'ready';
  caption?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyReceiptPreview({ uri, state = 'ready', caption, style, testID }: Props) {
  const C = useColors();
  return (
    <View testID={testID} style={[{ borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: C.surfaceMuted }, style]}>
      <Image source={{ uri }} style={{ width: '100%', height: 280, resizeMode: 'cover' }} />
      {state === 'scanning' ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,16,40,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: C.bgCard, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg }}>
            <PeggyLoadingState message="Reading your document…" />
          </View>
        </View>
      ) : null}
      {caption ? <Text style={[Typography.helper, { color: C.textSecondary, padding: Spacing.sm, textAlign: 'center' }]}>{caption}</Text> : null}
    </View>
  );
}
