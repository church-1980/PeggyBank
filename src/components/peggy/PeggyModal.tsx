import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyModal — the ONE bottom-sheet. A dimmed backdrop, a rounded sheet with a
 * grab handle, and safe-area-aware bottom padding. Every modal in the app is
 * this sheet; screens supply the content.
 */
interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
}

export default function PeggyModal({ visible, onClose, title, children, testID }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,16,40,0.45)' }} onPress={onClose} />
      <View
        testID={testID}
        style={{
          backgroundColor: C.bgElevated,
          borderTopLeftRadius: Radius.xl,
          borderTopRightRadius: Radius.xl,
          paddingTop: Spacing.sm,
          paddingHorizontal: Spacing.lg - 4,
          paddingBottom: insets.bottom + Spacing.lg,
        }}
      >
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: Spacing.md }} />
        {title ? <Text style={[Typography.h3, { color: C.textPrimary, marginBottom: Spacing.md }]}>{title}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}
