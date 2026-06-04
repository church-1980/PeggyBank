import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency, getDaysUntil, getDaysUntilWeekday, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../utils/helpers';
import { Bill, BillFrequency } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface Subscription {
  id?: number;
  name: string;
  amount: number;
  billing_day: number;
  is_paid?: number;
}

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function billDueLabel(bill: Bill): string {
  if (bill.frequency === 'weekly' && bill.due_weekday !== undefined) {
    const days = getDaysUntilWeekday(bill.due_weekday);
    const name = WEEKDAY_NAMES[bill.due_weekday];
    if (days === 7) return `Every ${name}`;
    if (days === 1) return `Every ${name} — due tomorrow`;
    return `Every ${name} — due in ${days} days`;
  }
  if (bill.due_day) {
    const days = getDaysUntil(bill.due_day);
    if (days === 0) return `Due today (${ordinal(bill.due_day)} of month)`;
    if (days === 1) return `Due tomorrow (${ordinal(bill.due_day)} of month)`;
    return `Due in ${days} days (${ordinal(bill.due_day)} of month)`;
  }
  return 'Due date not set';
}

function billDaysLeft(bill: Bill): number {
  if (bill.frequency === 'weekly' && bill.due_weekday !== undefined) {
    return getDaysUntilWeekday(bill.due_weekday);
  }
  if (bill.due_day) return getDaysUntil(bill.due_day);
  return 99;
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export default function BillsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [bills, setBills] = useState<Bill[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);

  // Unified modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'bill' | 'subscription'>('bill');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedWeekday, setSelectedWeekday] = useState(1);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const db = await getDatabase();
      const billsResult = await db.getAllAsync<Bill>(
        `SELECT * FROM bills ORDER BY is_paid ASC, due_day ASC`
      );
      setBills(billsResult ?? []);
      const subsResult = await db.getAllAsync<Subscription>(
        `SELECT * FROM subscriptions ORDER BY is_paid ASC, billing_day ASC`
      );
      setSubs(subsResult ?? []);
    } catch (e) {
      console.error('[Bills] loadAll error:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  useEffect(() => {
    if (route?.params?.autoOpen) openAdd('bill');
  }, []);

  // ── Open modal ────────────────────────────────────────────────────────────
  const openAdd = (type: 'bill' | 'subscription' = 'bill') => {
    setEditingBill(null); setEditingSub(null);
    setName(''); setAmount('');
    setFrequency('monthly'); setSelectedDay(1); setSelectedWeekday(1);
    setModalType(type);
    setModalVisible(true);
  };

  const openEditBill = (bill: Bill) => {
    setEditingBill(bill); setEditingSub(null);
    setName(bill.name);
    setAmount(String(bill.amount));
    setFrequency((bill.frequency as BillFrequency) ?? 'monthly');
    setSelectedDay(bill.due_day ?? 1);
    setSelectedWeekday(bill.due_weekday ?? 1);
    setModalType('bill');
    setModalVisible(true);
  };

  const openEditSub = (sub: Subscription) => {
    setEditingSub(sub); setEditingBill(null);
    setName(sub.name);
    setAmount(String(sub.amount));
    setSelectedDay(sub.billing_day);
    setModalType('subscription');
    setModalVisible(true);
  };

  // ── Save (unified) ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim()) { Alert.alert('Oops', 'Please enter a name.'); return; }
    if (isNaN(parsed) || parsed <= 0) { Alert.alert('Oops', 'Please enter a valid amount.'); return; }
    setSaving(true);
    try {
      const db = await getDatabase();
      if (modalType === 'bill') {
        const dueDay = frequency === 'monthly' ? selectedDay : null;
        const dueWeekday = frequency === 'weekly' ? selectedWeekday : null;
        if (editingBill?.id) {
          await db.runAsync(
            `UPDATE bills SET name=?, amount=?, frequency=?, due_day=?, due_weekday=? WHERE id=?`,
            [name.trim(), parsed, frequency, dueDay, dueWeekday, editingBill.id]
          );
        } else {
          await db.runAsync(
            `INSERT INTO bills (name, amount, frequency, due_day, due_weekday) VALUES (?, ?, ?, ?, ?)`,
            [name.trim(), parsed, frequency, dueDay, dueWeekday]
          );
        }
      } else {
        if (editingSub?.id) {
          await db.runAsync(
            `UPDATE subscriptions SET name=?, amount=?, billing_day=? WHERE id=?`,
            [name.trim(), parsed, selectedDay, editingSub.id]
          );
        } else {
          await db.runAsync(
            `INSERT INTO subscriptions (name, amount, billing_day) VALUES (?, ?, ?)`,
            [name.trim(), parsed, selectedDay]
          );
        }
      }
      setModalVisible(false);
      loadAll();
    } catch (e: any) {
      Alert.alert('Could not save', String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  // ── Bill actions ──────────────────────────────────────────────────────────
  const toggleBillPaid = async (bill: Bill) => {
    if (bill.id == null) return;
    try {
      const db = await getDatabase();
      await db.runAsync(`UPDATE bills SET is_paid=? WHERE id=?`, [bill.is_paid ? 0 : 1, bill.id]);
      loadAll();
    } catch (e) {
      console.error('[Bills] togglePaid error:', e);
      Alert.alert('Could not update', 'Something went wrong. Please try again.');
    }
  };

  const deleteBill = (id: number) => {
    setConfirm({
      title: 'Delete this bill?',
      message: 'It will be removed from your bills list.',
      onConfirm: async () => {
        try {
          const db = await getDatabase();
          await db.runAsync(`DELETE FROM bills WHERE id=?`, [id]);
          loadAll();
        } catch (e) {
          console.error('[Bills] delete error:', e);
        }
      },
    });
  };

  // ── Subscription actions ──────────────────────────────────────────────────
  const toggleSubPaid = async (sub: Subscription) => {
    if (sub.id == null) return;
    try {
      const db = await getDatabase();
      await db.runAsync(`UPDATE subscriptions SET is_paid=? WHERE id=?`, [sub.is_paid ? 0 : 1, sub.id]);
      loadAll();
    } catch (e) {
      console.error('[Subscriptions] togglePaid error:', e);
      Alert.alert('Could not update', 'Something went wrong. Please try again.');
    }
  };

  const deleteSub = (id: number) => {
    setConfirm({
      title: 'Remove this subscription?',
      message: 'It will be removed from your subscriptions list.',
      onConfirm: async () => {
        try {
          const db = await getDatabase();
          await db.runAsync(`DELETE FROM subscriptions WHERE id=?`, [id]);
          loadAll();
        } catch (e) {
          console.error('[Subscriptions] delete error:', e);
        }
      },
    });
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const billsTotal  = bills.reduce((s, b) => s + b.amount, 0);
  const subsTotal   = subs.reduce((s, b) => s + b.amount, 0);
  const billsPaid   = bills.filter((b) => b.is_paid).reduce((s, b) => s + b.amount, 0);
  const subsPaid    = subs.filter((b) => b.is_paid).reduce((s, b) => s + b.amount, 0);
  const unpaidTotal = (billsTotal - billsPaid) + (subsTotal - subsPaid);

  const accentColor = modalType === 'subscription' ? C.subs : C.bills;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bills & Subscriptions</Text>
          <Text style={styles.headerSub}>{formatCurrency(unpaidTotal)} still due this cycle</Text>
        </View>
        <TouchableOpacity style={styles.headerAdd} onPress={() => openAdd('bill')}>
          <Ionicons name="add" size={22} color={C.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

        {(bills.length > 0 || subs.length > 0) && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Bills</Text>
              <Text style={[styles.summaryValue, { color: C.bills }]}>{formatCurrency(billsTotal)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Subscriptions</Text>
              <Text style={[styles.summaryValue, { color: C.subs }]}>{formatCurrency(subsTotal)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Still due</Text>
              <Text style={[styles.summaryValue, { color: unpaidTotal > 0 ? C.spending : C.income }]}>
                {formatCurrency(unpaidTotal)}
              </Text>
            </View>
          </View>
        )}

        {/* Bills section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>BILLS</Text>
          <TouchableOpacity onPress={() => openAdd('bill')}>
            <Text style={styles.sectionAdd}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {bills.length === 0 ? (
          <TouchableOpacity style={styles.emptyRow} onPress={() => openAdd('bill')}>
            <Ionicons name="receipt-outline" size={18} color={C.textHint} />
            <Text style={styles.emptyRowText}>No bills yet — tap to add one</Text>
          </TouchableOpacity>
        ) : (
          bills.map((item) => {
            const daysLeft = billDaysLeft(item);
            const urgent = daysLeft <= 3 && !item.is_paid;
            const color = item.is_paid ? C.income : urgent ? C.spending : C.bills;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { borderLeftColor: color }]}
                onPress={() => openEditBill(item)}
                activeOpacity={0.75}
              >
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: color, backgroundColor: item.is_paid ? color + '20' : 'transparent' }]}
                  onPress={() => toggleBillPaid(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {item.is_paid ? <Ionicons name="checkmark" size={16} color={C.income} /> : null}
                </TouchableOpacity>
                <View style={styles.cardMiddle}>
                  <Text style={[styles.cardName, !!item.is_paid && styles.paidText]}>{item.name}</Text>
                  <Text style={[styles.cardDue, urgent && { color: C.spending }]}>
                    {item.is_paid ? 'Paid this cycle' : billDueLabel(item)}
                  </Text>
                </View>
                <Text style={[styles.cardAmount, { color }, !!item.is_paid && styles.paidText]}>
                  {formatCurrency(item.amount)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Subscriptions section */}
        <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={styles.sectionTitle}>SUBSCRIPTIONS</Text>
          <TouchableOpacity onPress={() => openAdd('subscription')}>
            <Text style={styles.sectionAdd}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {subs.length === 0 ? (
          <TouchableOpacity style={styles.emptyRow} onPress={() => openAdd('subscription')}>
            <Ionicons name="repeat-outline" size={18} color={C.textHint} />
            <Text style={styles.emptyRowText}>No subscriptions yet — tap to add one</Text>
          </TouchableOpacity>
        ) : (
          subs.map((item) => {
            const days = getDaysUntil(item.billing_day);
            const urgent = days <= 3 && !item.is_paid;
            const color = item.is_paid ? C.income : urgent ? C.spending : C.subs;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { borderLeftColor: color }]}
                onPress={() => openEditSub(item)}
                activeOpacity={0.75}
              >
                <TouchableOpacity
                  style={[styles.checkbox, { borderColor: color, backgroundColor: item.is_paid ? color + '20' : 'transparent' }]}
                  onPress={() => toggleSubPaid(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {item.is_paid ? <Ionicons name="checkmark" size={16} color={C.income} /> : null}
                </TouchableOpacity>
                <View style={styles.cardMiddle}>
                  <Text style={[styles.cardName, !!item.is_paid && styles.paidText]}>{item.name}</Text>
                  <Text style={[styles.cardDue, urgent && { color: C.spending }]}>
                    {item.is_paid
                      ? 'Paid this cycle'
                      : days === 0 ? 'Charges today'
                      : days === 1 ? 'Charges tomorrow'
                      : `Charges in ${days} days`}
                    {!item.is_paid ? ` · ${ordinal(item.billing_day)} of month` : ''}
                  </Text>
                </View>
                <Text style={[styles.cardAmount, { color }, !!item.is_paid && styles.paidText]}>
                  {formatCurrency(item.amount)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>

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

      {/* Unified add/edit modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 32 }]}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>
                {editingBill ? 'Edit Bill' : editingSub ? 'Edit Subscription' : 'Add New'}
              </Text>

              {/* Type toggle — only shown when adding new */}
              {!editingBill && !editingSub && (
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, modalType === 'bill' && { borderColor: C.bills, backgroundColor: C.bills + '18' }]}
                    onPress={() => setModalType('bill')}
                  >
                    <Ionicons name="receipt-outline" size={16} color={modalType === 'bill' ? C.bills : C.textHint} />
                    <Text style={[styles.typeBtnText, modalType === 'bill' && { color: C.bills }]}>Bill</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, modalType === 'subscription' && { borderColor: C.subs, backgroundColor: C.subs + '18' }]}
                    onPress={() => setModalType('subscription')}
                  >
                    <Ionicons name="repeat-outline" size={16} color={modalType === 'subscription' ? C.subs : C.textHint} />
                    <Text style={[styles.typeBtnText, modalType === 'subscription' && { color: C.subs }]}>Subscription</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={[styles.modalInput, focusedField === 'name' && styles.modalInputFocused]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder={modalType === 'bill' ? 'e.g. Electricity, Car payment, Internet' : 'e.g. Netflix, Spotify, iCloud, Gym'}
                placeholderTextColor={C.textHint}
                autoCapitalize="words"
              />

              <Text style={styles.modalLabel}>Amount</Text>
              <View style={[styles.amountRow, focusedField === 'amount' && styles.amountRowFocused]}>
                <Text style={[styles.amountPrefix, { color: accentColor }]}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  onFocus={() => setFocusedField('amount')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textHint}
                />
              </View>

              {/* Bill-specific: frequency */}
              {modalType === 'bill' && (
                <>
                  <Text style={styles.modalLabel}>How often?</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, frequency === 'monthly' && styles.toggleActive]}
                      onPress={() => setFrequency('monthly')}
                    >
                      <Ionicons name="calendar-outline" size={18} color={frequency === 'monthly' ? C.primary : C.textHint} />
                      <Text style={[styles.toggleText, frequency === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, frequency === 'weekly' && styles.toggleActive]}
                      onPress={() => setFrequency('weekly')}
                    >
                      <Ionicons name="repeat-outline" size={18} color={frequency === 'weekly' ? C.primary : C.textHint} />
                      <Text style={[styles.toggleText, frequency === 'weekly' && styles.toggleTextActive]}>Weekly</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Day picker — monthly bill or subscription */}
              {(modalType === 'subscription' || (modalType === 'bill' && frequency === 'monthly')) && (
                <>
                  <Text style={styles.modalLabel}>
                    {modalType === 'subscription' ? 'Which day does it charge?' : 'Which day of the month?'}
                  </Text>
                  <Text style={styles.modalHint}>Tap the number</Text>
                  <View style={styles.dayGrid}>
                    {MONTH_DAYS.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayBtn, selectedDay === d && { backgroundColor: accentColor, borderColor: accentColor }]}
                        onPress={() => setSelectedDay(d)}
                      >
                        <Text style={[styles.dayBtnText, selectedDay === d && styles.dayBtnTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.selectedLabel}>
                    {modalType === 'subscription'
                      ? `Charges on the ${ordinal(selectedDay)} of each month`
                      : `Due on the ${ordinal(selectedDay)} of each month`}
                  </Text>
                </>
              )}

              {/* Weekday picker — weekly bill */}
              {modalType === 'bill' && frequency === 'weekly' && (
                <>
                  <Text style={styles.modalLabel}>Which day of the week?</Text>
                  <View style={styles.weekdayGrid}>
                    {WEEKDAY_SHORT.map((day, idx) => (
                      <TouchableOpacity
                        key={day}
                        style={[styles.weekdayBtn, selectedWeekday === idx && styles.weekdayBtnActive]}
                        onPress={() => setSelectedWeekday(idx)}
                      >
                        <Text style={[styles.weekdayText, selectedWeekday === idx && styles.weekdayTextActive]}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.selectedLabel}>Due every {WEEKDAY_NAMES[selectedWeekday]}</Text>
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>

              {(editingBill || editingSub) && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    setModalVisible(false);
                    if (editingBill?.id) deleteBill(editingBill.id);
                    else if (editingSub?.id) deleteSub(editingSub.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={C.spending} />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerBack: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter:   { flex: 1, paddingHorizontal: Spacing.sm },
    headerAdd: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.bills, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle:    { ...Typography.h2, color: C.textPrimary },
    headerSub:      { ...Typography.caption, color: C.textSecondary, marginTop: 4 },

    content:        { padding: Spacing.md },

    summaryBar: {
      flexDirection: 'row',
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
      marginBottom: Spacing.lg, overflow: 'hidden',
    },
    summaryItem:    { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 4 },
    summaryDivider: { width: 1, backgroundColor: C.border, marginVertical: Spacing.sm },
    summaryLabel:   { ...Typography.caption, color: C.textSecondary },
    summaryValue:   { ...Typography.bodyBold, fontSize: 15 },

    sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    sectionTitle:   { ...Typography.label, color: C.textHint, letterSpacing: 0.8 },
    sectionAdd:     { ...Typography.smallBold, color: C.primary },

    emptyRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      padding: Spacing.md, backgroundColor: C.bgCard,
      borderRadius: Radius.md, borderWidth: 1, borderColor: C.border,
      marginBottom: 8,
    },
    emptyRowText:   { ...Typography.small, color: C.textHint },

    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: 10,
      borderLeftWidth: 4, borderWidth: 1, borderColor: C.border,
    },
    checkbox: {
      width: 28, height: 28, borderRadius: 14,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    cardMiddle:   { flex: 1 },
    cardName:     { ...Typography.bodyBold, color: C.textPrimary },
    cardDue:      { ...Typography.caption, color: C.textSecondary, marginTop: 3 },
    cardAmount:   { ...Typography.bodyBold, fontSize: 17 },
    paidText:     { color: C.textHint, textDecorationLine: 'line-through' },

    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalCard:     { backgroundColor: C.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
    modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md },
    modalTitle:    { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.md },
    modalLabel:    { ...Typography.bodyBold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
    modalHint:     { ...Typography.caption, color: C.textHint, marginBottom: Spacing.sm },
    modalInput: {
      backgroundColor: C.bg, borderRadius: Radius.md,
      padding: Spacing.md, color: C.textPrimary,
      ...Typography.body, borderWidth: 1, borderColor: C.border,
    },

    typeRow:       { flexDirection: 'row', gap: 10, marginBottom: Spacing.sm },
    typeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, borderRadius: Radius.md,
      backgroundColor: C.bg, borderWidth: 2, borderColor: C.border,
    },
    typeBtnText:   { ...Typography.smallBold, color: C.textHint },

    amountRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bg, borderRadius: Radius.md,
      paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border,
    },
    amountPrefix:  { ...Typography.h2, marginRight: 6 },
    amountInput:   { flex: 1, ...Typography.h2, color: C.textPrimary, paddingVertical: 14 },

    toggleRow:     { flexDirection: 'row', gap: 10 },
    toggleBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: C.bg, borderRadius: Radius.md,
      paddingVertical: 16, borderWidth: 2, borderColor: C.border,
    },
    toggleActive:     { borderColor: C.primary, backgroundColor: C.primary + '18' },
    toggleText:       { ...Typography.bodyBold, color: C.textHint },
    toggleTextActive: { color: C.primary },

    dayGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    dayBtn: {
      width: 44, height: 44, borderRadius: Radius.sm,
      backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    dayBtnText:       { ...Typography.bodyBold, color: C.textSecondary },
    dayBtnTextActive: { color: C.textOnPrimary },

    weekdayGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    weekdayBtn: {
      paddingHorizontal: 14, paddingVertical: 14,
      borderRadius: Radius.md, backgroundColor: C.bg,
      borderWidth: 2, borderColor: C.border,
      minWidth: 60, alignItems: 'center',
    },
    weekdayBtnActive:   { borderColor: C.primary, backgroundColor: C.primary },
    weekdayText:        { ...Typography.bodyBold, color: C.textSecondary },
    weekdayTextActive:  { color: C.textOnPrimary },

    selectedLabel:  { ...Typography.bodyBold, color: C.income, marginTop: 12, textAlign: 'center' },
    modalInputFocused:  { borderColor: C.primary },
    amountRowFocused:   { borderColor: C.primary },

    saveBtn:        { marginTop: 28, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center' },
    saveBtnText:    { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    deleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginTop: Spacing.sm, paddingVertical: 16, borderRadius: Radius.md,
      backgroundColor: C.spending + '14', borderWidth: 1, borderColor: C.spending + '30',
    },
    deleteBtnText:  { ...Typography.bodyBold, color: C.spending },
    cancelBtn:      { marginTop: 10, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText:  { ...Typography.body, color: C.textSecondary },

    confirmOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
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
