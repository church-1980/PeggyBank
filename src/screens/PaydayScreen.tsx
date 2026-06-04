import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency, getTodayString, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../utils/helpers';
import { Bill } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface Plan {
  bills: number;
  savings: number;
  emergency: number;
  spending: number;
}

type PayFrequency = 'monthly' | 'weekly' | 'biweekly';

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

interface PlanRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  amount: number;
  pct: number;
  borderColor: string;
}

function PlanRow({ icon, iconColor, label, amount, pct, borderColor }: PlanRowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm }}>
      <View style={{ width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: iconColor + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Typography.caption, color: iconColor, marginBottom: 5 }}>{label}</Text>
        <View style={{ height: 6, backgroundColor: borderColor, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, pct)}%`, backgroundColor: iconColor }} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: Spacing.sm }}>
        <Text style={{ ...Typography.bodyBold, fontSize: 15, color: iconColor }}>{formatCurrency(amount)}</Text>
        <Text style={{ ...Typography.caption, color: iconColor + '99' }}>{pct}%</Text>
      </View>
    </View>
  );
}

export default function PaydayScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [paycheckAmount, setPaycheckAmount] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequency>('monthly');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(5);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsGoalMonthly, setSavingsGoalMonthly] = useState(0);
  const [saved, setSaved] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();

      const billsResult = await db.getAllAsync<Bill>(`SELECT * FROM bills`);
      setBills(billsResult);

      const goalsResult = await db.getAllAsync<{ target_amount: number; current_amount: number }>(
        `SELECT target_amount, current_amount FROM savings_goals`
      );
      const monthlyNeeded = goalsResult.reduce((sum, g) =>
        sum + Math.max(0, g.target_amount - g.current_amount) / 12, 0);
      setSavingsGoalMonthly(monthlyNeeded);

      const paydaySetting = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'payday'`
      );
      if (paydaySetting) setSelectedDay(parseInt(paydaySetting.value, 10) || 1);

      const freqSetting = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'pay_frequency'`
      );
      if (freqSetting) setPayFrequency(freqSetting.value as PayFrequency);

      const wdSetting = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'pay_weekday'`
      );
      if (wdSetting) setSelectedWeekday(parseInt(wdSetting.value, 10));

      const lastIncome = await db.getFirstAsync<{ amount: number }>(
        `SELECT amount FROM income ORDER BY created_at DESC LIMIT 1`
      );
      if (lastIncome) setPaycheckAmount(String(lastIncome.amount));
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const calculatePlan = () => {
    const income = parseFloat(paycheckAmount);
    if (isNaN(income) || income <= 0) {
      Alert.alert('Oops', 'Please enter your paycheck amount first.');
      return;
    }
    const billsTotal = bills.reduce((sum, b) => sum + b.amount, 0);
    const savingsAmount = Math.min(savingsGoalMonthly, income * 0.1);
    const emergencyAmount = income * 0.05;
    const spending = Math.max(0, income - billsTotal - savingsAmount - emergencyAmount);
    setPlan({ bills: billsTotal, savings: savingsAmount, emergency: emergencyAmount, spending });
  };

  const savePlan = async () => {
    const income = parseFloat(paycheckAmount);
    if (isNaN(income) || income <= 0) {
      Alert.alert('Oops', 'Please enter your paycheck amount first.');
      return;
    }
    try {
      const db = await getDatabase();
      await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('payday', ?)`, [String(selectedDay)]);
      await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('pay_frequency', ?)`, [payFrequency]);
      await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('pay_weekday', ?)`, [String(selectedWeekday)]);
      await db.runAsync(`INSERT INTO income (amount, label, date) VALUES (?, ?, ?)`, [income, 'Paycheck', getTodayString()]);
      setSaved(true);
      Alert.alert('Saved', 'Your paycheck has been recorded.');
    } catch (e) {
      console.error('[Payday] savePlan error:', e);
      Alert.alert('Could not save', 'Something went wrong saving the plan. Please try again.');
    }
  };

  const pct = (value: number) => {
    const income = parseFloat(paycheckAmount);
    if (!income || income <= 0) return 0;
    return Math.round((value / income) * 100);
  };

  const paydayDescription = () => {
    if (payFrequency === 'monthly') return `on the ${ordinal(selectedDay)} of each month`;
    if (payFrequency === 'weekly') return `every ${WEEKDAY_NAMES[selectedWeekday]}`;
    return `every other ${WEEKDAY_NAMES[selectedWeekday]}`;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>

        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Payday Planner</Text>
        <Text style={styles.subtitle}>
          Tell PeggyBank when and how much you get paid. It will divide the money for you.
        </Text>

        <Text style={styles.label}>How much is your paycheck?</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountPrefix}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={paycheckAmount}
            onChangeText={(v) => { setPaycheckAmount(v); setPlan(null); setSaved(false); }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={C.textHint}
          />
        </View>

        <Text style={styles.label}>How often do you get paid?</Text>
        <View style={styles.freqRow}>
          {(['monthly', 'weekly', 'biweekly'] as PayFrequency[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.freqBtn, payFrequency === f && styles.freqBtnActive]}
              onPress={() => { setPayFrequency(f); setPlan(null); setSaved(false); }}
            >
              <Text style={[styles.freqText, payFrequency === f && styles.freqTextActive]}>
                {f === 'monthly' ? 'Monthly' : f === 'weekly' ? 'Weekly' : 'Every 2 wks'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {payFrequency === 'monthly' && (
          <>
            <Text style={styles.label}>Which day of the month do you get paid?</Text>
            <Text style={styles.hint}>Just tap the number</Text>
            <View style={styles.dayGrid}>
              {MONTH_DAYS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayBtn, selectedDay === d && styles.dayBtnActive]}
                  onPress={() => { setSelectedDay(d); setSaved(false); }}
                >
                  <Text style={[styles.dayBtnText, selectedDay === d && styles.dayBtnTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.selectedNote}>You get paid on the {ordinal(selectedDay)} of each month</Text>
          </>
        )}

        {(payFrequency === 'weekly' || payFrequency === 'biweekly') && (
          <>
            <Text style={styles.label}>Which day of the week do you get paid?</Text>
            <View style={styles.weekdayGrid}>
              {WEEKDAY_SHORT.map((day, idx) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.weekdayBtn, selectedWeekday === idx && styles.weekdayBtnActive]}
                  onPress={() => { setSelectedWeekday(idx); setSaved(false); }}
                >
                  <Text style={[styles.weekdayText, selectedWeekday === idx && styles.weekdayTextActive]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.selectedNote}>
              You get paid {payFrequency === 'biweekly' ? 'every other' : 'every'} {WEEKDAY_NAMES[selectedWeekday]}
            </Text>
          </>
        )}

        <TouchableOpacity style={styles.calcBtn} onPress={calculatePlan}>
          <Ionicons name="calculator-outline" size={20} color={C.textOnPrimary} />
          <Text style={styles.calcBtnText}>Show Me the Plan</Text>
        </TouchableOpacity>

        {plan && (
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>Here is how to divide your money</Text>
            <Text style={styles.planSub}>Based on your paycheck {paydayDescription()}</Text>

            <PlanRow icon="receipt-outline"   iconColor={C.bills}   label="Bills"           amount={plan.bills}     pct={pct(plan.bills)}     borderColor={C.border} />
            <PlanRow icon="flag-outline"       iconColor={C.goals}   label="Savings goals"   amount={plan.savings}   pct={pct(plan.savings)}   borderColor={C.border} />
            <PlanRow icon="shield-outline"     iconColor={C.primary} label="Emergency fund"  amount={plan.emergency} pct={pct(plan.emergency)} borderColor={C.border} />
            <PlanRow icon="wallet-outline"     iconColor={C.income}  label="Spending money"  amount={plan.spending}  pct={pct(plan.spending)}  borderColor={C.border} />

            <View style={styles.safeBox}>
              <Text style={styles.safeLabel}>Your safe daily spend</Text>
              <Text style={styles.safeAmount}>{formatCurrency(plan.spending / 30)}</Text>
              <Text style={styles.safeSub}>per day for the month</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saved && { backgroundColor: C.income }]}
              onPress={savePlan}
            >
              {saved && <Ionicons name="checkmark" size={20} color={C.textOnPrimary} />}
              <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save This Plan'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    content:          { paddingHorizontal: Spacing.md },

    backRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: 4 },
    backText:         { ...Typography.small, color: C.textSecondary },

    title:            { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.xs },
    subtitle:         { ...Typography.small, color: C.textSecondary, lineHeight: 24, marginBottom: Spacing.lg },

    label:            { ...Typography.bodyBold, color: C.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },
    hint:             { ...Typography.caption, color: C.textHint, marginBottom: Spacing.sm },

    amountRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border,
    },
    amountPrefix:     { ...Typography.h1, color: C.income, marginRight: 8 },
    amountInput:      { flex: 1, ...Typography.hero, color: C.textPrimary, paddingVertical: 16, fontSize: 36 },

    freqRow:          { flexDirection: 'row', gap: 8 },
    freqBtn: {
      flex: 1, backgroundColor: C.bgCard, borderRadius: Radius.md,
      paddingVertical: 16, alignItems: 'center',
      borderWidth: 2, borderColor: C.border,
    },
    freqBtnActive:    { borderColor: C.primary, backgroundColor: C.primary + '18' },
    freqText:         { ...Typography.caption, color: C.textHint, fontWeight: '600', textAlign: 'center' },
    freqTextActive:   { color: C.primary },

    dayGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayBtn: {
      width: 44, height: 44, borderRadius: Radius.sm,
      backgroundColor: C.bgCard, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    dayBtnActive:     { backgroundColor: C.primary, borderColor: C.primary },
    dayBtnText:       { ...Typography.bodyBold, color: C.textSecondary },
    dayBtnTextActive: { color: C.textOnPrimary },

    weekdayGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    weekdayBtn: {
      paddingHorizontal: 14, paddingVertical: 14,
      borderRadius: Radius.md, backgroundColor: C.bgCard,
      borderWidth: 2, borderColor: C.border,
      minWidth: 56, alignItems: 'center',
    },
    weekdayBtnActive:   { borderColor: C.primary, backgroundColor: C.primary },
    weekdayText:        { ...Typography.bodyBold, color: C.textSecondary },
    weekdayTextActive:  { color: C.textOnPrimary },

    selectedNote:     { ...Typography.bodyBold, color: C.income, marginTop: 12, textAlign: 'center' },

    calcBtn: {
      marginTop: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: 18,
    },
    calcBtnText:      { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },

    planCard: {
      marginTop: Spacing.lg,
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.lg, borderWidth: 1, borderColor: C.border,
    },
    planTitle:        { ...Typography.h3, color: C.textPrimary, marginBottom: 4 },
    planSub:          { ...Typography.caption, color: C.textSecondary, marginBottom: Spacing.lg },

    safeBox: {
      backgroundColor: C.primary + '14', borderRadius: Radius.md,
      padding: Spacing.md, alignItems: 'center',
      marginTop: Spacing.sm, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.primary + '30',
    },
    safeLabel:        { ...Typography.caption, color: C.textSecondary, marginBottom: 4 },
    safeAmount:       { ...Typography.hero, color: C.primary, fontSize: 36 },
    safeSub:          { ...Typography.caption, color: C.textSecondary, marginTop: 4 },

    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: 16,
    },
    saveBtnText:      { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
  });
}
