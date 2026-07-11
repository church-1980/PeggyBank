import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { useColors } from '../context/ThemeContext';
import { Spacing, Radius, Typography } from '../theme';

/**
 * OCR COMPATIBILITY SPIKE — throwaway.
 *
 * Smallest possible path to prove @react-native-ml-kit/text-recognition builds
 * and runs on-device under Expo SDK 55 + New Architecture:
 *   pick/capture an image → TextRecognition.recognize(uri) → show the text.
 *
 * This is NOT the Smart Camera feature. It exists only to validate the native
 * module before Phase B2/C. Delete after the spike is signed off.
 */
export default function OcrSpikeScreen() {
  const C = useColors();
  const [uri, setUri] = useState<string | null>(null);
  const [text, setText] = useState<string>('');
  const [blocks, setBlocks] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');

  const run = async (fromCamera: boolean) => {
    setError(''); setText(''); setBlocks(null); setUri(null);
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setError('Permission denied'); return; }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      setUri(imageUri);
      setBusy(true);

      const recognized = await TextRecognition.recognize(imageUri);
      setText(recognized.text || '(no text found)');
      setBlocks(recognized.blocks?.length ?? 0);
    } catch (e: any) {
      setError(`${e?.name ?? 'Error'}: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: Spacing.lg }}>
      <Text style={[Typography.h2, { color: C.textPrimary, marginTop: 40 }]}>OCR Spike</Text>
      <Text style={[Typography.helper, { color: C.textSecondary, marginBottom: Spacing.lg }]}>
        Proves ML Kit text recognition builds + runs on this device. Throwaway.
      </Text>

      <TouchableOpacity
        onPress={() => run(true)}
        style={{ backgroundColor: C.primary, borderRadius: Radius.md, padding: 16, marginBottom: 10 }}
      >
        <Text style={{ color: C.textOnPrimary, fontWeight: '700', textAlign: 'center' }}>Take photo & read text</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => run(false)}
        style={{ backgroundColor: C.surfaceMuted, borderRadius: Radius.md, padding: 16, marginBottom: Spacing.lg }}
      >
        <Text style={{ color: C.textPrimary, fontWeight: '700', textAlign: 'center' }}>Pick from gallery & read text</Text>
      </TouchableOpacity>

      {uri ? <Image source={{ uri }} style={{ width: '100%', height: 200, borderRadius: Radius.md, marginBottom: Spacing.md }} resizeMode="contain" /> : null}
      {busy ? <ActivityIndicator color={C.primary} /> : null}

      {error ? (
        <Text style={{ color: C.danger, marginTop: 12 }}>{error}</Text>
      ) : null}

      {blocks !== null ? (
        <Text style={[Typography.helper, { color: C.success, marginTop: 12 }]}>
          ✓ Recognition returned — {blocks} block(s)
        </Text>
      ) : null}

      {text ? (
        <View style={{ backgroundColor: C.bgCard, borderRadius: Radius.md, padding: 14, marginTop: 12 }}>
          <Text style={{ color: C.textPrimary, fontFamily: 'monospace' as any }}>{text}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
