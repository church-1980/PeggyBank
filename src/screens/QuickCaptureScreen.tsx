// PEGGY-SHELL-EXEMPT: the camera viewfinder fills the screen edge to edge.
// CameraView is positioned with StyleSheet.absoluteFill and the controls float
// over it, so a padded, scrolling shell would letterbox the live preview.
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import PeggyDateField from '../components/peggy/PeggyDateField';
import { localDateString } from '../core/datetime';
import { CameraView, useCameraPermissions, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { formatCurrency, formatDate } from '../utils/helpers';
import { saveAcceptedImage, deleteTempImage } from '../lib/receiptStorage';
import { recognizer, RecognitionResult, DocType } from '../lib/recognition';
import { recallMerchant, MerchantMemory } from '../lib/merchantMemory';
import { Category } from '../types';
import { resolveReview, formParams, Corrections } from '../lib/recognition/review';
import { CATEGORIES } from '../data/categories';
import PeggyPushButton from '../components/peggy/PeggyPushButton';
import PeggyCard from '../components/peggy/PeggyCard';
import { PeggyChip, PeggyInput, PeggyCurrencyInput } from '../components/peggy';

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

/**
 * The question the app asks before filing anything: plain language, naming
 * the category and the amount it believes it read.
 */
function confirmQuestion(type: DocType, category?: string, amount?: number): string | null {
  if (type === 'unknown' || amount == null) return null;
  const money = formatCurrency(amount);
  if (type === 'bill') return 'Add ' + money + ' as a bill?';
  const label = category ? (CATEGORIES as any)[category]?.label ?? category : null;
  return label ? 'Put ' + money + ' in your ' + label + ' expenses?' : 'Add ' + money + ' as an expense?';
}


/**
 * Plain-language summary of what the app already knows about this vendor,
 * shown on the review screen so a prefill never looks like magic.
 */
function knownSummary(m: MerchantMemory): string {
  const times = m.timesSeen === 1 ? "once" : m.timesSeen + " times";
  let out = "You have saved " + m.displayName + " " + times + " before";
  if (m.avgAmount) out += ", usually $" + m.avgAmount.toFixed(2);
  if (m.docType === "bill" && m.dueDay) out += ", due on day " + m.dueDay;
  return out + ". Filled in from your history.";
}

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
  const [known, setKnown] = useState<MerchantMemory | null>(null);

  /**
   * What the person has confirmed or corrected on THIS screen.
   *
   * Smart Capture used to be read-only: it showed what it had read, and any
   * correction meant leaving for a different screen and rebuilding the
   * transaction there. At that point photographing the receipt saved nobody
   * anything. A review screen has to be a place you can review.
   */
  const [edits, setEdits] = useState<Corrections>({});
  const [editing, setEditing] = useState<null | 'merchant' | 'amount' | 'date' | 'category'>(null);
  const [draft, setDraft] = useState('');

  // What the screen currently believes. One resolution, shared by the fields,
  // the headline, the question and the form, so they cannot disagree.
  const review = resolveReview(result, known, edits);
  const { merchant: merchantValue, amount: amountValue, date: dateValue, category: categoryValue } = review;
  const confOf = (key: 'merchant' | 'amount' | 'date' | 'category') => review.confidence[key];

  const commitDraft = () => {
    if (editing === 'merchant') {
      const v = draft.trim();
      setEdits(e => ({ ...e, merchant: v || undefined }));
    } else if (editing === 'amount') {
      const v = parseFloat(draft.replace(',', '.').replace(/[^0-9.]/g, ''));
      setEdits(e => ({ ...e, amount: Number.isFinite(v) && v > 0 ? v : undefined }));
    }
    setEditing(null);
    setDraft('');
  };
  const [questionDismissed, setQuestionDismissed] = useState(false);
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
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 });
    if (!r.canceled && r.assets[0]?.uri) { setTempUri(r.assets[0].uri); setStage('preview'); }
  };

  const retake = async () => {
    await deleteTempImage(tempUri);
    setTempUri(null); setOwnedUri(null); setResult(null);
    // A different receipt must not inherit the last one's vendor, corrections
    // or dismissed question.
    setKnown(null); setEdits({}); setEditing(null); setQuestionDismissed(false);
    setStage('camera');
  };

  // Use Photo → persist → read on-device → review
  const usePhoto = async () => {
    if (!tempUri) return;
    setStage('reading');
    // A fresh photo starts fresh: old corrections must not bleed into it.
    setEdits({});
    setEditing(null);
    try {
      const owned = await saveAcceptedImage(tempUri);
      await deleteTempImage(tempUri);
      setOwnedUri(owned);
      const r = await recognizer.recognize(owned);
      setResult(r);

      // What have we learned about this vendor before? Memory beats guesswork:
      // it covers vendors the built-in list has never heard of, and it knows
      // how YOU file them.
      const memory = await recallMerchant(r.merchant);
      setKnown(memory);

      const detected = r.ok && r.docType !== 'unknown' ? r.docType : 'unknown';
      setChosenType(memory ? memory.docType : detected);
      setStage('review');
    } catch {
      Alert.alert('Could not process image', 'Please try again.');
      setStage('preview');
    }
  };

  // Continue → prefilled form (or manual = photo only)
  const goToForm = (type: DocType, prefill: boolean) => {
    if (!ownedUri || type === 'unknown') return;
    const params = formParams(review, type, ownedUri, prefill);
    if (type === 'expense') {
      navigation.replace('AddExpense', params);
    } else {
      // A due DAY is a bill's own idea; it comes from the document or memory.
      const ocrDueDay = prefill && result?.dueDate ? parseInt(result.dueDate.split('-')[2], 10) : undefined;
      navigation.replace('Bills', { ...params, billDueDay: ocrDueDay ?? (prefill ? known?.dueDay : undefined) });
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
  const summary = buildSummary(result, chosenType, merchantValue, amountValue);
  const question = questionDismissed
    ? null
    : confirmQuestion(chosenType, categoryValue, amountValue);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      {ownedUri ? <Image source={{ uri: ownedUri }} style={styles.reviewImage} resizeMode="cover" /> : null}

      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        {!ok && (
          <View style={[styles.noticeCard, { backgroundColor: C.warning + '18' }]}>
            <Ionicons name="alert-circle-outline" size={18} color={C.warning} />
            <Text style={[Typography.helper, { color: C.textPrimary, flex: 1 }]}>
              We couldn&apos;t read this document automatically. Your photo is saved — choose where it belongs and enter the details.
            </Text>
          </View>
        )}

        {ok && <Text style={[Typography.cardTitle, { color: C.textPrimary }]}>{summary}</Text>}

        {/* What we already know about this vendor from previous saves — the
            difference between recognising a few big billers and recognising
            the vendors you actually use. */}
        {known && (
          <View style={[styles.noticeCard, { backgroundColor: C.income + '18' }]}>
            <Ionicons name="sparkles-outline" size={18} color={C.income} />
            <Text style={[Typography.helper, { color: C.textPrimary, flex: 1 }]}>
              {knownSummary(known)}
            </Text>
          </View>
        )}

        {/* The confirmation, as real buttons — a decision worth pushing. */}
        {question && (
          <View style={styles.confirmCard}>
            <Text style={[Typography.cardTitle, { color: C.textPrimary, textAlign: 'center' }]}>
              {question}
            </Text>
            <View style={styles.confirmButtons}>
              <PeggyPushButton
                label="Yes"
                icon="checkmark"
                tone="confirm"
                style={{ flex: 1 }}
                onPress={() => goToForm(chosenType, true)}
              />
              <PeggyPushButton
                label="No"
                icon="close"
                tone="neutral"
                style={{ flex: 1 }}
                onPress={() => setQuestionDismissed(true)}
              />
            </View>
            <Text style={[Typography.helper, { color: C.textSecondary, textAlign: 'center', marginTop: 6 }]}>
              Yes opens it filled in, ready to save.
            </Text>
          </View>
        )}

        {/* Type choice */}
        <Text style={styles.sectionLabel}>THIS IS A</Text>
        <View style={styles.typeRow}>
          <TypeChip C={C} label="Expense" icon="arrow-up-circle" active={chosenType === 'expense'} onPress={() => setChosenType('expense')} />
          <TypeChip C={C} label="Bill" icon="receipt" active={chosenType === 'bill'} onPress={() => setChosenType('bill')} />
        </View>
        {chosenType === 'unknown' && <Text style={[Typography.helper, { color: C.warning, marginTop: 6 }]}>Please choose one.</Text>}

        {/* Detected fields (honest confidence) */}
        <Text style={styles.sectionLabel}>CHECK THIS</Text>
        <PeggyCard style={styles.card}>
          {/* Every row can be corrected right here. Leaving Smart Capture to fix
              one field meant rebuilding the whole transaction elsewhere, which
              made photographing the receipt pointless. */}
          {editing === 'merchant' ? (
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>{chosenType === 'bill' ? 'Payee' : 'Merchant'}</Text>
              <PeggyInput
                containerStyle={styles.editInput}
                value={draft}
                onChangeText={setDraft}
                autoFocus
                placeholder="Who was it?"
                onBlur={commitDraft}
                onSubmitEditing={commitDraft}
                returnKeyType="done"
                accessibilityLabel="Merchant name"
              />
            </View>
          ) : (
            <EditableField
              C={C}
              label={chosenType === 'bill' ? 'Payee' : 'Merchant'}
              value={merchantValue}
              conf={confOf('merchant')}
              onPress={() => { setDraft(merchantValue ?? ''); setEditing('merchant'); }}
            />
          )}
          <Divider C={C} />

          {editing === 'amount' ? (
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Amount</Text>
              <PeggyCurrencyInput
                style={styles.editInput}
                value={draft}
                onChangeText={setDraft}
                autoFocus
              />
            </View>
          ) : (
            <EditableField
              C={C}
              label="Amount"
              value={amountValue != null ? formatCurrency(amountValue) : undefined}
              conf={confOf('amount')}
              onPress={() => { setDraft(amountValue != null ? String(amountValue) : ''); setEditing('amount'); }}
            />
          )}
          <Divider C={C} />

          <EditableField
            C={C}
            label="Date"
            value={dateValue ? formatDate(dateValue) : undefined}
            conf={confOf('date')}
            onPress={() => setEditing(editing === 'date' ? null : 'date')}
          />
          {editing === 'date' && (
            <View style={{ paddingBottom: Spacing.sm }}>
              <PeggyDateField
                value={dateValue ?? localDateString(new Date())}
                onChange={(d) => { setEdits(e => ({ ...e, date: d })); setEditing(null); }}
                label="When was it?"
              />
            </View>
          )}
          <Divider C={C} />

          <EditableField
            C={C}
            label="Category"
            value={categoryValue ? (CATEGORIES as any)[categoryValue]?.label ?? categoryValue : undefined}
            conf={confOf('category')}
            onPress={() => setEditing(editing === 'category' ? null : 'category')}
          />
          {editing === 'category' && (
            <View style={styles.catRow}>
              {(Object.keys(CATEGORIES) as Category[]).map((key) => (
                <PeggyChip
                  key={key}
                  label={(CATEGORIES as any)[key].label}
                  selected={categoryValue === key}
                  onPress={() => { setEdits(e => ({ ...e, category: key })); setEditing(null); }}
                />
              ))}
            </View>
          )}
        </PeggyCard>

        <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 10 }]}>
          Tap anything above to correct it. Your photo stays attached.
        </Text>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: chosenType === 'unknown' ? C.primary + '55' : C.primary }]}
          disabled={chosenType === 'unknown'}
          onPress={() => goToForm(chosenType, review.shouldPrefill)}
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

