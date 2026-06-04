import React, { useEffect, useMemo, useRef } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface UndoToastProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export default function UndoToast({ visible, message, onUndo, onDismiss, durationMs = 4000 }: UndoToastProps) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(onDismiss);
      }, durationMs);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { bottom: insets.bottom + 90, opacity }]}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        onPress={() => {
          if (timer.current) clearTimeout(timer.current);
          onUndo();
          onDismiss();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.undoBtn}>Undo</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    toast: {
      position: 'absolute', left: Spacing.md, right: Spacing.md,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.bgElevated,
      borderRadius: Radius.lg,
      paddingVertical: 14, paddingHorizontal: Spacing.md,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
    message: { ...Typography.small, color: '#FFFFFF', flex: 1 },
    undoBtn: { ...Typography.smallBold, color: C.primary, marginLeft: Spacing.md, fontSize: 15 },
  });
}
