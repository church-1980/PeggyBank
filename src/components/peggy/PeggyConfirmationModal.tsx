import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Spacing, Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyModal from './PeggyModal';

/**
 * PeggyConfirmationModal — the ONE confirm dialog, built on PeggyModal. Handles
 * the normal case and the destructive case (red confirm) with a single layout.
 */
interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PeggyConfirmationModal({
  visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, onConfirm, onCancel,
}: Props) {
  const C = useColors();
  const confirmColor = destructive ? C.danger : C.primary;
  return (
    <PeggyModal visible={visible} onClose={onCancel} title={title}>
      {message ? (
        <Text style={[Typography.body, { color: C.textSecondary, marginBottom: Spacing.lg }]}>{message}</Text>
      ) : null}
      <View style={{ gap: Spacing.sm }}>
        <TouchableOpacity
          onPress={onConfirm}
          activeOpacity={0.88}
          style={{ height: 52, borderRadius: Radius.md, backgroundColor: confirmColor, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={[Typography.cardTitle, { color: '#FFFFFF' }]}>{confirmLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} activeOpacity={0.7} style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[Typography.cardTitle, { color: C.textSecondary }]}>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
    </PeggyModal>
  );
}