function buildSummary(r: RecognitionResult | null, type: DocType, merchant?: string, amount?: number): string {
  if (!r || !r.ok) return '';
  const who = merchant ?? (type === 'bill' ? 'This document' : 'This receipt');
  const amt = amount != null ? ` for ${formatCurrency(amount)}` : '';
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

function EditableField({ C, label, value, conf, onPress }: {
  C: ColorPalette; label: string; value?: string;
  conf?: 'high' | 'low' | 'none'; onPress: () => void;
}) {
  const missing = !value || conf === 'none';
  const spoken = missing ? label + ', not read. Tap to enter it.' : label + ', ' + value + '. Tap to change it.';
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, minHeight: 48 }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
    >
      <Text style={[Typography.helper, { color: C.textSecondary, width: 90 }]}>{label}</Text>
      <Text
        style={[Typography.body, {
          color: missing ? C.warning : C.textPrimary,
          flex: 1,
          fontWeight: missing ? '600' : '400',
        }]}
        numberOfLines={1}
      >
        {value ?? 'Tap to add'}
      </Text>
      {conf === 'low' && !missing ? (
        <Text style={[Typography.caption, { color: C.warning, marginRight: 6 }]}>check</Text>
      ) : null}
      <Ionicons name="pencil-outline" size={16} color={C.textHint} />
    </TouchableOpacity>
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
    confirmCard: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg, padding: Spacing.lg,
      marginTop: Spacing.md, borderWidth: 1, borderColor: C.border,
    },
    confirmButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    // PeggyCard supplies the surface, radius and shadow. The rows inside bring
    // their own vertical padding, so vertical padding is zeroed here.
    card: { paddingVertical: 0, paddingHorizontal: Spacing.md },
    continueBtn: { height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
    reviewActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.md },
    editInput: { flex: 1 },
    editRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, minHeight: 56 },
    editLabel: { ...Typography.helper, color: C.textSecondary, width: 90 },
    catRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: Spacing.sm },
    reviewAction: { ...Typography.helper, color: C.textSecondary, fontWeight: '600' },
  });
}
