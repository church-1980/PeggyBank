import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from '../components/IconBadge';
import { getDatabase } from '../database/database';
import { formatCurrency, formatDate, getMonthRange } from '../utils/helpers';
import { Income } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { useCustomLogos } from '../context/CustomLogoContext';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import UndoToast from '../components/UndoToast';
import PeggyScreen from '../components/peggy/PeggyScreen';


export default function IncomesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { logoFor } = useCustomLogos();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
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

  // Editing opens the SAME form used to add income, so every field is
  // available -- above all the date. The old inline modal could only change the
  // amount and the label, which left a wrong date impossible to correct.
  const openEdit = (item: Income) => {
    navigation.navigate('AddIncome', {
      id: item.id, amount: item.amount, label: item.label ?? '', date: item.date,
    });
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
    <PeggyScreen scroll={false} padded={false} contentStyle={styles.shell}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthName}</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        <Text style={styles.totalLabel}>total income this month</Text>
      </View>

      {/* Payday Planner lives here — one home for "money coming in" instead of a
          separate tile that quietly logged paychecks into this same list. */}
      <TouchableOpacity
        style={styles.plannerCard}
        onPress={() => navigation.navigate('Payday')}
        activeOpacity={0.75}
      >
        <IconBadge iconKey="payday" color={C.income} size={56} tinted={false} />
        <View style={styles.plannerMiddle}>
          <Text style={styles.plannerTitle}>Payday Planner</Text>
          <Text style={styles.plannerSub}>Plan how to split your next paycheck</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textHint} />
      </TouchableOpacity>

      {incomes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <IconBadge iconKey="income" color={C.textHint} size={56} iconSize={40} tinted={false} />
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
              <PeggyIconFrame iconKey="income" size="card" shape="circle" overrideSource={logoFor(item.label) ? { uri: logoFor(item.label) } : undefined} style={{ marginRight: 12 }} />
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

    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    // PeggyScreen owns the background and safe-area insets.
    // paddingBottom is zeroed: this screen supplies its own.
    shell:   { flex: 1, paddingBottom: 0 },

    header: {
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg,
      backgroundColor: C.bgCard,
      borderBottomWidth: 1, borderBottomColor: C.border,
      alignItems: 'center',
    },
    plannerCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2,
      marginHorizontal: Spacing.md, marginTop: Spacing.md,
      padding: Spacing.md,
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      borderWidth: 1, borderColor: C.border,
    },
    plannerMiddle: { flex: 1 },
    plannerTitle:  { ...Typography.bodyBold, color: C.textPrimary },
    plannerSub:    { ...Typography.caption, color: C.textSecondary, marginTop: 2 },

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
