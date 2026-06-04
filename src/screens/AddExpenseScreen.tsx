import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '../database/database';
import { CATEGORIES } from '../data/categories';
import { getTodayString } from '../utils/helpers';
import { Category } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

const VALID_CATEGORIES = Object.keys(CATEGORIES) as Category[];

export default function AddExpenseScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const C      = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const prefill  = route?.params ?? {};
  const editingId: number | undefined = prefill.id;
  const returnTo: string | undefined  = prefill.returnTo;

  const [amount,        setAmount]        = useState(prefill.amount ? String(prefill.amount) : '');
  const [category,      setCategory]      = useState<Category>(prefill.category ?? 'groceries');
  const [note,          setNote]          = useState(prefill.note ?? '');
  const [photoUri,      setPhotoUri]      = useState<string | null>(null);
  const [isRecurring,   setIsRecurring]   = useState(false);
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
          `UPDATE expenses SET amount=?, category=?, note=?, photo_uri=?, is_recurring=? WHERE id=?`,
          [parsedAmount, category, note.trim(), photoUri ?? null, isRecurring ? 1 : 0, editingId]
        );
      } else {
        await db.runAsync(
          `INSERT INTO expenses (amount, category, note, date, photo_uri, is_recurring) VALUES (?, ?, ?, ?, ?, ?)`,
          [parsedAmount, category, note.trim(), getTodayString(), photoUri ?? null, isRecurring ? 1 : 0]
        );
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

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
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
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
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
                <View style={[
                  styles.catIconWrap,
                  { backgroundColor: active ? 'transparent' : info.color + '20' },
                ]}>
                  <Ionicons name={info.icon} size={16} color={info.color} />
                </View>
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
            <Ionicons
              name="repeat-outline"
              size={18}
              color={isRecurring ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

          {/* Note */}
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note…"
            placeholderTextColor={C.textHint}
            returnKeyType="done"
          />

          {/* Camera */}
          <TouchableOpacity
            style={[
              styles.optionSquare,
              photoUri && { backgroundColor: C.primary + '14', borderColor: C.primary + '70' },
            ]}
            onPress={handleCameraPress}
            activeOpacity={0.75}
          >
            <Ionicons
              name={photoUri ? 'camera' : 'camera-outline'}
              size={18}
              color={photoUri ? C.primary : C.textSecondary}
            />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
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
      fontSize: 11, fontWeight: '600', lineHeight: 14, textAlign: 'center',
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
    noteInput: {
      flex: 1, height: 44,
      backgroundColor: C.bgCard,
      borderRadius: Radius.md,
      borderWidth: 1.5, borderColor: C.border,
      paddingHorizontal: 12,
      color: C.textPrimary, fontSize: 14,
    },
  });
}
