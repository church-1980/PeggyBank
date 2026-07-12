import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { formatCurrency, formatDate } from '../utils/helpers';
import { saveAcceptedImage, deleteTempImage } from '../lib/receiptStorage';
import { recognizer, RecognitionResult, DocType } from '../lib/recognition';

/**
 * QuickCaptureScreen — PeggyBank Smart Quick Capture.
 *
 * Capture → preview → "Reading your document…" (ML Kit on-device OCR) → a
 * confidence-aware REVIEW where the user confirms/corrects the suggested type
 * and sees the extracted fields, then continues into the prefilled Add
 * Expense / Add Bill form to review every field and save. Nothing is saved
 * silently and no field is fabricated — unknown fields show "Please review".
 * If OCR fails, the manual fallback (choose Expense/Bill) is preserved.
 */

type Stage = 'camera' | 'preview' | 'reading' | 'review';

export default function QuickCaptureScreen({ navigation }: any) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(C);

  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [stage, setStage] = useState<Stage>('camera');
  const [tempUri, setTempUri] = useState<string | null>(null);   // capture in cache
  const [ownedUri, setOwnedUri] = useState<string | null>(null); // persisted copy
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [chosenType, setChosenType] = useState<DocType>('unknown');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [facing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  if (!permission) return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={44} color={C.primary} />
        <Text style={[Typography.cardTitle, { color: C.textPrimary, marginTop: Spacing.md, textAlign: 'center' }]}>Camera access needed</Text>
        <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: Spacing.lg }]}>
          PeggyBank uses the camera to photograph receipts and bills. Images stay on your device.
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={requestPermission}>
          <Text style={{ color: C.textOnPrimary, fontWeight: '700' }}>{permission.canAskAgain ? 'Allow camera' : 'Retry'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 14 }} onPress={close}><Text style={{ color: C.textSecondary, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
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
    } catch { Alert.alert('Could not take photo', 'Please try again.'); }
    finally { setBusy(false); }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Gallery access needed', 'Please allow photo access.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets[0]?.uri) { setTempUri(r.assets[0].uri); setStage('preview'); }
  };

  const retake = async () => {
    await deleteTempImage(tempUri);
    setTempUri(null); setOwnedUri(null); setResult(null);
    setStage('camera');
  };

  // Use Photo → persist → read on-device → review
  const usePhoto = async () => {
    if (!tempUri) return;
    setStage('reading');
    try {
      const owned = await saveAcceptedImage(tempUri);
      await deleteTempImage(tempUri);
      setOwnedUri(owned);
      const r = await recognizer.recognize(owned);
      setResult(r);
      setChosenType(r.ok && r.docType !== 'unknown' ? r.docType : 'unknown');
      setStage('review');
    } catch {
      Alert.alert('Could not process image', 'Please try again.');
      setStage('preview');
    }
  };

  // Continue → prefilled form (or manual = photo only)
  const goToForm = (type: DocType, prefill: boolean) => {
    if (!ownedUri || type === 'unknown') return;
    const r = prefill ? result : null;
    if (type === 'expense') {
      navigation.replace('AddExpense', {
        capturedPhoto: ownedUri,
        amount: r?.amount,
        category: r?.category,
        note: r?.merchant,
      });
    } else {
      const dueDay = r?.dueDate ? parseInt(r.dueDate.split('-')[2], 10) : undefined;
      navigation.replace('Bills', {
        autoOpen: true,
        capturedPhoto: ownedUri,
        billName: r?.merchant,
        billAmount: r?.amount,
        billDueDay: dueDay,
      });
    }
  };

  // ── Camera stage ───────────────────────────────────────────────────
  if (stage === 'camera') {
    return (
      <View style={[styles.fill, { backgroundColor: '#000' }]}>
        <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
        <View style={[styles.topRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.roundBtn} onPress={close} accessibilityLabel="Cancel"><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={() => setFlash(flash === 'off' ? 'on' : 'off')} accessibilityLabel="Toggle flash"><Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={22} color="#fff" /></TouchableOpacity>
        </View>
        <Text style={[styles.hint, { top: insets.top + 64 }]}>Photograph a receipt or bill</Text>
        <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery} accessibilityLabel="Import from gallery"><Ionicons name="images-outline" size={26} color="#fff" /><Text style={styles.sideLabel}>Gallery</Text></TouchableOpacity>
          <TouchableOpacity style={styles.shutter} onPress={takePhoto} accessibilityLabel="Take photo"><View style={styles.shutterInner} /></TouchableOpacity>
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
          <TouchableOpacity style={styles.previewBtn} onPress={retake}><Ionicons name="refresh" size={20} color="#fff" /><Text style={styles.previewBtnText}>Retake</Text></TouchableOpacity>
          <TouchableOpacity style={styles.previewBtn} onPress={close}><Ionicons name="close" size={20} color="#fff" /><Text style={styles.previewBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.previewBtn, styles.useBtn, { backgroundColor: C.primary }]} onPress={usePhoto}><Ionicons name="checkmark" size={20} color="#fff" /><Text style={styles.previewBtnText}>Use Photo</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Reading stage ──────────────────────────────────────────────────
  if (stage === 'reading') {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: C.bg }]}>
        {ownedUri ? <Image source={{ uri: ownedUri }} style={styles.readingThumb} resizeMode="cover" /> : null}
        <ActivityIndicator color={C.primary} style={{ marginTop: Spacing.lg }} />
        <Text style={[Typography.cardTitle, { color: C.textPrimary, marginTop: Spacing.md }]}>Reading your document…</Text>
        <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 4 }]}>On your device — nothing is uploaded.</Text>
      </View>
    );
  }

  // ── Review stage ───────────────────────────────────────────────────
  const ok = !!result?.ok;
  const summary = buildSummary(result, chosenType);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      {ownedUri ? <Image source={{ uri: ownedUri }} style={styles.reviewImage} resizeMode="cover" /> : null}

      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        {!ok && (
          <View style={[styles.noticeCard, { backgroundColor: C.warning + '18' }]}>
            <Ionicons name="alert-circle-outline" size={18} color={C.warning} />
            <Text style={[Typography.helper, { color: C.textPrimary, flex: 1 }]}>
              We couldn't read this document automatically. Your photo is saved — choose where it belongs and enter the details.
            </Text>
          </View>
        )}

        {ok && <Text style={[Typography.cardTitle, { color: C.textPrimary }]}>{summary}</Text>}

        {/* Type choice */}
        <Text style={styles.sectionLabel}>THIS IS A</Text>
        <View style={styles.typeRow}>
          <TypeChip C={C} label="Expense" icon="arrow-up-circle" active={chosenType === 'expense'} onPress={() => setChosenType('expense')} />
          <TypeChip C={C} label="Bill" icon="receipt" active={chosenType === 'bill'} onPress={() => setChosenType('bill')} />
        </View>
        {chosenType === 'unknown' && <Text style={[Typography.helper, { color: C.warning, marginTop: 6 }]}>Please choose one.</Text>}

        {/* Detected fields (honest confidence) */}
        <Text style={styles.sectionLabel}>DETECTED</Text>
        <View style={styles.card}>
          <Field C={C} label={chosenType === 'bill' ? 'Payee' : 'Merchant'} value={result?.merchant} conf={result?.confidence.merchant} />
          <Divider C={C} />
          <Field C={C} label="Amount" value={result?.amount != null ? formatCurrency(result.amount) : undefined} conf={result?.confidence.amount} />
          <Divider C={C} />
          <Field C={C} label="Date" value={result?.date ? formatDate(result.date) : undefined} conf={result?.confidence.date} />
          {chosenType === 'bill' && (<><Divider C={C} /><Field C={C} label="Due date" value={result?.dueDate ? formatDate(result.dueDate) : undefined} conf={result?.confidence.dueDate} /></>)}
          <Divider C={C} />
          <Field C={C} label="Category" value={result?.category} conf={result?.confidence.category} />
        </View>

        <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 10 }]}>
          You'll review and correct every field on the next screen before saving.
        </Text>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: chosenType === 'unknown' ? C.primary + '55' : C.primary }]}
          disabled={chosenType === 'unknown'}
          onPress={() => goToForm(chosenType, ok)}
        >
          <Text style={{ color: C.textOnPrimary, fontWeight: '700' }}>Continue</Text>
        </TouchableOpacity>

        <View style={styles.reviewActions}>
          <TouchableOpacity onPress={retake}><Text style={styles.reviewAction}>Retake</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => chosenType !== 'unknown' && goToForm(chosenType, false)}><Text style={[styles.reviewAction, { color: chosenType === 'unknown' ? C.textHint : C.primary }]}>Enter manually</Text></TouchableOpacity>
          <TouchableOpacity onPress={close}><Text style={styles.reviewAction}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function buildSummary(r: RecognitionResult | null, type: DocType): string {
  if (!r || !r.ok) return '';
  const who = r.merchant ?? (type === 'bill' ? 'This document' : 'This receipt');
  const amt = r.amount != null ? ` for ${formatCurrency(r.amount)}` : '';
  if (type === 'bill') {
    const due = r.dueDate ? ` due ${formatDate(r.dueDate)}` : '';
    return `${who} looks like a bill${amt}${due}. Review and add it to Bills?`;
  }
  return `${who}${amt} looks like an expense. Review and add it to Spending?`;
}

