import React from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius } from '../../theme';

/**
 * PeggyCameraCapture — the ONE camera capture shell. The screen supplies the
 * live viewport as `children` (e.g. an expo-camera CameraView) and the handlers;
 * this component owns the framing and the shutter / flash / flip controls so the
 * capture experience is identical everywhere. (control glyphs are affordances.)
 */
interface Props {
  children?: React.ReactNode;    // the live camera viewport
  onCapture: () => void;
  onFlip?: () => void;
  onFlash?: () => void;
  flashOn?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyCameraCapture({ children, onCapture, onFlip, onFlash, flashOn = false, style, testID }: Props) {
  return (
    <View testID={testID} style={[{ flex: 1, backgroundColor: '#000', borderRadius: Radius.hero, overflow: 'hidden' }, style]}>
      <View style={{ flex: 1 }}>{children}</View>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 24 }}>
        <TouchableOpacity onPress={onFlash} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Toggle flash">
          <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onCapture} activeOpacity={0.8} accessibilityLabel="Take photo" style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onFlip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Flip camera">
          <Ionicons name="camera-reverse-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
