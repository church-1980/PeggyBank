import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency, getDaysUntil } from '../utils/helpers';
import { Spacing, Radius, Typography, Shadow, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

interface Subscription {
  id?: number;
  name: string;
  amount: number;
  billing_day: number;
}

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

interface QuickSub { name: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; color: string; }

const QUICK_CATEGORIES: { title: string; data: QuickSub[] }[] = [
  {
    title: 'Entertainment',
    data: [
      { name: 'Netflix',          icon: 'tv-outline',               color: '#E50914' },
      { name: 'Disney+',          icon: 'sparkles-outline',         color: '#113CCF' },
      { name: 'Prime Video',      icon: 'videocam-outline',         color: '#00A8E0' },
      { name: 'Crave',            icon: 'film-outline',             color: '#FF6B00' },
      { name: 'YouTube Premium',  icon: 'logo-youtube',             color: '#FF0000' },
      { name: 'Apple TV+',        icon: 'play-circle-outline',      color: '#555555' },
    ],
  },
  {
    title: 'Music',
    data: [
      { name: 'Spotify',          icon: 'musical-notes-outline',    color: '#1DB954' },
      { name: 'Apple Music',      icon: 'musical-note-outline',     color: '#FA2D55' },
      { name: 'Tidal',            icon: 'headset-outline',          color: '#00FFFF' },
    ],
  },
  {
    title: 'Cloud & Storage',
    data: [
      { name: 'iCloud',           icon: 'cloud-outline',            color: '#3478F6' },
      { name: 'Google One',       icon: 'logo-google',              color: '#4285F4' },
      { name: 'Dropbox',          icon: 'folder-open-outline',      color: '#0061FF' },
      { name: 'OneDrive',         icon: 'cloud-upload-outline',     color: '#0078D4' },
    ],
  },
  {
    title: 'Gaming',
    data: [
      { name: 'Xbox Game Pass',   icon: 'game-controller-outline',  color: '#107C10' },
      { name: 'PlayStation Plus', icon: 'game-controller-outline',  color: '#003087' },
      { name: 'Nintendo Online',  icon: 'game-controller-outline',  color: '#E60012' },
    ],
  },
  {
    title: 'Fitness & Health',
    data: [
      { name: 'Gym',              icon: 'barbell-outline',          color: '#FF6B35' },
      { name: 'Fitbit Premium',   icon: 'heart-outline',            color: '#00B0B9' },
      { name: 'MyFitnessPal',     icon: 'nutrition-outline',        color: '#0062FF' },
      { name: 'Calm',             icon: 'moon-outline',             color: '#5B5EA6' },
    ],
  },
  {
    title: 'AI & Tools',
    data: [
      { name: 'ChatGPT Plus',     icon: 'chatbubble-ellipses-outline', color: '#10A37F' },
      { name: 'Claude Pro',       icon: 'sparkles-outline',            color: '#C77DFF' },
      { name: 'Canva Pro',        icon: 'brush-outline',               color: '#7D2AE8' },
      { name: 'Adobe Creative',   icon: 'color-palette-outline',       color: '#FF0000' },
      { name: 'Notion',           icon: 'document-text-outline',       color: '#FFFFFF' },
    ],
  },
  {
    title: 'Other',
    data: [
      { name: 'Amazon Prime',     icon: 'bag-outline',               color: '#FF9900' },
      { name: 'Microsoft 365',    icon: 'grid-outline',              color: '#D83B01' },
      { name: 'VPN',              icon: 'shield-outline',            color: '#6C63FF' },
      { name: 'Password Manager', icon: 'lock-closed-outline',       color: '#4ECDC4' },
    ],
  },
];

export default function SubscriptionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingDay, setBillingDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const loadSubs = useCallback(async () => {
    const db = await getDatabase();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        billing_day INTEGER NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    const result = await db.getAllAsync<Subscription>(`SELECT * FROM subscriptions ORDER BY billing_day ASC`);
    setSubs(result);
  }, []);

  useFocusEffect(useCallback(() => { loadSubs(); }, [loadSubs]));

  const openAdd = (prefillName = '') => {
    setEditingSub(null);
    setName(prefillName);
    setAmount('');
    setBillingDay(1);
    setModalVisible(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setName(sub.name);
    setAmount(String(sub.amount));
    setBillingDay(sub.billing_day);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim()) { Alert.alert('Oops', 'Please enter a name.'); return; }
    if (isNaN(parsed) || parsed <= 0) { Alert.alert('Oops', 'Please enter a valid amount.'); return; }
    setSaving(true);
    try {
      const db = await getDatabase();
      if (editingSub?.id) {
        await db.runAsync(
          `UPDATE subscriptions SET name=?, amount=?, billing_day=? WHERE id=?`,
          [name.trim(), parsed, billingDay, editingSub.id]
        );
      } else {
        await db.runAsync(
          `INSERT INTO subscriptions (name, amount, billing_day) VALUES (?, ?, ?)`,
          [name.trim(), parsed, billingDay]
        );
      }
      console.log('[Subscriptions] saved:', name.trim());
      setModalVisible(false);
      loadSubs();
    } catch (e) {
      console.error('[Subscriptions] save error:', e);
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
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
          loadSubs();
        } catch (e) {
          console.error('[Subscriptions] delete error:', e);
        }
      },
    });
  };

  const totalMonthly = subs.reduce((sum, s) => sum + s.amount, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <Text style={styles.headerSub}>
            {subs.length > 0
              ? `${subs.length} active · ${formatCurrency(totalMonthly)}/month`
              : 'Track what charges you each month'}
          </Text>
        </View>
        {navigation?.goBack && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {subs.length > 0 && (
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>Monthly total</Text>
              <Text style={styles.totalAmount}>{formatCurrency(totalMonthly)}</Text>
              <Text style={styles.totalAnnual}>{formatCurrency(totalMonthly * 12)} per year</Text>
            </View>
            <Ionicons name="repeat" size={32} color={C.subs + '60'} />
          </View>
        )}

        {subs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Your Subscriptions</Text>
            {subs.map((item) => {
              const days = getDaysUntil(item.billing_day);
              const urgent = days <= 3;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.subCard, urgent && { borderLeftColor: C.spending }]}
                  onPress={() => openEdit(item)}
                  onLongPress={() => item.id && deleteSub(item.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.subIconWrap, { backgroundColor: C.subs + '18' }]}>
                    <Ionicons name="repeat-outline" size={18} color={C.subs} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subName}>{item.name}</Text>
                    <Text style={[styles.subDue, urgent && { color: C.spending }]}>
                      {days === 0 ? 'Charges today' : days === 1 ? 'Charges tomorrow' : `Charges in ${days} days`}
                      {' · '}{ordinal(item.billing_day)} of month
                    </Text>
                  </View>
                  <Text style={[styles.subAmount, urgent && { color: C.spending }]}>
                    {formatCurrency(item.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Quick Add</Text>
            <Text style={styles.sectionSub}>Tap to pre-fill the name</Text>
          </View>

          {QUICK_CATEGORIES.map((cat) => (
            <View key={cat.title} style={styles.catBlock}>
              <Text style={styles.catTitle}>{cat.title}</Text>
              <View style={styles.quickGrid}>
                {cat.data.map((s) => (
                  <TouchableOpacity
                    key={s.name}
                    style={styles.quickBtn}
                    onPress={() => openAdd(s.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.quickIconWrap, { backgroundColor: s.color + '18' }]}>
                      <Ionicons name={s.icon} size={18} color={s.color} />
                    </View>
                    <Text style={styles.quickLabel} numberOfLines={2}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => openAdd()}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color={C.textOnPrimary} />
        <Text style={styles.fabText}>Add Custom</Text>
      </TouchableOpacity>

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

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 40 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {editingSub ? 'Edit Subscription' : 'Add Subscription'}
              </Text>

              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Netflix, Gym, iCloud"
                placeholderTextColor={C.textHint}
              />

              <Text style={styles.modalLabel}>Monthly amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textHint}
                />
              </View>

              <Text style={styles.modalLabel}>Which day does it charge?</Text>
              <Text style={styles.modalHint}>Tap the number</Text>
              <View style={styles.dayGrid}>
                {MONTH_DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayBtn, billingDay === d && styles.dayBtnActive]}
                    onPress={() => setBillingDay(d)}
                  >
                    <Text style={[styles.dayBtnText, billingDay === d && styles.dayBtnTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.selectedNote}>
                Charges on the {ordinal(billingDay)} of each month
              </Text>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
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
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: Spacing.lg, paddingTop: Spacing.md,
      backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { ...Typography.h2, color: C.textPrimary },
    headerSub:   { ...Typography.small, color: C.textSecondary, marginTop: 4 },
    backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },

    content:     { padding: Spacing.md },

    totalCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.lg, marginBottom: Spacing.md,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, borderLeftColor: C.subs,
    },
    totalLabel:  { ...Typography.label, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    totalAmount: { ...Typography.h1, color: C.textPrimary, marginVertical: 4 },
    totalAnnual: { ...Typography.small, color: C.textSecondary },

    section:     { marginBottom: Spacing.lg },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.sm },
    sectionLabel:{ ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm },
    sectionSub:  { ...Typography.caption, color: C.textHint },

    subCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: 8,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 3, borderLeftColor: C.subs,
    },
    subIconWrap: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    subName:     { ...Typography.bodyBold, color: C.textPrimary },
    subDue:      { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
    subAmount:   { ...Typography.bodyBold, color: C.subs },

    catBlock:    { marginBottom: Spacing.md },
    catTitle:    { ...Typography.smallBold, color: C.textSecondary, marginBottom: Spacing.sm },
    quickGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickBtn: {
      width: '22%', backgroundColor: C.bgCard, borderRadius: Radius.md,
      padding: 10, alignItems: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    quickIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    quickLabel:    { ...Typography.caption, color: C.textSecondary, textAlign: 'center', lineHeight: 14 },

    fab: {
      position: 'absolute', right: 24,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: C.subs, borderRadius: Radius.full,
      paddingHorizontal: Spacing.lg, paddingVertical: 14,
      ...Shadow.soft,
    },
    fabText: { ...Typography.bodyBold, color: C.textOnPrimary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard:    { backgroundColor: C.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
    modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md },
    modalTitle:   { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.lg },
    modalLabel:   { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },
    modalHint:    { ...Typography.caption, color: C.textHint, marginBottom: Spacing.sm },
    modalInput:   { backgroundColor: C.bg, borderRadius: Radius.md, padding: Spacing.md, color: C.textPrimary, fontSize: 16, borderWidth: 1, borderColor: C.border },
    amountRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border },
    dollar:       { ...Typography.h3, color: C.subs, marginRight: 4 },
    amountInput:  { flex: 1, fontSize: 26, color: C.textPrimary, paddingVertical: 14, fontWeight: '700' },
    dayGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayBtn:       { width: 44, height: 44, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    dayBtnActive: { backgroundColor: C.subs, borderColor: C.subs },
    dayBtnText:   { ...Typography.smallBold, color: C.textSecondary },
    dayBtnTextActive: { color: C.textOnPrimary },
    selectedNote: { ...Typography.smallBold, color: C.income, textAlign: 'center', marginTop: 10, marginBottom: 4 },
    saveBtn:      { marginTop: Spacing.lg, backgroundColor: C.subs, borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center' },
    saveBtnText:  { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },
    cancelBtn:    { paddingVertical: 14, alignItems: 'center' },
    cancelBtnText:{ ...Typography.small, color: C.textHint },

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
