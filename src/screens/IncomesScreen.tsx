import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency, formatDate, getMonthRange } from '../utils/helpers';
import { Income } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import UndoToast from '../components/UndoToast';

const QUICK_LABELS = ['Paycheck', 'Freelance', 'Cash', 'Gift', 'Side Job', 'Other'];

export default function IncomesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoData = useRef<Income | null>(null);
  const [actionIncome, setActionIncome] = useState<Income | null>(null);

  const loadIncomes = useCallback(async () => {
    try {
      const db = await getDatabase();
      const { start, end } = getMonthRange();
      const result = await db.getAllAsync<Income>(
        `SELECT * FROM income WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC`,
        [start, end]
      );
      setIncomes(result);
      setTotal(result.reduce((s, i) => s + i.amount, 0));
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadIncomes(); }, [loadIncomes]));

  const openEdit = (item: Income) => {
    setEditingIncome(item);
    setAmount(String(item.amount));
    setLabel(item.label ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Oops', 'Please enter a valid amount.');
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editingIncome?.id) {
        await db.runAsync(
          `UPDATE income SET amount=?, label=? WHERE id=?`,
          [parsed, label.trim() || 'Income', editingIncome.id]
        );
      }
      setModalVisible(false);
      loadIncomes();
    } catch {
      Alert.alert('Something went wrong', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteIncome = async (item: Income) => {
    if (!item.id) return;
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM income WHERE id = ?`, [item.id]);
      undoData.current = item;
      setUndoVisible(true);
      loadIncomes();
    } catch (e) {
      console.error('[Incomes] delete error:', e);
      Alert.alert('Could not delete', 'Something went wrong. Please try again.');
    }
  };

  const handleUndo = async () => {
    const item = undoData.current;
    if (!item) return;
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO income (amount, label, date) VALUES (?, ?, ?)`,
        [item.amount, item.label ?? 'Income', item.date]
      );
      loadIncomes();
    } catch {}
  };

  const showOptions = (item: Income) => {
    setActionIncome(item);
  };

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthName}</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        <Text style={styles.totalLabel}>total income this month</Text>
      </View>

      {incomes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="arrow-down-circle-outline" size={34} color={C.textHint} />
          </View>
          <Text style={styles.emptyText}>No income recorded yet</Text>
          <Text style={styles.emptySubText}>Tap the + button to add income.</Text>
        </View>
      ) : (
        <FlatList
          data={incomes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => showOptions(item)} activeOpacity={0.75}>
              <View style={styles.iconCircle}>
                <Ionicons name="arrow-down-circle-outline" size={22} color={C.income} />
              </View>
              <View style={styles.itemMiddle}>
                <Text style={styles.itemLabel}>{item.label || 'Income'}</Text>
                <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
              <Ionicons name="ellipsis-horizontal" size={16} color={C.textHint} />
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => navigation.navigate('AddIncome')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color={C.textOnPrimary} />
        <Text style={styles.fabText}>Add Income</Text>
      </TouchableOpacity>

      <UndoToast
        visible={undoVisible}
        message="Income entry deleted"
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
      />

      {/* Income action sheet */}
      <Modal visible={!!actionIncome} transparent animationType="slide" onRequestClose={() => setActionIncome(null)}>
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setActionIncome(null)} />
        <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.actionHandle} />
          <Text style={styles.actionTitle}>{actionIncome ? formatCurrency(actionIncome.amount) : ''}</Text>
          <Text style={styles.actionSub}>{actionIncome?.label || 'Income'}</Text>
          <TouchableOpacity
            style={styles.actionEditBtn}
            onPress={() => { setActionIncome(null); actionIncome && openEdit(actionIncome); }}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil-outline" size={18} color={C.income} />
            <Text style={styles.actionEditText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionDeleteBtn}
            onPress={() => { const item = actionIncome; setActionIncome(null); item && deleteIncome(item); }}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color={C.spending} />
            <Text style={styles.actionDeleteText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCancelBtn} onPress={() => setActionIncome(null)}>
            <Text style={styles.actionCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 32 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Edit Income</Text>

              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              <Text style={styles.fieldLabel}>Label</Text>
              <View style={styles.chipRow}>
                {QUICK_LABELS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.chip, label === q && styles.chipActive]}
                    onPress={() => setLabel(q)}
                  >
                    <Text style={[styles.chipText, label === q && styles.chipTextActive]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.textInput}
                value={label}
                onChangeText={setLabel}
                placeholder="Or type a custom label..."
                placeholderTextColor={C.textHint}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
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
    container:   { flex: 1, backgroundColor: C.bg },

    header: {
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
      backgroundColor: C.bgCard,
      borderBottomWidth: 1, borderBottomColor: C.border,
      alignItems: 'center',
    },
    backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: Spacing.sm },
    backText:   { ...Typography.small, color: C.textSecondary },
    monthLabel: { ...Typography.label, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs },
    totalAmount:{ ...Typography.hero, color: C.income },
    totalLabel: { ...Typography.small, color: C.textSecondary, marginTop: 4 },

    list:       { padding: Spacing.md },
    item: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: 10,
      borderWidth: 1, borderColor: C.border, gap: Spacing.sm,
    },
    iconCircle: {
      width: 46, height: 46, borderRadius: 12,
      backgroundColor: C.income + '14',
      alignItems: 'center', justifyContent: 'center',
    },
    itemMiddle: { flex: 1 },
    itemLabel:  { ...Typography.bodyBold, color: C.textPrimary },
    itemDate:   { ...Typography.caption, color: C.textHint, marginTop: 4 },
    itemAmount: { ...Typography.bodyBold, color: C.income, fontSize: 17 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    },
    emptyText:    { ...Typography.h3, color: C.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
    emptySubText: { ...Typography.small, color: C.textSecondary, textAlign: 'center', lineHeight: 24 },

    fab: {
      position: 'absolute', right: 24,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: C.income, borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg, paddingVertical: 14,
      shadowColor: C.income, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
    },
    fabText: { ...Typography.bodyBold, color: C.textOnPrimary },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalCard: {
      backgroundColor: C.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
      padding: Spacing.lg,
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md },
    modalTitle: { ...Typography.h3, color: C.textPrimary, marginBottom: Spacing.lg, textAlign: 'center' },

    fieldLabel: { ...Typography.label, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm, marginTop: Spacing.md },
    amountRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm },
    currencyPrefix: { ...Typography.h2, color: C.income, marginRight: 8 },
    amountInput:    { flex: 1, fontSize: 32, color: C.textPrimary, paddingVertical: 14, fontWeight: '700' },

    chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
    chip:          { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.full, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border },
    chipActive:    { backgroundColor: C.income + '20', borderColor: C.income },
    chipText:      { ...Typography.small, color: C.textSecondary },
    chipTextActive:{ color: C.income, fontWeight: '600' },
    textInput:     { backgroundColor: C.bgCard, borderRadius: Radius.md, padding: Spacing.md, color: C.textPrimary, fontSize: 16, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.sm },

    saveBtn:       { backgroundColor: C.income, borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.md },
    saveBtnText:   { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    cancelBtn:     { paddingVertical: Spacing.md, alignItems: 'center' },
    cancelBtnText: { ...Typography.small, color: C.textHint },

    actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    actionSheet: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    },
    actionHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md },
    actionTitle:     { ...Typography.h3, color: C.textPrimary, textAlign: 'center' },
    actionSub:       { ...Typography.small, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
    actionEditBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.income + '14', borderRadius: Radius.lg,
      paddingVertical: 18, marginBottom: Spacing.sm,
      borderWidth: 1, borderColor: C.income + '30',
    },
    actionEditText:   { ...Typography.bodyBold, color: C.income, fontSize: 17 },
    actionDeleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.spending + '14', borderRadius: Radius.lg,
      paddingVertical: 18, marginBottom: Spacing.sm,
      borderWidth: 1, borderColor: C.spending + '30',
    },
    actionDeleteText: { ...Typography.bodyBold, color: C.spending, fontSize: 17 },
    actionCancelBtn:  { paddingVertical: Spacing.md, alignItems: 'center' },
    actionCancelText: { ...Typography.body, color: C.textHint },
  });
}
