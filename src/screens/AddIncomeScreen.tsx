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
import IconBadge from '../components/IconBadge';
import { IconKey } from '../data/iconRegistry';
import PeggyScreen from '../components/peggy/PeggyScreen';
import PeggyDateField from '../components/peggy/PeggyDateField';
import { parseLocalDate } from '../core/datetime';

// Income sources — each carries its own matte concept icon.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "st", "nd", "rd", "th" — so the hint reads like a person wrote it. */
function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

const QUICK_SOURCES: { label: string; iconKey: IconKey }[] = [
  { label: 'Paycheck',  iconKey: 'paycheck' },
  { label: 'Freelance', iconKey: 'freelance' },
  { label: 'Cash',      iconKey: 'cash' },
  { label: 'Gift',      iconKey: 'gifts' },
  { label: 'Side Job',  iconKey: 'side-job' },
  { label: 'Other',     iconKey: 'other' },
];

export default function AddIncomeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  // Editing an existing entry arrives as route params. Income used to be
  // insert-only: a mistake could not be corrected, and the date could not be
  // set at all -- it was stamped as "today" on the way in and was not part of
  // the update, so pay entered late was filed on the wrong day for good.
  const editing = route?.params ?? {};
  const editingId: number | undefined = editing.id;

  const [mode, setMode] = useState<'fixed' | 'variable'>('fixed');
  const [amount, setAmount] = useState(editingId ? String(editing.amount ?? '') : '');
  const [date, setDate] = useState<string>(editing.date ?? getTodayString());

  // How often this money arrives. 'once' means exactly that -- no forecast is
  // created. A repeat does NOT bank future money: it only makes the next ones
  // show up to be confirmed when they actually arrive.
  const [repeat, setRepeat] = useState<'once' | 'weekly' | 'monthly'>('once');
  const [lowAmount, setLowAmount] = useState('');
  const [highAmount, setHighAmount] = useState('');
  const [label, setLabel] = useState(editingId ? String(editing.label ?? '') : '');
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
      if (editingId) {
        // date is included deliberately: correcting the day is the whole point.
        await db.runAsync(
          `UPDATE income SET amount=?, label=?, date=? WHERE id=?`,
          [saveAmount, saveLabel, date, editingId]
        );
      } else {
        const when = parseLocalDate(date);
        if (repeat === 'once') {
          await db.runAsync(
            `INSERT INTO income (amount, label, date) VALUES (?, ?, ?)`,
            [saveAmount, saveLabel, date]
          );
        } else {
          // A repeating income records TODAY's payment and sets up the forecast
          // for the ones after it. The schedule stores what to EXPECT; it never
          // creates income on its own -- each future payday has to be confirmed.
          const res = await db.runAsync(
            `INSERT INTO income_schedules (label, amount, frequency, day_of_month, weekday, active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [
              saveLabel, saveAmount, repeat,
              repeat === 'monthly' ? when.getDate() : null,
              repeat === 'weekly' ? when.getDay() : null,
            ]
          );
          const scheduleId = (res as any)?.lastInsertRowId ?? null;
          await db.runAsync(
            `INSERT INTO income (amount, label, date, schedule_id, cycle_date) VALUES (?, ?, ?, ?, ?)`,
            [saveAmount, saveLabel, date, scheduleId, date]
          );
        }
      }
      console.log('[AddIncome] saved $' + saveAmount + ' label=' + saveLabel);
      if (editingId) navigation.goBack(); else navigation.navigate('Home');
    } catch (e) {
      console.error('[AddIncome] save error:', e);
      Alert.alert('Could not save', 'Something went wrong saving the income. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PeggyScreen padded={false} contentStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (editingId ? navigation.goBack() : navigation.navigate('Home'))}
            accessibilityRole="button"
            accessibilityLabel="Go back to the home screen"
          >
            <Ionicons name="chevron-down" size={22} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>{editingId ? 'Edit Income' : 'Add Income'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'fixed' && styles.modeBtnActive]}
            onPress={() => setMode('fixed')}
          >
            <IconBadge iconKey="paid" color={mode === 'fixed' ? C.income : C.textHint} size={26} iconSize={18} tinted={false} />
            <Text style={[styles.modeBtnText, mode === 'fixed' && styles.modeBtnTextActive]}>Fixed Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'variable' && styles.modeBtnActive]}
            onPress={() => setMode('variable')}
          >
            <IconBadge iconKey="reports" color={mode === 'variable' ? C.income : C.textHint} size={26} iconSize={18} tinted={false} />
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
              Not sure of the exact amount? Enter a low and high estimate — we&apos;ll save the average.
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

        <View style={styles.dateBlock}>
          <PeggyDateField value={date} onChange={setDate} label="When did it arrive?" />
        </View>

        {!editingId && (
          <View style={styles.repeatBlock}>
            <Text style={styles.sectionLabel}>Does this come in regularly?</Text>
            <View style={styles.repeatRow}>
              {([
                { key: 'once',    text: 'Just this once' },
                { key: 'weekly',  text: 'Every week' },
                { key: 'monthly', text: 'Every month' },
              ] as const).map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.repeatChip, repeat === opt.key && styles.repeatChipOn]}
                  onPress={() => setRepeat(opt.key)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.text}
                  accessibilityState={{ selected: repeat === opt.key }}
                >
                  <Text style={[styles.repeatText, repeat === opt.key && styles.repeatTextOn]}>{opt.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {repeat !== 'once' && (
              <View>
              <Text style={styles.repeatHint}>
                {repeat === 'weekly'
                  ? `Every ${WEEKDAYS[parseLocalDate(date).getDay()]}, based on the date above.`
                  : `On the ${parseLocalDate(date).getDate()}${ordinalSuffix(parseLocalDate(date).getDate())} of each month, based on the date above.`}
              </Text>
              <Text style={styles.repeatHint}>
                We&apos;ll ask you to confirm each one when it arrives — nothing is counted until you do.
              </Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>What is this from?</Text>
        <View style={styles.chipRow}>
          {QUICK_SOURCES.map(({ label: q, iconKey }) => (
            <TouchableOpacity
              key={q}
              style={[styles.chip, label === q && styles.chipActive]}
              onPress={() => setLabel(q)}
              activeOpacity={0.7}
            >
              <IconBadge iconKey={iconKey} color={C.income} size={30} iconSize={22} tinted={false} />
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
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : editingId ? 'Update Income' : 'Save Income'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => (editingId ? navigation.goBack() : navigation.navigate('Home'))}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </PeggyScreen>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    // PeggyScreen paints the background and owns the safe-area inset.
    root:      { flex: 1 },
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

    dateBlock:    { marginTop: Spacing.lg },
    repeatBlock:  { marginTop: Spacing.lg },
    repeatRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    repeatChip: {
      minHeight: 48, paddingHorizontal: 16, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard,
      alignItems: 'center', justifyContent: 'center', flexGrow: 1,
    },
    repeatChipOn: { backgroundColor: C.income, borderColor: C.income },
    repeatText:   { ...Typography.body, color: C.textSecondary },
    repeatTextOn: { color: C.textOnPrimary, fontWeight: '700' },
    repeatHint:   { ...Typography.caption, color: C.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },

    sectionLabel: {
      ...Typography.label, color: C.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6,
      marginBottom: Spacing.sm, marginTop: Spacing.md,
    },

    chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
    chip: {
      // Equal-width 2-up grid so the pills line up instead of sizing to text.
      width: '48%',
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingLeft: 10, paddingRight: 12, paddingVertical: 8,
      borderRadius: Radius.md,
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
