import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
  ScrollView, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency } from '../utils/helpers';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface Debt {
  id?: number;
  name: string;
  total_amount: number;
  amount_paid: number;
  minimum_payment: number;
  monthly_payment: number;
  apr: number;
  notes?: string;
}

function calcPayoff(balance: number, monthlyRate: number, payment: number): { months: number; totalInterest: number } {
  if (payment <= 0 || balance <= 0) return { months: 0, totalInterest: 0 };
  if (monthlyRate === 0) {
    const months = Math.ceil(balance / payment);
    return { months, totalInterest: 0 };
  }
  if (payment <= balance * monthlyRate) {
    return { months: 999, totalInterest: 999999 };
  }
  const months = Math.ceil(-Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate));
  const totalInterest = (payment * months) - balance;
  return { months, totalInterest: Math.max(0, totalInterest) };
}

function formatMonths(months: number): string {
  if (months >= 999) return 'never at this rate';
  if (months <= 0) return 'paid off';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y}yr ${m}mo`;
}

function payoffDate(months: number): string {
  if (months >= 999 || months <= 0) return '';
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function debtCoachMessage(pct: number, aheadOfMin: boolean): string {
  if (pct >= 100) return 'Debt cleared. That took real effort.';
  if (pct >= 75) return aheadOfMin ? "Almost there. You're way ahead of schedule." : 'Almost there. Keep the momentum going.';
  if (pct >= 50) return aheadOfMin ? 'More than halfway, and ahead of minimum. Well done.' : "More than halfway. You're doing it.";
  if (pct >= 25) return "You've paid off a quarter. The hardest part is starting — you've done that.";
  if (pct > 0)   return 'Every payment counts, even the small ones.';
  return "You've taken the first step by tracking this.";
}

function DebtBar({ pct, color, borderColor }: { pct: number; color: string; borderColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={{ height: 8, backgroundColor: borderColor, borderRadius: 4, overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 4, width, backgroundColor: color }} />
    </View>
  );
}

export default function DebtScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [apr, setApr] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const loadDebts = useCallback(async () => {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<Debt>(`SELECT * FROM debts ORDER BY created_at DESC`);
      setDebts(result);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadDebts(); }, [loadDebts]));

  const openAdd = () => {
    setEditingDebt(null);
    setName(''); setTotalAmount(''); setMinimumPayment('');
    setMonthlyPayment(''); setApr('');
    setModalVisible(true);
  };

  const openEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setName(debt.name);
    setTotalAmount(String(debt.total_amount));
    setMinimumPayment(String(debt.minimum_payment || ''));
    setMonthlyPayment(String(debt.monthly_payment || ''));
    setApr(String(debt.apr || ''));
    setModalVisible(true);
  };

  const openPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount(String(debt.monthly_payment || debt.minimum_payment || ''));
    setPayModalVisible(true);
  };

  const handleSave = async () => {
    const total = parseFloat(totalAmount);
    if (!name.trim()) { Alert.alert('Oops', 'Please enter a name.'); return; }
    if (isNaN(total) || total <= 0) { Alert.alert('Oops', 'Please enter the total amount owed.'); return; }
    setSaving(true);
    try {
      const db = await getDatabase();
      const minPay = parseFloat(minimumPayment) || 0;
      const monPay = parseFloat(monthlyPayment) || minPay;
      const aprVal = parseFloat(apr) || 0;
      if (editingDebt?.id) {
        await db.runAsync(
          `UPDATE debts SET name=?, total_amount=?, minimum_payment=?, monthly_payment=?, apr=? WHERE id=?`,
          [name.trim(), total, minPay, monPay, aprVal, editingDebt.id]
        );
        console.log('[Debt] updated debt id', editingDebt.id);
      } else {
        await db.runAsync(
          `INSERT INTO debts (name, total_amount, minimum_payment, monthly_payment, apr, amount_paid) VALUES (?, ?, ?, ?, ?, 0)`,
          [name.trim(), total, minPay, monPay, aprVal]
        );
        }
      setModalVisible(false);
      loadDebts();
    } catch (e: any) {
      Alert.alert('Could not save', String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedDebt?.id) return;
    const pay = parseFloat(paymentAmount);
    if (isNaN(pay) || pay <= 0) { Alert.alert('Oops', 'Please enter a valid payment amount.'); return; }
    setSaving(true);
    try {
      const db = await getDatabase();
      const newPaid = Math.min(selectedDebt.total_amount, selectedDebt.amount_paid + pay);
      await db.runAsync(`UPDATE debts SET amount_paid=? WHERE id=?`, [newPaid, selectedDebt.id]);
      console.log('[Debt] payment $' + pay + ' recorded for debt id', selectedDebt.id);
      setPayModalVisible(false);
      loadDebts();
    } catch (e) {
      console.error('[Debt] payment error:', e);
      Alert.alert('Could not record payment', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDebt = (id: number) => {
    setConfirm({
      title: 'Remove this debt?',
      message: 'It will be removed from your debt tracker.',
      onConfirm: async () => {
        try {
          const db = await getDatabase();
          await db.runAsync(`DELETE FROM debts WHERE id=?`, [id]);
          loadDebts();
        } catch (e) {
          console.error('[Debt] delete error:', e);
        }
      },
    });
  };

  const totalOwed = debts.reduce((sum, d) => sum + Math.max(0, d.total_amount - d.amount_paid), 0);

  const renderDebt = ({ item }: { item: Debt }) => {
    const remaining = Math.max(0, item.total_amount - item.amount_paid);
    const pct = item.total_amount > 0 ? Math.min(100, Math.round((item.amount_paid / item.total_amount) * 100)) : 0;
    const paid = remaining === 0;

    const monthlyRate = (item.apr || 0) / 100 / 12;
    const effectivePayment = item.monthly_payment || item.minimum_payment;
    const { months: payoffMonths, totalInterest } = calcPayoff(remaining, monthlyRate, effectivePayment);

    const boostedPayment = effectivePayment + 20;
    const { months: boostedMonths, totalInterest: boostedInterest } = calcPayoff(remaining, monthlyRate, boostedPayment);
    const savedMonths = payoffMonths < 999 ? Math.max(0, payoffMonths - boostedMonths) : 0;
    const savedInterest = totalInterest < 999999 ? Math.max(0, totalInterest - boostedInterest) : 0;

    const aheadOfMin = item.monthly_payment > item.minimum_payment;
    const barColor = paid ? C.goals : pct >= 50 ? C.income : C.primary;

    return (
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.card, paid && { borderLeftColor: C.goals }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.debtIcon, { backgroundColor: (paid ? C.goals : C.primary) + '18' }]}>
            <Ionicons
              name={paid ? 'checkmark-circle' : 'trending-down-outline'}
              size={20}
              color={paid ? C.goals : C.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtName}>{item.name}</Text>
            {item.apr > 0 && (
              <Text style={styles.aprBadge}>{item.apr}% APR</Text>
            )}
          </View>
          <View style={styles.debtAmountCol}>
            <Text style={[styles.debtRemaining, paid && { color: C.goals }]}>
              {paid ? 'Paid off' : formatCurrency(remaining)}
            </Text>
            {!paid && <Text style={styles.debtRemainingLabel}>remaining</Text>}
          </View>
        </View>

        <DebtBar pct={pct} color={barColor} borderColor={C.border} />
        <View style={styles.pctRow}>
          <Text style={styles.pctLabel}>{formatCurrency(item.amount_paid)} paid</Text>
          <Text style={[styles.pctValue, { color: barColor }]}>{pct}%</Text>
        </View>

        <View style={styles.coachRow}>
          <Ionicons name="heart-outline" size={14} color={C.primaryLight} />
          <Text style={styles.coachText}>{debtCoachMessage(pct, aheadOfMin)}</Text>
        </View>

        {!paid && effectivePayment > 0 && payoffMonths < 999 && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
              <Text style={styles.timelineText}>
                At {formatCurrency(effectivePayment)}/mo → paid off in{' '}
                <Text style={styles.timelineHighlight}>{formatMonths(payoffMonths)}</Text>
                {payoffDate(payoffMonths) ? ` (${payoffDate(payoffMonths)})` : ''}
              </Text>
            </View>
            {item.apr > 0 && (
              <View style={styles.timelineRow}>
                <Ionicons name="cash-outline" size={14} color={C.textSecondary} />
                <Text style={styles.timelineText}>
                  Estimated interest: <Text style={styles.timelineHighlight}>{formatCurrency(totalInterest)}</Text>
                </Text>
              </View>
            )}
            {savedMonths > 0 && savedInterest > 0 && (
              <View style={[styles.timelineRow, styles.boostRow]}>
                <Ionicons name="flash-outline" size={14} color={C.income} />
                <Text style={[styles.timelineText, { color: C.income }]}>
                  Pay $20 more/mo → save {formatMonths(savedMonths)} and {formatCurrency(savedInterest)} in interest
                </Text>
              </View>
            )}
          </View>
        )}

        {!paid && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={14} color={C.textSecondary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => item.id && deleteDebt(item.id)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color={C.spending} />
              <Text style={[styles.editBtnText, { color: C.spending }]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.payBtn} onPress={() => openPayment(item)} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color={C.textOnPrimary} />
              <Text style={styles.payBtnText}>Make Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Debt Payoff</Text>
          {totalOwed > 0 ? (
            <Text style={styles.headerSub}>{formatCurrency(totalOwed)} total remaining</Text>
          ) : debts.length > 0 ? (
            <Text style={[styles.headerSub, { color: C.goals }]}>Everything is paid off. That's huge.</Text>
          ) : (
            <Text style={styles.headerSub}>Track what you owe and watch it disappear</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={C.textOnPrimary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
          {navigation?.goBack && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={debts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDebt}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="trending-down-outline" size={34} color={C.textHint} />
            </View>
            <Text style={styles.emptyText}>No debts tracked</Text>
            <Text style={styles.emptySubText}>
              Add a debt and the app will calculate your payoff timeline and help you find faster paths forward.
            </Text>
            <TouchableOpacity style={styles.emptyCta} onPress={openAdd}>
              <Ionicons name="add" size={16} color={C.textOnPrimary} />
              <Text style={styles.emptyCtaText}>Track Your First Debt</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Confirm sheet */}
      <Modal visible={!!confirm} transparent animationType="slide" onRequestClose={() => setConfirm(null)}>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setConfirm(null)} />
        <View style={[styles.confirmSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.confirmHandle} />
          <Text style={styles.confirmTitle}>{confirm?.title}</Text>
          <Text style={styles.confirmMessage}>{confirm?.message}</Text>
          <TouchableOpacity
            style={styles.confirmDeleteBtn}
            onPress={() => { confirm?.onConfirm(); setConfirm(null); }}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmDeleteText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirm(null)}>
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 40 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingDebt ? 'Edit Debt' : 'Add a Debt'}</Text>
              <Text style={styles.modalSub}>Fill in what you know. APR and planned payment help us calculate your payoff timeline.</Text>

              <Text style={styles.modalLabel}>What is this debt?</Text>
              <TextInput style={[styles.modalInput, focusedField === 'name' && styles.modalInputFocused]} value={name} onChangeText={setName} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} placeholder="e.g. Credit card, Car loan, Student loan" placeholderTextColor={C.textHint} />

              <Text style={styles.modalLabel}>Total amount owed</Text>
              <View style={[styles.amountRow, focusedField === 'total' && styles.amountRowFocused]}>
                <Text style={styles.dollar}>$</Text>
                <TextInput style={styles.amountInput} value={totalAmount} onChangeText={setTotalAmount} onFocus={() => setFocusedField('total')} onBlur={() => setFocusedField(null)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textHint} />
              </View>

              <Text style={styles.modalLabel}>Minimum monthly payment (optional)</Text>
              <View style={[styles.amountRow, focusedField === 'minpay' && styles.amountRowFocused]}>
                <Text style={styles.dollar}>$</Text>
                <TextInput style={styles.amountInput} value={minimumPayment} onChangeText={setMinimumPayment} onFocus={() => setFocusedField('minpay')} onBlur={() => setFocusedField(null)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textHint} />
              </View>

              <Text style={styles.modalLabel}>Your planned monthly payment (optional)</Text>
              <View style={[styles.amountRow, focusedField === 'monpay' && styles.amountRowFocused]}>
                <Text style={styles.dollar}>$</Text>
                <TextInput style={styles.amountInput} value={monthlyPayment} onChangeText={setMonthlyPayment} onFocus={() => setFocusedField('monpay')} onBlur={() => setFocusedField(null)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textHint} />
              </View>

              <Text style={styles.modalLabel}>Interest rate / APR % (optional)</Text>
              <View style={[styles.amountRow, focusedField === 'apr' && styles.amountRowFocused]}>
                <TextInput style={styles.amountInput} value={apr} onChangeText={setApr} onFocus={() => setFocusedField('apr')} onBlur={() => setFocusedField(null)} keyboardType="decimal-pad" placeholder="e.g. 19.99" placeholderTextColor={C.textHint} />
                <Text style={styles.dollar}>%</Text>
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={payModalVisible} transparent animationType="slide" onRequestClose={() => setPayModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 40 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Make a Payment</Text>
            <Text style={styles.modalSub}>{selectedDebt?.name}</Text>

            <Text style={styles.modalLabel}>How much are you paying?</Text>
            <View style={styles.amountRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput style={styles.amountInput} value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.textHint} autoFocus />
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handlePayment} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Recording...' : 'Record Payment'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: Spacing.lg, paddingTop: Spacing.md,
      backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle:   { ...Typography.h2, color: C.textPrimary },
    headerSub:     { ...Typography.small, color: C.textSecondary, marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: C.primary, borderRadius: Radius.full,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    addBtnText: { ...Typography.smallBold, color: C.textOnPrimary },
    backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },

    list:        { padding: Spacing.md, paddingBottom: 100 },
    card: {
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, borderLeftColor: C.primary,
    },
    cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
    debtIcon:    { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    debtName:    { ...Typography.bodyBold, color: C.textPrimary },
    aprBadge:    { ...Typography.caption, color: C.textHint, marginTop: 2 },
    debtAmountCol: { alignItems: 'flex-end' },
    debtRemaining: { ...Typography.bodyBold, color: C.spending, fontSize: 17 },
    debtRemainingLabel: { ...Typography.caption, color: C.textHint },

    pctRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: Spacing.sm },
    pctLabel:    { ...Typography.caption, color: C.textSecondary },
    pctValue:    { ...Typography.smallBold },

    coachRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
    coachText:   { ...Typography.small, color: C.textSecondary, flex: 1, fontStyle: 'italic', lineHeight: 20 },

    timelineCard: {
      backgroundColor: C.bg, borderRadius: Radius.md, padding: Spacing.sm,
      borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm, gap: 6,
    },
    timelineRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    timelineText:     { ...Typography.caption, color: C.textSecondary, flex: 1, lineHeight: 18 },
    timelineHighlight:{ fontWeight: '700', color: C.textPrimary },
    boostRow:         { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, marginTop: 2 },

    actionRow:   { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
    editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
    editBtnText: { ...Typography.caption, color: C.textSecondary },
    payBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: 10 },
    payBtnText:  { ...Typography.smallBold, color: C.textOnPrimary },
    empty:        { alignItems: 'center', padding: Spacing.xl, marginTop: 60 },
    emptyIcon:    { width: 64, height: 64, borderRadius: 32, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, borderWidth: 1, borderColor: C.border },
    emptyText:    { ...Typography.h3, color: C.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
    emptySubText: { ...Typography.small, color: C.textSecondary, textAlign: 'center', lineHeight: 24 },
    emptyCta: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: Spacing.lg, backgroundColor: C.primary,
      borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 12,
    },
    emptyCtaText: { ...Typography.smallBold, color: C.textOnPrimary },

    modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard:         { backgroundColor: C.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
    modalHandle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md },
    modalTitle:        { ...Typography.h2, color: C.textPrimary, marginBottom: 4 },
    modalSub:          { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
    modalLabel:        { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },
    modalInput:        { backgroundColor: C.bg, borderRadius: Radius.md, padding: Spacing.md, color: C.textPrimary, fontSize: 16, borderWidth: 1, borderColor: C.border },
    modalInputFocused: { borderColor: C.primary },
    amountRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border },
    amountRowFocused:  { borderColor: C.primary },
    dollar:            { ...Typography.h3, color: C.primary, marginRight: 4 },
    amountInput:       { flex: 1, fontSize: 26, color: C.textPrimary, paddingVertical: 14, fontWeight: '700' },
    saveBtn:           { marginTop: Spacing.lg, backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center' },
    saveBtnText:       { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    cancelBtn:         { paddingVertical: 14, alignItems: 'center' },
    cancelBtnText:     { ...Typography.small, color: C.textHint },

    confirmOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    confirmSheet: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    },
    confirmHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.lg },
    confirmTitle:      { ...Typography.h3, color: C.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
    confirmMessage:    { ...Typography.small, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
    confirmDeleteBtn: {
      backgroundColor: C.spending + '18', borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.spending + '40',
      paddingVertical: 18, alignItems: 'center', marginBottom: Spacing.sm,
    },
    confirmDeleteText: { ...Typography.bodyBold, color: C.spending, fontSize: 17 },
    confirmCancelBtn:  { paddingVertical: Spacing.md, alignItems: 'center' },
    confirmCancelText: { ...Typography.body, color: C.textHint },
  });
}
