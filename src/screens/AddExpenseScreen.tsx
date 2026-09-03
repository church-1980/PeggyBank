import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { recognizer } from '../lib/recognition';
import { deleteExpense } from '../lib/saveExpense';
import { getDatabase } from '../database/database';
import { CATEGORIES } from '../data/categories';
import { getTodayString, formatCurrency } from '../utils/helpers';
import { Category } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { useCustomLogos } from '../context/CustomLogoContext';
import { categoryIconKey } from '../data/iconRegistry';
import { rememberMerchant } from '../lib/merchantMemory';
import IconBadge from '../components/IconBadge';
import PeggyScreen from '../components/peggy/PeggyScreen';
import PeggyDateField from '../components/peggy/PeggyDateField';

const VALID_CATEGORIES = Object.keys(CATEGORIES) as Category[];

export default function AddExpenseScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { logoFor, pickAndSetLogo, removeLogo, hasLogo } = useCustomLogos();

  const prefill  = route?.params ?? {};
  const editingId: number | undefined = prefill.id;
  const returnTo: string | undefined  = prefill.returnTo;

  const [amount,        setAmount]        = useState(prefill.amount ? String(prefill.amount) : '');
  const [category,      setCategory]      = useState<Category>(prefill.category ?? 'groceries');
  const [note,          setNote]          = useState(prefill.note ?? '');
  const [date,          setDate]          = useState<string>(prefill.date ?? getTodayString());
  // photo_uri and is_recurring are read back when EDITING. They used not to be:
  // the form started with no photo and recurring off, and the update wrote both
  // of those blanks over the record. Correcting an amount therefore deleted the
  // receipt photo attached to it and forgot that it repeated. Nothing warned.
  const [photoUri,      setPhotoUri]      = useState<string | null>(
    prefill.capturedPhoto ?? prefill.photo_uri ?? null);
  const [isRecurring,   setIsRecurring]   = useState<boolean>(!!prefill.is_recurring);
  const [saving,        setSaving]        = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    if (prefill.category) return;
    getDatabase().then(db =>
      db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'last_expense_category'`
      )
    ).then(row => {
      if (row?.value && VALID_CATEGORIES.includes(row.value as Category)) {
        setCategory(row.value as Category);
      }
    }).catch(() => {});
  }, []);

  const handleBack = () => {
    if (returnTo) navigation.navigate('Home', { screen: returnTo });
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  /**
   * REMOVING THE RECORD, FROM THE RECORD'S OWN SCREEN.
   *
   * Deliberately only here. A delete on a Home card or a What Happened row
   * would put a destructive action one careless thumb away from a list people
   * scroll; opening the authoritative expense first is the confirmation that
   * matters most.
   *
   * The work itself is one line, and that is the point: the row leaves, and
   * every view that reads expenses forgets it. Nothing here notifies Safe to
   * Spend, the breakdown or the calendar.
   */
  const handleDelete = () => {
    if (!editingId) return;
    Alert.alert(
      'Delete this expense?',
      'This will remove ' + formatCurrency(parsedAmount || prefill.amount || 0) +
      ' from your spending and totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const db = await getDatabase();
              await deleteExpense(db, editingId);
              handleBack();
            } catch (e) {
              // Never say deleted when the row is still there.
              console.warn('[expense] delete failed:', e);
              Alert.alert(
                "Couldn't delete this expense",
                'It is still saved. Please try again.',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_expense_category', ?)`,
        [category]
      );
      if (editingId) {
        await db.runAsync(
          `UPDATE expenses SET amount=?, category=?, note=?, date=?, photo_uri=?, is_recurring=? WHERE id=?`,
          [parsedAmount, category, note.trim(), date, photoUri ?? null, isRecurring ? 1 : 0, editingId]
        );
      } else {
        await db.runAsync(
          `INSERT INTO expenses (amount, category, note, date, photo_uri, is_recurring) VALUES (?, ?, ?, ?, ?, ?)`,
          [parsedAmount, category, note.trim(), date, photoUri ?? null, isRecurring ? 1 : 0]
        );
      }
      // Learn this vendor from what was actually confirmed, so the next photo
      // of it fills itself in. Only when there is a name to key on.
      if (note.trim()) {
        await rememberMerchant({
          name: note.trim(),
          docType: 'expense',
          category,
          recurring: isRecurring,
          amount: parsedAmount,
        });
      }
      if (returnTo) navigation.navigate('Home', { screen: returnTo });
      else if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Home');
    } catch (e: any) {
      Alert.alert('Could not save', String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  /**
   * SAME PIPELINE, EVERY ENTRY POINT.
   *
   * Photographing a receipt from here used to attach the picture and read
   * nothing, so the identical photo produced Smart Capture from the Home
   * camera and a blank form from this one. It now runs the same recogniser.
   *
   * It only ever FILLS A BLANK. Anything already typed is the person's own
   * work and is never overwritten, so this cannot take a correction away.
   */
  const readIntoBlanks = async (uri: string) => {
    try {
      const r = await recognizer.recognize(uri);
      if (!r.ok) return;

      const filled: string[] = [];
      if (!amount && r.amount != null && r.confidence.amount !== 'none') {
        setAmount(String(r.amount)); filled.push('the amount');
      }
      if (!note.trim() && r.merchant && r.confidence.merchant !== 'none') {
        setNote(r.merchant); filled.push('who it was');
      }
      if (r.date && r.confidence.date === 'high' && date === getTodayString()) {
        setDate(r.date); filled.push('the date');
      }
      if (r.category && !prefill.category) setCategory(r.category);

      if (filled.length) {
        Alert.alert(
          'Read from your receipt',
          'PeggyBank filled in ' + filled.join(' and ') + '. Please check it before saving.',
        );
      }
    } catch (e) {
      // Reading is a bonus; failing to read must never cost the photo.
      console.warn('[capture] could not read receipt:', e);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      await readIntoBlanks(result.assets[0].uri);
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      await readIntoBlanks(result.assets[0].uri);
    }
  };

  const handleCameraPress = () => {
    if (photoUri) {
      Alert.alert('Receipt Photo', 'What would you like to do?', [
        { text: 'Remove Photo',        onPress: () => setPhotoUri(null) },
        { text: 'Replace with Camera', onPress: takePhoto },
        { text: 'Replace from Gallery',onPress: pickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Receipt Photo', '', [
        { text: 'Take Photo',          onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PeggyScreen scroll={false} padded={false} contentStyle={styles.shell}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back without saving">
          <Ionicons name="chevron-down" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{editingId ? 'Edit Expense' : 'Add Expense'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Amount + Save ── */}
        <View style={[styles.amountContainer, amountFocused && { borderColor: C.primary + '90' }]}>
          <Text style={styles.amountSymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={C.textHint}
            autoFocus
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
          />
          <TouchableOpacity
            style={[styles.savePill, isValid && { backgroundColor: C.primary }]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.82}
          >
            <Text style={[styles.savePillText, isValid && { color: C.textOnPrimary }]}>
              {saving ? '…' : editingId ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Where ── */}
        <Text style={styles.sectionLabel}>Where was it?</Text>
        <TextInput
          style={styles.whereInput}
          value={note}
          onChangeText={setNote}
          placeholder="Dunn's, Shell, Metro…"
          placeholderTextColor={C.textHint}
          returnKeyType="done"
          autoCapitalize="words"
          accessibilityLabel="Where you spent this money"
        />
        <Text style={styles.whereHint}>
          Helps you remember what a payment was for when you look back.
        </Text>

        {/* ── When ── */}
        <View style={styles.dateBlock}>
          <PeggyDateField value={date} onChange={setDate} label="When was it?" />
        </View>

        {/* ── Category ── */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([key, info]) => {
            const active = category === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.catCard,
                  active
                    ? { backgroundColor: info.color + '22', borderColor: info.color + '70' }
                    : { backgroundColor: C.bgCard, borderColor: C.border },
                ]}
                onPress={() => setCategory(key)}
                activeOpacity={0.72}
              >
                {/*
                  Icon wrap is transparent when active so the card's single tint
                  reads as one unified color — no inner rectangle artifact.
                  When inactive, the wrap provides the soft pastel circle.
                */}
                <IconBadge
                  iconKey={info.iconKey}
                  color={info.color}
                  size={56}
                  tinted={!active}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[
                  styles.catLabel,
                  { color: active ? C.textPrimary : C.textSecondary },
                  active && { fontWeight: '700' },
                ]} numberOfLines={2}>
                  {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Options: Recurring | Note | Camera ── */}
        <View style={styles.optionsRow}>

          {/* Recurring */}
          <TouchableOpacity
            style={[
              styles.optionSquare,
              isRecurring && { backgroundColor: C.primary + '14', borderColor: C.primary + '70' },
            ]}
            onPress={() => setIsRecurring(!isRecurring)}
            activeOpacity={0.75}
          >
            <IconBadge iconKey="recurring" color={isRecurring ? C.primary : C.textSecondary} size={26} iconSize={18} tinted={false} />
          </TouchableOpacity>

          {/* Logo — attach a brand logo to this merchant (keyed by the note). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm }}>
            <IconBadge iconKey={categoryIconKey(category)} color={C.primary} size={48} overrideSource={note.trim() && logoFor(note) ? { uri: logoFor(note) } : undefined} />
            <TouchableOpacity
              onPress={() => (note.trim() ? pickAndSetLogo(note) : null)}
              style={{ backgroundColor: C.primary + '18', borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16, opacity: note.trim() ? 1 : 0.5 }}
            >
              <Text style={{ color: C.primary, fontWeight: '700' }}>{note.trim() && hasLogo(note) ? 'Change logo' : 'Add a logo'}</Text>
            </TouchableOpacity>
            {note.trim() && hasLogo(note) ? (
              <TouchableOpacity onPress={() => removeLogo(note)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: C.textSecondary, fontWeight: '600' }}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Camera */}
          <TouchableOpacity
            style={[
              styles.optionSquare,
              photoUri && { backgroundColor: C.primary + '14', borderColor: C.primary + '70' },
            ]}
            onPress={handleCameraPress}
            accessibilityRole="button"
            accessibilityLabel={photoUri ? 'Replace the receipt photo' : 'Take a photo of the receipt'}
            activeOpacity={0.75}
          >
            <Ionicons
              name={photoUri ? 'camera' : 'camera-outline'}
              size={18}
              color={photoUri ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

        </View>

        {editingId ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Delete this expense"
            testID="delete-expense"
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={C.spending} />
            <Text style={styles.deleteBtnText}>Delete expense</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      </PeggyScreen>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    // Destructive, and deliberately not competing with Update: no fill, no
    // shout, but a full-width target and the spending colour so it cannot be
    // mistaken for a neutral action.
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: Spacing.xl, marginBottom: Spacing.lg,
      paddingVertical: 16, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.spending + '55',
      backgroundColor: 'transparent',
    },
    deleteBtnText: { ...Typography.body, color: C.spending, fontWeight: '600' },
    // PeggyScreen paints the background and owns the safe-area inset.
    root:   { flex: 1 },
    shell:  { flex: 1, paddingBottom: 0 },
    scroll: { flex: 1 },

    scrollContent: {
      paddingHorizontal: Spacing.md,
    },

    // ── Header ──
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.bgCard,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { ...Typography.h2, color: C.textPrimary },

    // ── Amount + Save ──
    amountContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1.5, borderColor: C.border,
      paddingLeft: Spacing.md, paddingRight: 6, paddingVertical: 6,
      marginBottom: Spacing.md,
    },
    amountSymbol: {
      fontSize: 22, fontWeight: '700', color: C.primary, marginRight: 6,
    },
    amountInput: {
      flex: 1, fontSize: 28, fontWeight: '700',
      color: C.textPrimary, paddingVertical: 6,
    },
    savePill: {
      backgroundColor: C.border,
      borderRadius: Radius.md,
      paddingHorizontal: 20, paddingVertical: 10,
      alignItems: 'center', justifyContent: 'center',
      minWidth: 72,
    },
    savePillText: {
      fontSize: 15, fontWeight: '700', color: C.textHint,
    },

    // ── Section label ──
    sectionLabel: {
      ...Typography.label, color: C.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.3,
      marginBottom: 8,
    },

    // ── Category grid ──
    categoryGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      gap: 8, marginBottom: Spacing.md,
    },
    catCard: {
      width: '30%',
      borderRadius: Radius.md,
      paddingVertical: 8, paddingHorizontal: 4,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    catIconWrap: {
      width: 30, height: 30, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    catLabel: {
      ...Typography.helper, fontWeight: '600', textAlign: 'center',
    },

    // ── Options row ──
    optionsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    optionSquare: {
      width: 44, height: 44, borderRadius: Radius.md,
      backgroundColor: C.bgCard,
      borderWidth: 1.5, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    dateBlock: { marginTop: Spacing.lg },
    whereInput: {
      minHeight: 56,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.bgCard,
      paddingHorizontal: Spacing.md,
      ...Typography.body,
      color: C.textPrimary,
    },
    whereHint: { ...Typography.caption, color: C.textSecondary, marginTop: 6 },
  });
}
