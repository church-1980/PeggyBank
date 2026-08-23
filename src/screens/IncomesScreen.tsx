import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  pendingIncome, confirmIncome, activeSchedules, updateSchedule, deactivateSchedule,
  describeSchedule, nextOccurrence, type ExpectedIncome, type IncomeSchedule,
} from '../lib/incomeSchedules';
import { parseLocalDate, localDateString, localMonthRange } from '../core/datetime';
import PeggyCard from '../components/peggy/PeggyCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconBadge from '../components/IconBadge';
import { getDatabase } from '../database/database';
import { formatCurrency, formatDate} from '../utils/helpers';
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

  // Paydays the user told us to expect that have not been answered yet. These
  // are NOT income and are not counted anywhere: they are questions.
  const [expected, setExpected] = useState<ExpectedIncome[]>([]);
  const [confirming, setConfirming] = useState<ExpectedIncome | null>(null);
  const [confirmAmount, setConfirmAmount] = useState('');

  // The regular-income setup itself. Before this existed a schedule could be
  // created and then never changed: a raise, a new payday or a typo meant
  // starting over, which is what made income feel locked after setup.
  const [schedules, setSchedules] = useState<IncomeSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<IncomeSchedule | null>(null);
  const [schedAmount, setSchedAmount] = useState('');
  const [undoVisible, setUndoVisible] = useState(false);
  const undoData = useRef<Income | null>(null);
  const [actionIncome, setActionIncome] = useState<Income | null>(null);

  // Which month is on screen. This list used to query getMonthRange() -- always
  // the CURRENT month -- so income from any earlier month was never loaded at
  // all. It was not hidden behind a button; it was unreachable, which meant a
  // pay recorded last month could never be corrected.
  const [monthOffset, setMonthOffset] = useState(0);

  const loadIncomes = useCallback(async () => {
    try {
      const db = await getDatabase();
      const now = new Date();
      const viewing = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const { start, end } = localMonthRange(viewing);
      const result = await db.getAllAsync<Income>(
        `SELECT * FROM income WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC`,
        [start, end]
      );
      setIncomes(result);
      setTotal(result.reduce((s, i) => s + i.amount, 0));
    } catch {}
  }, [monthOffset]);

  const loadExpected = useCallback(async () => {
    try {
      const db = await getDatabase();
      setExpected(await pendingIncome(db));
      setSchedules(await activeSchedules(db));
    } catch { setExpected([]); setSchedules([]); }
  }, []);

  const openScheduleEdit = (s: IncomeSchedule) => {
    setEditingSchedule(s);
    setSchedAmount(String(s.amount));
  };

  /**
   * Changes what is normally EXPECTED from here on. Deliberately separate from
   * confirming a single pay: one short week is not a pay cut, so correcting a
   * paycheck must never redefine normal pay.
   */
  const saveScheduleAmount = async () => {
    if (!editingSchedule) return;
    const parsed = parseFloat(schedAmount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('How much is it normally?', 'Enter the amount you usually expect.');
      return;
    }
    try {
      const db = await getDatabase();
      await updateSchedule(db, editingSchedule.id, { amount: parsed });
      setEditingSchedule(null);
      loadExpected();
    } catch {
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    }
  };

  const stopSchedule = (s: IncomeSchedule) => {
    Alert.alert(
      'Stop expecting this?',
      'We will stop forecasting ' + s.label + '. Pay you have already recorded is kept.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await deactivateSchedule(db, s.id);
              setEditingSchedule(null);
              loadExpected();
            } catch { Alert.alert('Could not stop', 'Please try again.'); }
          },
        },
      ]
    );
  };

  /** "in 5 days", "today", "tomorrow" — how far off the next pay is. */
  const daysAway = (iso: string) => {
    const today = parseLocalDate(localDateString(new Date()));
    const n = Math.round((parseLocalDate(iso).getTime() - today.getTime()) / 86400000);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n < 0) return 'overdue';
    return 'in ' + n + ' days';
  };

  useFocusEffect(useCallback(() => { loadIncomes(); loadExpected(); }, [loadIncomes, loadExpected]));

  const openConfirm = (item: ExpectedIncome) => {
    setConfirming(item);
    setConfirmAmount(String(item.expectedAmount));   // an estimate to correct, not an answer
  };

  const submitConfirm = async () => {
    if (!confirming) return;
    const parsed = parseFloat(confirmAmount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('How much was it?', 'Enter the amount you were actually paid.');
      return;
    }
    try {
      const db = await getDatabase();
      await confirmIncome(db, confirming.schedule, confirming.cycleDate, parsed);
      setConfirming(null);
      loadIncomes();
      loadExpected();
    } catch {
      Alert.alert('Could not save', 'Something went wrong recording that. Please try again.');
    }
  };

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

  // Names the month being VIEWED, which is not necessarily this one.
  const viewedMonthName = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <PeggyScreen scroll={false} padded={false} contentStyle={styles.shell}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => setMonthOffset(m => m - 1)}
            accessibilityRole="button"
            accessibilityLabel="Show the previous month"
          >
            <Ionicons name="chevron-back" size={20} color={C.income} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{viewedMonthName}</Text>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => setMonthOffset(m => Math.min(0, m + 1))}
            disabled={monthOffset === 0}
            accessibilityRole="button"
            accessibilityLabel="Show the next month"
            accessibilityState={{ disabled: monthOffset === 0 }}
          >
            <Ionicons name="chevron-forward" size={20} color={monthOffset === 0 ? C.border : C.income} />
          </TouchableOpacity>
        </View>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        <Text style={styles.totalLabel}>
          {monthOffset === 0 ? 'total income this month' : 'total income that month'}
        </Text>
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

      {schedules.length > 0 && (
        <View style={styles.expectedWrap}>
          <Text style={styles.expectedHeading}>Regular income</Text>
          <Text style={styles.expectedSub}>What you normally expect. Tap to change it.</Text>
          {schedules.map(s => (
            <PeggyCard key={'sched' + s.id} style={styles.expectedCard} onPress={() => openScheduleEdit(s)}>
              <View style={styles.expectedRow}>
                <PeggyIconFrame iconKey="recurring" size="card" shape="circle" style={{ marginRight: 12 }} />
                <View style={styles.itemMiddle}>
                  <Text style={styles.itemLabel}>{s.label}</Text>
                  <Text style={styles.itemDate}>
                    {describeSchedule(s)} · Next pay {formatDate(nextOccurrence(s))} ({daysAway(nextOccurrence(s))})
                  </Text>
                </View>
                <Text style={styles.expectedAmount}>~{formatCurrency(s.amount)}</Text>
              </View>
            </PeggyCard>
          ))}
        </View>
      )}

      {expected.length > 0 && (
        <View style={styles.expectedWrap}>
          <Text style={styles.expectedHeading}>Expected</Text>
          <Text style={styles.expectedSub}>Not counted yet — tell us when it arrives.</Text>
          {expected.slice(0, 4).map(item => (
            <PeggyCard key={item.schedule.id + '|' + item.cycleDate} style={styles.expectedCard}>
              <View style={styles.expectedRow}>
                <PeggyIconFrame iconKey="payday" size="card" shape="circle" style={{ marginRight: 12 }} />
                <View style={styles.itemMiddle}>
                  <Text style={styles.itemLabel}>{item.schedule.label}</Text>
                  <Text style={styles.itemDate}>
                    {item.due ? 'Was due ' : 'Coming '}{formatDate(item.cycleDate)}
                  </Text>
                </View>
                <Text style={styles.expectedAmount}>~{formatCurrency(item.expectedAmount)}</Text>
              </View>
              {item.due ? (
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => openConfirm(item)}
                  accessibilityRole="button"
                  accessibilityLabel={'Record that ' + item.schedule.label + ' arrived on ' + formatDate(item.cycleDate)}
                >
                  <Text style={styles.confirmBtnText}>Did this arrive?</Text>
                </TouchableOpacity>
              ) : null}
            </PeggyCard>
          ))}
        </View>
      )}

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

      <Modal visible={!!confirming} transparent animationType="slide" onRequestClose={() => setConfirming(null)}>
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setConfirming(null)} />
        <View style={styles.confirmSheet}>
          <Text style={styles.confirmTitle}>
            {confirming ? confirming.schedule.label : ''}
          </Text>
          <Text style={styles.confirmSub}>
            How much did you actually get paid? Change it if it was different this time.
          </Text>
          <View style={styles.confirmInputRow}>
            <Text style={styles.confirmPrefix}>$</Text>
            <TextInput
              style={styles.confirmInput}
              value={confirmAmount}
              onChangeText={setConfirmAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={C.textHint}
              selectTextOnFocus
              accessibilityLabel="Amount you were actually paid"
            />
          </View>
          <TouchableOpacity
            style={styles.confirmSave}
            onPress={submitConfirm}
            accessibilityRole="button"
            accessibilityLabel="Record this payment"
          >
            <Text style={styles.confirmSaveText}>Yes, I got paid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmCancel}
            onPress={() => setConfirming(null)}
            accessibilityRole="button"
            accessibilityLabel="Not yet, close this"
          >
            <Text style={styles.confirmCancelText}>Not yet</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={!!editingSchedule} transparent animationType="slide" onRequestClose={() => setEditingSchedule(null)}>
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setEditingSchedule(null)} />
        <View style={styles.confirmSheet}>
          <Text style={styles.confirmTitle}>{editingSchedule ? editingSchedule.label : ''}</Text>
          <Text style={styles.confirmSub}>
            {editingSchedule ? describeSchedule(editingSchedule) : ''}. This is what you NORMALLY expect —
            changing it affects pays from now on, not ones you have already recorded.
          </Text>
          <View style={styles.confirmInputRow}>
            <Text style={styles.confirmPrefix}>$</Text>
            <TextInput
              style={styles.confirmInput}
              value={schedAmount}
              onChangeText={setSchedAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={C.textHint}
              selectTextOnFocus
              accessibilityLabel="Amount you normally expect to be paid"
            />
          </View>
          <TouchableOpacity
            style={styles.confirmSave}
            onPress={saveScheduleAmount}
            accessibilityRole="button"
            accessibilityLabel="Save the normal pay amount"
          >
            <Text style={styles.confirmSaveText}>Update future pays</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmCancel}
            onPress={() => editingSchedule && stopSchedule(editingSchedule)}
            accessibilityRole="button"
            accessibilityLabel={'Stop expecting ' + (editingSchedule ? editingSchedule.label : 'this income')}
          >
            <Text style={styles.stopText}>Stop expecting this</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmCancel}
            onPress={() => setEditingSchedule(null)}
            accessibilityRole="button"
            accessibilityLabel="Close without changing anything"
          >
            <Text style={styles.confirmCancelText}>Cancel</Text>
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

    // Expected income. PeggyCard owns the surface, radius and shadow; only
    // layout and the tones that mark this as "not money yet" live here.
    expectedWrap:    { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
    expectedHeading: { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6 },
    expectedSub:     { ...Typography.caption, color: C.textSecondary, marginTop: 2, marginBottom: Spacing.sm },
    expectedCard:    { marginBottom: Spacing.sm },
    expectedRow:     { flexDirection: 'row', alignItems: 'center' },
    // Tilde and a softer tone: this is an estimate, not a balance.
    expectedAmount:  { ...Typography.bodyBold, color: C.textSecondary },
    confirmBtn: {
      minHeight: 48, borderRadius: Radius.md, marginTop: Spacing.sm,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.income,
    },
    confirmBtnText:  { ...Typography.body, color: C.income, fontWeight: '700' },

    confirmSheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: C.bgCard,
      borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
      padding: Spacing.lg,
    },
    confirmTitle:    { ...Typography.h3, color: C.textPrimary },
    confirmSub:      { ...Typography.helper, color: C.textSecondary, marginTop: 4, marginBottom: Spacing.md, lineHeight: 19 },
    confirmInputRow: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: C.border, borderRadius: Radius.md,
      paddingHorizontal: Spacing.md, minHeight: 56,
    },
    confirmPrefix:   { ...Typography.h3, color: C.textSecondary, marginRight: 6 },
    confirmInput:    { flex: 1, ...Typography.h3, color: C.textPrimary, paddingVertical: 8 },
    confirmSave: {
      minHeight: 56, borderRadius: Radius.md, backgroundColor: C.income,
      alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md,
    },
    confirmSaveText: { ...Typography.bodyBold, color: C.textOnPrimary },
    confirmCancel:   { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
    confirmCancelText: { ...Typography.body, color: C.textSecondary },
    stopText:          { ...Typography.body, color: C.danger, fontWeight: '600' },

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
    monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    monthNavBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
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
