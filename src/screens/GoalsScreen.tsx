import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UndoToast from '../components/UndoToast';
import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency } from '../utils/helpers';
import { SavingsGoal } from '../types';
import { GOAL_TYPES, GoalType } from '../data/goalTypes';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

function ProgressBar({ pct, color, borderColor }: { pct: number; color: string; borderColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ height: 8, backgroundColor: borderColor, borderRadius: 4, overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 4, width, backgroundColor: color }} />
    </View>
  );
}


export default function GoalsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionGoal, setActionGoal] = useState<SavingsGoal | null>(null);
  const [addingMode, setAddingMode] = useState<'new' | 'deposit'>('new');
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('other');
  const [pinned, setPinned] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoData = useRef<SavingsGoal | null>(null);

  const loadGoals = useCallback(async () => {
    const db = await getDatabase();
    const result = await db.getAllAsync<SavingsGoal>(
      `SELECT * FROM savings_goals ORDER BY created_at DESC`
    );
    setGoals(result);
  }, []);

  useFocusEffect(useCallback(() => { loadGoals(); }, [loadGoals]));

  useEffect(() => {
    if (route?.params?.autoOpen) openNewGoalModal();
  }, []);

  const openNewGoalModal = () => {
    setAddingMode('new');
    setName('');
    setTarget('');
    setDeadline('');
    setGoalType('other');
    setPinned(false);
    setModalVisible(true);
  };

  const openDepositModal = (goal: SavingsGoal) => {
    setAddingMode('deposit');
    setSelectedGoal(goal);
    setDepositAmount('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const db = await getDatabase();
      if (addingMode === 'new') {
        const t = parseFloat(target);
        if (!name.trim() || isNaN(t) || t <= 0) {
          Alert.alert('Oops', 'Please enter a goal name and a target amount.');
          setSaving(false);
          return;
        }
        await db.runAsync(
          `INSERT INTO savings_goals (name, target_amount, current_amount, deadline, goal_type, pinned) VALUES (?, ?, 0, ?, ?, ?)`,
          [name.trim(), t, deadline.trim() || null, goalType, pinned ? 1 : 0]
        );
        console.log('[Goals] created goal:', name.trim(), 'target:', t);
      } else if (selectedGoal?.id != null) {
        const d = parseFloat(depositAmount);
        if (isNaN(d) || d <= 0) {
          Alert.alert('Oops', 'Please enter a valid amount.');
          setSaving(false);
          return;
        }
        await db.runAsync(
          `UPDATE savings_goals SET current_amount = MIN(target_amount, current_amount + ?) WHERE id = ?`,
          [d, selectedGoal.id]
        );
        console.log('[Goals] deposit $' + d + ' to goal id', selectedGoal.id);
      }
      setModalVisible(false);
      loadGoals();
    } catch (e) {
      console.error('[Goals] save error:', e);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (goal: SavingsGoal) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE savings_goals SET pinned = ? WHERE id = ?`,
        [goal.pinned ? 0 : 1, goal.id!]
      );
      setActionGoal(null);
      loadGoals();
    } catch (e) {
      console.error('[Goals] pin error:', e);
    }
  };

  const deleteGoal = async (id: number) => {
    const goal = goals.find(g => g.id === id) ?? null;
    try {
      const db = await getDatabase();
      await db.runAsync(`DELETE FROM savings_goals WHERE id = ?`, [id]);
      undoData.current = goal;
      setActionGoal(null);
      setUndoVisible(true);
      loadGoals();
    } catch (e) {
      console.error('[Goals] delete error:', e);
      Alert.alert('Could not delete', 'Something went wrong. Please try again.');
    }
  };

  const handleUndo = async () => {
    const g = undoData.current;
    if (!g) return;
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO savings_goals (name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?)`,
        [g.name, g.target_amount, g.current_amount, g.deadline ?? null]
      );
      loadGoals();
    } catch (e) {
      console.error('[Goals] undo error:', e);
    }
  };

  const renderGoal = ({ item }: { item: SavingsGoal }) => {
    const pct = item.target_amount > 0
      ? Math.min(100, Math.round((item.current_amount / item.target_amount) * 100))
      : 0;
    const remaining = Math.max(0, item.target_amount - item.current_amount);
    const done = pct >= 100;

    const typeKey  = (item.goal_type ?? 'other') as import('../data/goalTypes').GoalType;
    const typeInfo = GOAL_TYPES[typeKey] ?? GOAL_TYPES.other;
    const accent   = typeInfo.color;

    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: accent + '30' }]}
        onPress={() => setActionGoal(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          {/* Goal type icon — specific to type, not generic flag */}
          <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
            <Ionicons
              name={done ? 'checkmark-circle' : typeInfo.icon}
              size={20}
              color={accent}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.goalName} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.pct, { color: accent }]}>{pct}%</Text>
            </View>
            <Text style={[styles.typeLabel, { color: accent }]}>{typeInfo.label}</Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <ProgressBar pct={pct} color={accent} borderColor={C.border} />
        </View>

        <View style={styles.amountsRow}>
          <Text style={[styles.savedAmount, { color: accent }]}>
            {formatCurrency(item.current_amount)}
          </Text>
          <Text style={styles.targetAmount}>
            {'of ' + formatCurrency(item.target_amount)}
            {remaining > 0 ? '  ·  ' + formatCurrency(remaining) + ' to go' : ''}
          </Text>
        </View>

        {done ? (
          <View style={[styles.completeBanner, { backgroundColor: accent + '14', borderColor: accent + '30' }]}>
            <Ionicons name="ribbon-outline" size={15} color={accent} />
            <Text style={[styles.completeText, { color: accent }]}>Goal reached — well done.</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addMoneyBtn, { borderColor: accent + '50' }]}
            onPress={() => openDepositModal(item)}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={14} color={accent} />
            <Text style={[styles.addMoneyText, { color: accent }]}>Add Money</Text>
          </TouchableOpacity>
        )}

      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Savings Goals</Text>
        <TouchableOpacity style={styles.addBtn2} onPress={openNewGoalModal}>
          <Ionicons name="add" size={22} color={C.textOnPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGoal}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="flag-outline" size={36} color={C.textHint} />
            </View>
            <Text style={styles.emptyText}>No savings goals yet</Text>
            <Text style={styles.emptySubText}>
              Start with something small. Every step forward counts.
            </Text>
            <TouchableOpacity style={styles.emptyCta} onPress={openNewGoalModal}>
              <Ionicons name="add" size={16} color={C.textOnPrimary} />
              <Text style={styles.emptyCtaText}>Create First Goal</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {addingMode === 'new' ? 'New Savings Goal' : `Add to "${selectedGoal?.name}"`}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {addingMode === 'new' ? (
              <>
                <Text style={styles.modalLabel}>Goal Type</Text>
                <View style={styles.goalTypeGrid}>
                  {(Object.entries(GOAL_TYPES) as [GoalType, typeof GOAL_TYPES[GoalType]][]).map(([key, info]) => {
                    const active = goalType === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.goalTypeChip,
                          active
                            ? { backgroundColor: info.color + '22', borderColor: info.color + '80' }
                            : { backgroundColor: C.bgCard, borderColor: C.border },
                        ]}
                        onPress={() => setGoalType(key)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.goalTypeEmoji}>{info.emoji}</Text>
                        <Text style={[styles.goalTypeLabel, active && { color: C.textPrimary, fontWeight: '700' }]}
                          numberOfLines={1}>
                          {info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Goal Name</Text>
                <TextInput
                  style={[styles.modalInput, focusedField === 'name' && styles.modalInputFocused]}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Emergency Fund, Vacation, Car"
                  placeholderTextColor={C.textHint}
                />
                <Text style={styles.modalLabel}>Target Amount</Text>
                <TextInput
                  style={[styles.modalInput, focusedField === 'target' && styles.modalInputFocused]}
                  value={target}
                  onChangeText={setTarget}
                  onFocus={() => setFocusedField('target')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textHint}
                />
                <Text style={styles.modalLabel}>Target Date (optional)</Text>
                <TextInput
                  style={[styles.modalInput, focusedField === 'deadline' && styles.modalInputFocused]}
                  value={deadline}
                  onChangeText={setDeadline}
                  onFocus={() => setFocusedField('deadline')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. Dec 2025"
                  placeholderTextColor={C.textHint}
                />

                {/* Pin to Dashboard toggle */}
                <TouchableOpacity
                  style={[styles.pinRow, pinned && { borderColor: C.primary + '60', backgroundColor: C.primary + '0E' }]}
                  onPress={() => setPinned(!pinned)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.pinIconWrap, { backgroundColor: pinned ? C.primary + '22' : C.bgCard }]}>
                    <Ionicons name={pinned ? 'pin' : 'pin-outline'} size={18} color={pinned ? C.primary : C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pinLabel, pinned && { color: C.primary }]}>Pin to Dashboard</Text>
                    <Text style={styles.pinSub}>Show progress card on your home screen</Text>
                  </View>
                  <View style={[styles.pinToggle, { backgroundColor: pinned ? C.primary : C.border }]}>
                    <View style={[styles.pinThumb, { transform: [{ translateX: pinned ? 18 : 2 }] }]} />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>How much are you adding?</Text>
                <TextInput
                  style={[styles.modalInput, focusedField === 'deposit' && styles.modalInputFocused]}
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  onFocus={() => setFocusedField('deposit')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textHint}
                  autoFocus
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.modalSave, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.modalSaveText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <UndoToast
        visible={undoVisible}
        message="Goal deleted"
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
      />

      {/* Action sheet — tap any goal card to open */}
      <Modal visible={!!actionGoal} transparent animationType="slide" onRequestClose={() => setActionGoal(null)}>
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setActionGoal(null)} />
        <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.actionTitle}>{actionGoal?.name}</Text>
          {actionGoal && !( Math.min(100, Math.round((actionGoal.current_amount / actionGoal.target_amount) * 100)) >= 100) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setActionGoal(null); openDepositModal(actionGoal); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-outline" size={20} color={C.goals} />
              <Text style={[styles.actionBtnText, { color: C.goals }]}>Add Money</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => actionGoal && togglePin(actionGoal)}
            activeOpacity={0.8}
          >
            <Ionicons name={actionGoal?.pinned ? 'pin' : 'pin-outline'} size={20} color={C.primary} />
            <Text style={[styles.actionBtnText, { color: C.primary }]}>
              {actionGoal?.pinned ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnDestructive}
            onPress={() => actionGoal?.id && deleteGoal(actionGoal.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={C.spending} />
            <Text style={[styles.actionBtnText, { color: C.spending }]}>Delete Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCancel} onPress={() => setActionGoal(null)}>
            <Text style={styles.actionCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.md,
    },
    backBtn: {
      width: 36, height: 36,
      borderRadius: 18,
      backgroundColor: C.bgCard,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    title: { ...Typography.h2, color: C.textPrimary },

    list: { padding: Spacing.md, paddingBottom: 110 },

    card: {
      backgroundColor: C.bgCard,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.md,
      borderWidth: 1.5,
    },
    cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
    iconWrap:    { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    nameRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    goalName:    { ...Typography.bodyBold, color: C.textPrimary, flex: 1 },
    typeLabel:   { ...Typography.caption, fontWeight: '600', marginTop: 2 },
    pct:         { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },
    progressWrap: { marginBottom: Spacing.sm },

    amountsRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
    savedAmount: { ...Typography.smallBold },
    targetAmount:{ ...Typography.caption, color: C.textHint, flex: 1 },

    addMoneyBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
      paddingVertical: 9,
      borderRadius: Radius.md, borderWidth: 1,
      marginTop: 2,
    },
    addMoneyText: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },

    completeBanner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      borderRadius: Radius.sm, borderWidth: 1,
      padding: Spacing.sm, marginTop: 2,
    },
    completeText: { ...Typography.smallBold },

    empty: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, marginTop: 60 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: C.bgElevated,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: Spacing.lg,
      borderWidth: 1, borderColor: C.border,
    },
    emptyText:    { ...Typography.h3, color: C.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
    emptySubText: { ...Typography.small, color: C.textSecondary, textAlign: 'center', lineHeight: 24 },

    addBtn2: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.primary,
      alignItems: 'center', justifyContent: 'center',
    },

    emptyCta: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: Spacing.lg,
      backgroundColor: C.primary, borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg, paddingVertical: 12,
    },
    emptyCtaText: { ...Typography.smallBold, color: C.textOnPrimary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: Spacing.lg,
      paddingBottom: 48,
    },
    modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.lg },
    modalTitle:      { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.lg },
    modalLabel:      { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },
    modalInput: {
      backgroundColor: C.bg,
      borderRadius: Radius.md,
      padding: Spacing.md,
      color: C.textPrimary,
      fontSize: 18,
      borderWidth: 1,
      borderColor: C.border,
    },
    modalInputFocused: { borderColor: C.primary },
    modalSave: {
      marginTop: Spacing.lg,
      backgroundColor: C.primary,
      borderRadius: Radius.md,
      paddingVertical: 18,
      alignItems: 'center',
    },
    modalSaveText:   { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    modalCancel:     { paddingVertical: 14, alignItems: 'center' },
    modalCancelText: { ...Typography.small, color: C.textHint },

    goalTypeGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4,
    },
    goalTypeChip: {
      width: '22%', borderRadius: Radius.md, borderWidth: 1.5,
      paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 2,
    },
    goalTypeEmoji: { fontSize: 20, lineHeight: 26 },
    goalTypeLabel: { fontSize: 10, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },

    pinRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      marginTop: Spacing.md, padding: Spacing.md,
      borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border,
      backgroundColor: C.bg,
    },
    pinIconWrap: {
      width: 36, height: 36, borderRadius: Radius.sm,
      alignItems: 'center', justifyContent: 'center',
    },
    pinLabel: { ...Typography.smallBold, color: C.textPrimary },
    pinSub:   { ...Typography.caption, color: C.textHint, marginTop: 1 },
    pinToggle: {
      width: 42, height: 26, borderRadius: 13, justifyContent: 'center',
    },
    pinThumb: {
      width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    },

    actionOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    actionSheet: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
      paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    },
    actionTitle:     { ...Typography.bodyBold, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: 18, borderRadius: Radius.lg,
      backgroundColor: C.goals + '14', marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1, borderColor: C.goals + '30',
    },
    actionBtnPrimary: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: 18, borderRadius: Radius.lg,
      backgroundColor: C.primary + '14', marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1, borderColor: C.primary + '30',
    },
    actionBtnDestructive: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: 18, borderRadius: Radius.lg,
      backgroundColor: C.spending + '14', marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: 1, borderColor: C.spending + '30',
    },
    actionBtnText:   { ...Typography.bodyBold, fontSize: 17 },
    actionCancel:    { paddingVertical: Spacing.md, alignItems: 'center' },
    actionCancelText:{ ...Typography.body, color: C.textHint },
  });
}
