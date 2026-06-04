import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { getTodayString } from '../utils/helpers';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

const QUICK_LABELS = ['Paycheck', 'Freelance', 'Cash', 'Gift', 'Side Job', 'Other'];

export default function AddIncomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [mode, setMode] = useState<'fixed' | 'variable'>('fixed');
  const [amount, setAmount] = useState('');
  const [lowAmount, setLowAmount] = useState('');
  const [highAmount, setHighAmount] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    let saveAmount: number;
    let saveLabel: string;

    if (mode === 'fixed') {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('Oops', 'Please enter a valid amount.');
        return;
      }
      saveAmount = parsed;
      saveLabel = label.trim() || 'Income';
    } else {
      const low = parseFloat(lowAmount);
      const high = parseFloat(highAmount);
      if (isNaN(low) || low <= 0 || isNaN(high) || high <= 0) {
        Alert.alert('Oops', 'Please enter both a low and high amount.');
        return;
      }
      if (high < low) {
        Alert.alert('Oops', 'High amount should be equal to or more than the low amount.');
        return;
      }
      saveAmount = (low + high) / 2;
      const base = label.trim() || 'Income';
      saveLabel = `${base} ($${low}–$${high})`;
    }

    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO income (amount, label, date) VALUES (?, ?, ?)`,
        [saveAmount, saveLabel, getTodayString()]
      );
      console.log('[AddIncome] saved $' + saveAmount + ' label=' + saveLabel);
      navigation.navigate('Home');
    } catch (e) {
      console.error('[AddIncome] save error:', e);
      Alert.alert('Could not save', 'Something went wrong saving the income. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="chevron-down" size={22} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Income</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'fixed' && styles.modeBtnActive]}
            onPress={() => setMode('fixed')}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={mode === 'fixed' ? C.income : C.textHint} />
            <Text style={[styles.modeBtnText, mode === 'fixed' && styles.modeBtnTextActive]}>Fixed Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'variable' && styles.modeBtnActive]}
            onPress={() => setMode('variable')}
          >
            <Ionicons name="trending-up-outline" size={16} color={mode === 'variable' ? C.income : C.textHint} />
            <Text style={[styles.modeBtnText, mode === 'variable' && styles.modeBtnTextActive]}>Variable Range</Text>
          </TouchableOpacity>
        </View>

        {mode === 'fixed' ? (
          <View style={styles.amountCard}>
            <Text style={styles.amountPrefix}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={C.textHint}
              autoFocus
            />
          </View>
        ) : (
          <>
            <Text style={styles.variableHint}>
              Not sure of the exact amount? Enter a low and high estimate — we'll save the average.
            </Text>
            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <Text style={styles.rangeLabel}>Low</Text>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangePrefix}>$</Text>
                  <TextInput
                    style={styles.rangeTextInput}
                    value={lowAmount}
                    onChangeText={setLowAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={C.textHint}
                    autoFocus
                  />
                </View>
              </View>
              <Ionicons name="arrow-forward-outline" size={20} color={C.textHint} style={{ marginTop: 28 }} />
              <View style={styles.rangeField}>
                <Text style={styles.rangeLabel}>High</Text>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangePrefix}>$</Text>
                  <TextInput
                    style={styles.rangeTextInput}
                    value={highAmount}
                    onChangeText={setHighAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={C.textHint}
                  />
                </View>
              </View>
            </View>
            {lowAmount && highAmount && !isNaN(parseFloat(lowAmount)) && !isNaN(parseFloat(highAmount)) ? (
              <Text style={styles.avgNote}>
                Average saved: ${((parseFloat(lowAmount) + parseFloat(highAmount)) / 2).toFixed(2)}
              </Text>
            ) : null}
          </>
        )}

        <Text style={styles.sectionLabel}>What is this from?</Text>
        <View style={styles.chipRow}>
          {QUICK_LABELS.map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.chip, label === q && styles.chipActive]}
              onPress={() => setLabel(q)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, label === q && styles.chipTextActive]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.noteInput}
          value={label}
          onChangeText={setLabel}
          placeholder="Or type a custom label..."
          placeholderTextColor={C.textHint}
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down-circle-outline" size={20} color={C.textOnPrimary} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Income'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    root:      { flex: 1, backgroundColor: C.bg },
    container: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: Spacing.md, marginBottom: Spacing.sm,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.bgCard,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    title: { ...Typography.h2, color: C.textPrimary },

    modeRow: {
      flexDirection: 'row', gap: 10, marginBottom: Spacing.md,
    },
    modeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, borderRadius: Radius.md,
      backgroundColor: C.bgCard, borderWidth: 1.5, borderColor: C.border,
    },
    modeBtnActive:    { borderColor: C.income, backgroundColor: C.income + '14' },
    modeBtnText:      { ...Typography.smallBold, color: C.textHint },
    modeBtnTextActive:{ color: C.income },

    amountCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border,
    },
    amountPrefix: { ...Typography.h1, color: C.income, marginRight: Spacing.sm },
    amountInput:  { flex: 1, fontSize: 40, color: C.textPrimary, paddingVertical: 18, fontWeight: '700' },

    variableHint: { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.md, lineHeight: 22 },
    rangeRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: Spacing.sm },
    rangeField:   { flex: 1 },
    rangeLabel:   { ...Typography.caption, color: C.textSecondary, marginBottom: 6 },
    rangeInput: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: C.border,
    },
    rangePrefix:    { ...Typography.h3, color: C.income, marginRight: 4 },
    rangeTextInput: { flex: 1, fontSize: 24, color: C.textPrimary, paddingVertical: 14, fontWeight: '700' },
    avgNote: {
      ...Typography.smallBold, color: C.income,
      textAlign: 'center', marginBottom: Spacing.lg,
    },

    sectionLabel: {
      ...Typography.label, color: C.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6,
      marginBottom: Spacing.sm, marginTop: Spacing.md,
    },

    chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
    chip: {
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: Radius.full,
      backgroundColor: C.bgCard,
      borderWidth: 1, borderColor: C.border,
    },
    chipActive:    { backgroundColor: C.income + '20', borderColor: C.income },
    chipText:      { ...Typography.small, color: C.textSecondary },
    chipTextActive:{ color: C.income, fontWeight: '600' },

    noteInput: {
      backgroundColor: C.bgCard, borderRadius: Radius.md,
      padding: Spacing.md, color: C.textPrimary, fontSize: 16,
      borderWidth: 1, borderColor: C.border,
      marginBottom: Spacing.xs,
    },

    saveButton: {
      marginTop: Spacing.xl, backgroundColor: C.income,
      borderRadius: Radius.lg, paddingVertical: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    saveButtonText:   { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 18 },
    cancelButton:     { paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
    cancelButtonText: { ...Typography.small, color: C.textHint },
  });
}
