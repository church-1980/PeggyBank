import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { CATEGORIES } from '../data/categories';
import { formatCurrency, formatDate, getMonthRange } from '../utils/helpers';
import { Expense, Category } from '../types';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import UndoToast from '../components/UndoToast';

export default function ExpensesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [undoVisible, setUndoVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const undoData = useRef<Expense | null>(null);

  const loadExpenses = useCallback(async () => {
    try {
      const db = await getDatabase();
      const { start, end } = getMonthRange();
      const result = await db.getAllAsync<Expense>(
        `SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC, id DESC`,
        [start, end]
      );
      setExpenses(result);
      setTotal(result.reduce((sum, e) => sum + e.amount, 0));
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadExpenses(); }, [loadExpenses]));

  const deleteExpense = async (item: Expense) => {
    if (!item.id) return;
    setSelectedExpense(null);
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [item.id]);
      undoData.current = item;
      setUndoVisible(true);
      loadExpenses();
    } catch (e) {
      console.error('[Expenses] delete error:', e);
      Alert.alert('Could not delete', 'Something went wrong. Please try again.');
    }
  };


  const handleUndo = async () => {
    const item = undoData.current;
    if (!item) return;
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO expenses (amount, category, note, date, photo_uri, is_recurring) VALUES (?, ?, ?, ?, ?, ?)`,
        [item.amount, item.category, item.note ?? null, item.date, item.photo_uri ?? null, item.is_recurring ?? 0]
      );
      loadExpenses();
    } catch {}
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const catInfo = CATEGORIES[item.category as Category] ?? CATEGORIES.other;
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => setSelectedExpense(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconCircle, { backgroundColor: catInfo.color + '18' }]}>
          <Ionicons name={catInfo.icon} size={20} color={catInfo.color} />
        </View>
        <View style={styles.itemMiddle}>
          <Text style={styles.itemCategory}>{catInfo.label}</Text>
          {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
          <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
        <Ionicons name="ellipsis-horizontal" size={16} color={C.textHint} />
      </TouchableOpacity>
    );
  };

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Info for the selected expense's category
  const selCatInfo = selectedExpense
    ? CATEGORIES[selectedExpense.category as Category] ?? CATEGORIES.other
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddExpense', { returnTo: 'Spending' })}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={C.textOnPrimary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        <Text style={styles.totalLabel}>total spent this month</Text>
      </View>

      {expenses.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={34} color={C.textHint} />
          </View>
          <Text style={styles.emptyText}>Nothing recorded yet</Text>
          <Text style={styles.emptySubText}>Tap the + button to add your first expense.</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        />
      )}

      <UndoToast
        visible={undoVisible}
        message="Expense deleted"
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
      />

      {/* Expense options bottom sheet */}
      <Modal
        visible={!!selectedExpense}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExpense(null)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setSelectedExpense(null)}
        />
        {selectedExpense && selCatInfo && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            {/* Expense summary */}
            <View style={styles.sheetSummary}>
              <View style={[styles.sheetIconWrap, { backgroundColor: selCatInfo.color + '18' }]}>
                <Ionicons name={selCatInfo.icon} size={28} color={selCatInfo.color} />
              </View>
              <View style={styles.sheetSummaryText}>
                <Text style={styles.sheetCategory}>{selCatInfo.label}</Text>
                {selectedExpense.note ? (
                  <Text style={styles.sheetNote}>{selectedExpense.note}</Text>
                ) : null}
                <Text style={styles.sheetDate}>{formatDate(selectedExpense.date)}</Text>
              </View>
              <Text style={[styles.sheetAmount, { color: selCatInfo.color }]}>
                {formatCurrency(selectedExpense.amount)}
              </Text>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.sheetEditBtn}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedExpense(null);
                navigation.navigate('AddExpense', {
                  id: selectedExpense.id,
                  category: selectedExpense.category,
                  amount: selectedExpense.amount,
                  note: selectedExpense.note,
                });
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={C.textOnPrimary} />
              <Text style={styles.sheetEditBtnText}>Edit Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetDeleteBtn}
              activeOpacity={0.85}
              onPress={() => deleteExpense(selectedExpense)}
            >
              <Ionicons name="trash-outline" size={20} color={C.spending} />
              <Text style={styles.sheetDeleteBtnText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setSelectedExpense(null)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    header: {
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.lg,
      backgroundColor: C.bgCard,
      borderBottomWidth: 1, borderBottomColor: C.border,
      alignItems: 'center',
    },
    headerTop: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', marginBottom: Spacing.sm,
    },
    monthLabel:   { ...Typography.label, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: C.primary, borderRadius: Radius.full,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    addBtnText:   { ...Typography.smallBold, color: C.textOnPrimary },
    totalAmount:  { ...Typography.hero, color: C.spending },
    totalLabel:   { ...Typography.small, color: C.textSecondary, marginTop: 4 },

    list:         { padding: Spacing.md },
    item: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: 10,
      borderWidth: 1, borderColor: C.border,
      gap: Spacing.sm,
    },
    iconCircle:   { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    itemMiddle:   { flex: 1 },
    itemCategory: { ...Typography.bodyBold, color: C.textPrimary },
    itemNote:     { ...Typography.small, color: C.textSecondary, marginTop: 2 },
    itemDate:     { ...Typography.caption, color: C.textHint, marginTop: 4 },
    itemAmount:   { ...Typography.bodyBold, color: C.textPrimary, fontSize: 17 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyIcon: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: C.bgCard,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border,
    },
    emptyText:    { ...Typography.h3, color: C.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
    emptySubText: { ...Typography.small, color: C.textSecondary, textAlign: 'center', lineHeight: 24 },

    // Bottom sheet
    sheetOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.lg,
    },

    sheetSummary: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border, gap: Spacing.md,
    },
    sheetIconWrap: {
      width: 52, height: 52, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    sheetSummaryText: { flex: 1 },
    sheetCategory:    { ...Typography.bodyBold, color: C.textPrimary, fontSize: 17 },
    sheetNote:        { ...Typography.small, color: C.textSecondary, marginTop: 3 },
    sheetDate:        { ...Typography.caption, color: C.textHint, marginTop: 4 },
    sheetAmount:      { ...Typography.h2, fontSize: 22 },

    sheetEditBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.primary, borderRadius: Radius.lg,
      paddingVertical: 18, marginBottom: Spacing.sm,
    },
    sheetEditBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },

    sheetDeleteBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.spending + '14', borderRadius: Radius.lg,
      paddingVertical: 18, marginBottom: Spacing.sm,
      borderWidth: 1.5, borderColor: C.spending + '40',
    },
    sheetDeleteBtnText: { ...Typography.bodyBold, color: C.spending, fontSize: 17 },

    sheetCancelBtn: {
      paddingVertical: Spacing.md, alignItems: 'center',
    },
    sheetCancelText: { ...Typography.body, color: C.textHint },
  });
}
