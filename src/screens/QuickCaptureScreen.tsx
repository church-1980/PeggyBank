import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { Spacing, Radius, Typography } from '../theme';
import { saveAcceptedImage, deleteTempImage } from '../lib/receiptStorage';

/**
 * QuickCaptureScreen — PeggyBank Smart Quick Capture (foundation).
 *
 * Phase B2: real capture → preview → retake/use/cancel → store image →
 * TEMPORARY ManualRecognizer (no OCR yet): user chooses Expense or Bill, the
 * image routes into the existing form. In Phase C, ML Kit reads the document
 * and pre-fills fields; the manual choice becomes the low-confidence fallback.
 *
 * This build does NOT auto-read documents — the UI says so explicitly and never
 * fabricates merchant/amount/date/category/type.
 */

type Stage = 'camera' | 'preview' | 'choose';

export default function QuickCaptureScreen({ navigation }: any) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(C);

  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [stage, setStage] = useState<Stage>('camera');
  const [tempUri, setTempUri] = useState<string | null>(null); // capture in cache
  const [flash, setFlash] = useState<FlashMode>('off');
  const [facing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  // ── Permission states ──────────────────────────────────────────────
  if (!permission) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={44} color={C.primary} />
        <Text style={[Typography.cardTitle, { color: C.textPrimary, marginTop: Spacing.md, textAlign: 'center' }]}>
          Camera access needed
        </Text>
        <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: Spacing.lg }]}>
          PeggyBank uses the camera to photograph receipts and bills so you can turn them into expenses and bills. Images stay on your device.
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={requestPermission}>
          <Text style={{ color: C.textOnPrimary, fontWeight: '700' }}>
            {permission.canAskAgain ? 'Allow camera' : 'Retry'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 14 }} onPress={close}>
          <Text style={{ color: C.textSecondary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Actions ────────────────────────────────────────────────────────
  const takePhoto = async () => {
    if (!camRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) { setTempUri(photo.uri); setStage('preview'); }
    } catch {
      Alert.alert('Could not take photo', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Gallery access needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]?.uri) {
      setTempUri(result.assets[0].uri);
      setStage('preview');
    }
  };

  const retake = async () => {
    await deleteTempImage(tempUri); // discard the rejected capture
    setTempUri(null);
    setStage('camera');
  };

  const usePhoto = () => setStage('choose');

  const route = async (dest: 'AddExpense' | 'Bills') => {
    if (!tempUri) return;
    setBusy(true);
    try {
      // Persist into owned storage now; the form saves this URI onto the record.
      const owned = await saveAcceptedImage(tempUri);
      await deleteTempImage(tempUri); // remove the cache copy
      // Replace this capture flow with the destination form.
      if (dest === 'AddExpense') {
        navigation.replace('AddExpense', { capturedPhoto: owned });
      } else {
        navigation.replace('Bills', { autoOpen: true, capturedPhoto: owned });
      }
    } catch {
      Alert.alert('Could not save image', 'Please try again.');
      setBusy(false);
    }
  };

  // ── Camera stage ───────────────────────────────────────────────────
  if (stage === 'camera') {
    return (
      <View style={[styles.fill, { backgroundColor: '#000' }]}>
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />

        {/* Top controls */}
        <View style={[styles.topRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.roundBtn} onPress={close} accessibilityLabel="Cancel">
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.roundBtn}
            onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
            accessibilityLabel="Toggle flash"
          >
            <Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, { top: insets.top + 64 }]}>Photograph a receipt or bill</Text>

        {/* Bottom controls */}
        <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery} accessibilityLabel="Import from gallery">
            <Ionicons name="images-outline" size={26} color="#fff" />
            <Text style={styles.sideLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shutter} onPress={takePhoto} accessibilityLabel="Take photo">
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <View style={styles.sideBtn} />
        </View>
      </View>
    );
  }

  // ── Preview stage ──────────────────────────────────────────────────
  if (stage === 'preview' && tempUri) {
    return (
      <View style={[styles.fill, { backgroundColor: '#000' }]}>
        <Image source={{ uri: tempUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + 20, paddingTop: 16 }]}>
          <TouchableOpacity style={styles.previewBtn} onPress={retake}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.previewBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewBtn} onPress={close}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={styles.previewBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.previewBtn, styles.useBtn, { backgroundColor: C.primary }]} onPress={usePhoto}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.previewBtnText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Choose stage (temporary ManualRecognizer) ──────────────────────
  return (
    <View style={[styles.fill, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      {tempUri ? <Image source={{ uri: tempUri }} style={styles.chooseThumb} resizeMode="cover" /> : null}

      <View style={{ paddingHorizontal: Spacing.lg }}>
        <View style={[styles.noticeCard, { backgroundColor: C.warning + '18' }]}>
          <Ionicons name="information-circle-outline" size={18} color={C.warning} />
          <Text style={[Typography.helper, { color: C.textPrimary, flex: 1 }]}>
            Automatic document reading is not active in this build. You'll enter the details yourself.
          </Text>
        </View>

        <Text style={[Typography.cardTitle, { color: C.textPrimary, marginTop: Spacing.lg }]}>
          What would you like to create?
        </Text>

        <TouchableOpacity style={[styles.choiceBtn, { borderColor: C.border }]} onPress={() => route('AddExpense')} disabled={busy}>
          <Ionicons name="arrow-up-circle-outline" size={24} color={C.spending} />
          <Text style={[Typography.cardTitle, { color: C.textPrimary }]}>Expense</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textHint} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.choiceBtn, { borderColor: C.border }]} onPress={() => route('Bills')} disabled={busy}>
          <Ionicons name="receipt-outline" size={24} color={C.bills} />
          <Text style={[Typography.cardTitle, { color: C.textPrimary }]}>Bill</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textHint} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: Spacing.lg, alignSelf: 'center' }} onPress={close} disabled={busy}>
          <Text style={{ color: C.textSecondary, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    fill: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    primaryBtn: { marginTop: Spacing.lg, borderRadius: Radius.md, paddingHorizontal: 28, paddingVertical: 14 },

    topRow: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
    roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    hint: { position: 'absolute', alignSelf: 'center', color: '#fff', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },

    bottomRow: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36 },
    sideBtn: { width: 56, alignItems: 'center' },
    sideLabel: { color: '#fff', fontSize: 11, marginTop: 3 },
    shutter: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
    shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

    previewBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.55)' },
    previewBtn: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.md },
    useBtn: { flexDirection: 'row', gap: 6 },
    previewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 2 },

    chooseThumb: { width: '100%', height: 200 },
    noticeCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: Radius.md, padding: 12, marginTop: Spacing.lg },
    choiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: Radius.md, padding: 16, marginTop: 12 },
  });
}