function TypeChip({ C, label, icon, active, onPress }: { C: ColorPalette; label: string; icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.md, backgroundColor: active ? C.primary + '18' : C.bgCard, borderWidth: 1, borderColor: active ? C.primary : C.border }}>
      <Ionicons name={icon} size={20} color={active ? C.primary : C.textSecondary} />
      <Text style={[Typography.cardTitle, { color: active ? C.primary : C.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ C, label, value, conf }: { C: ColorPalette; label: string; value?: string; conf?: 'high' | 'low' | 'none' }) {
  const review = !value || conf === 'none';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
      <Text style={[Typography.helper, { color: C.textSecondary, width: 90 }]}>{label}</Text>
      <Text style={[Typography.body, { color: review ? C.warning : C.textPrimary, flex: 1, fontWeight: review ? '600' : '400' }]} numberOfLines={1}>
        {value ?? 'Please review'}
      </Text>
      {conf === 'low' && !review ? <Text style={[Typography.caption, { color: C.warning }]}>check</Text> : null}
    </View>
  );
}
function Divider({ C }: { C: ColorPalette }) { return <View style={{ height: 1, backgroundColor: C.borderLight }} />; }

function makeStyles(C: ColorPalette) {
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

    readingThumb: { width: 120, height: 150, borderRadius: Radius.md },
    reviewImage: { width: '100%', height: 180 },
    noticeCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: Radius.md, padding: 12, marginBottom: Spacing.md },
    sectionLabel: { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Spacing.lg, marginBottom: Spacing.sm },
    typeRow: { flexDirection: 'row', gap: 10 },
    card: { backgroundColor: C.bgCard, borderRadius: Radius.lg, paddingHorizontal: Spacing.md },
    continueBtn: { height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
    reviewActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.md },
    reviewAction: { ...Typography.helper, color: C.textSecondary, fontWeight: '600' },
  });
}
