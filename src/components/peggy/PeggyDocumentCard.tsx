import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography, Radius } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyIconFrame from './PeggyIconFrame';
import PeggyChip from './PeggyChip';
import { IconKey } from '../../data/iconRegistry';

/**
 * PeggyDocumentCard — the ONE captured-document / OCR-result card (a scanned
 * receipt or bill with its extracted fields). Thumbnail (photo or icon frame) +
 * title + subtitle + optional amount + status chip.
 */
interface Props {
  title: string;
  subtitle?: string;
  amount?: string;
  thumbUri?: string;             // captured image; falls back to an icon frame
  iconKey?: IconKey;
  statusLabel?: string;
  statusTone?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyDocumentCard({
  title, subtitle, amount, thumbUri, iconKey = 'other', statusLabel, statusTone, onPress, style, testID,
}: Props) {
  const C = useColors();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: C.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, padding: Spacing.md },
        style,
      ]}
    >
      {thumbUri ? (
        <Image source={{ uri: thumbUri }} style={{ width: 52, height: 52, borderRadius: Radius.md }} />
      ) : (
        <PeggyIconFrame iconKey={iconKey} size="card" shape="tile" />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[Typography.cardTitle, { color: C.textPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 1 }]} numberOfLines={1}>{subtitle}</Text> : null}
        {statusLabel ? <View style={{ marginTop: 6 }}><PeggyChip label={statusLabel} color={statusTone ?? C.primary} /></View> : null}
      </View>
      {amount ? <Text style={[Typography.amountRow, { color: C.textPrimary }]}>{amount}</Text> : null}
    </TouchableOpacity>
  );
}
