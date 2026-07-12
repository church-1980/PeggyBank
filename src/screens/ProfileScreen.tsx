import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase, wipeAllLocalData } from '../database/database';
import { wipeAllReceipts } from '../lib/receiptStorage';
import { useColors } from '../context/ThemeContext';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';

/**
 * ProfileScreen — local-only. PeggyBank has no accounts/billing, so this screen
 * NEVER shows sign-out, email, password, cloud, or subscription-billing controls.
 * It owns: profile photo, display name, preference links, and the destructive
 * "Delete all PeggyBank data from this device" flow.
 */

type DeleteStage = 'none' | 'warn' | 'confirm';

async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
    return row?.value ?? null;
  } catch { return null; }
}
async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
}

export default function ProfileScreen({ navigation }: any) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [deleteStage, setDeleteStage] = useState<DeleteStage>('none');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setName((await getSetting('display_name')) ?? '');
    setPhoto((await getSetting('profile_photo_uri')) ?? null);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveName = async () => {
    await setSetting('display_name', name.trim());
    setEditingName(false);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Photo access needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      setPhoto(uri);
      await setSetting('profile_photo_uri', uri);
    }
  };

  const removePhoto = async () => {
    setPhoto(null);
    await setSetting('profile_photo_uri', '');
  };

  const changePhoto = () => {
    if (photo) {
      Alert.alert('Profile photo', undefined, [
        { text: 'Change photo', onPress: pickPhoto },
        { text: 'Remove photo', style: 'destructive', onPress: removePhoto },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickPhoto();
    }
  };

  const runDelete = async () => {
    setDeleting(true);
    try {
      await wipeAllLocalData();     // transactional DB wipe
      await wipeAllReceipts();      // remove owned receipt images
      // Reset to valid first-use state.
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
    } catch (e: any) {
      setDeleting(false);
      Alert.alert('Deletion failed', `Some data could not be removed.\n${e?.message ?? ''}`);
    }
  };

  const confirmFinal = () => {
    Alert.alert(
      'Delete everything?',
      'This permanently removes all PeggyBank data from this device. This cannot be undone.',
      [
        { text: 'Keep my data', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: runDelete },
      ],
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-down" size={26} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: C.textPrimary }]}>Profile</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* ── Profile header ── */}
      <View style={styles.profileTop}>
        <TouchableOpacity onPress={changePhoto} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel="Change profile photo">
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: C.primary + '1F', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: C.primary }}>{(name.trim().charAt(0) || 'P').toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: C.primary }]}>
            <Ionicons name="camera" size={13} color={C.textOnPrimary} />
          </View>
        </TouchableOpacity>

        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={C.textHint}
              style={[styles.nameInput, { color: C.textPrimary, backgroundColor: C.surfaceMuted }]}
              autoFocus
            />
            <TouchableOpacity onPress={saveName} style={[styles.saveNameBtn, { backgroundColor: C.primary }]}>
              <Text style={{ color: C.textOnPrimary, fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nameRow} onPress={() => setEditingName(true)}>
            <Text style={[Typography.h2, { color: C.textPrimary }]}>{name.trim() || 'Add your name'}</Text>
            <Ionicons name="pencil" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Preferences ── */}
      <Text style={styles.sectionLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        <Row C={C} icon="color-palette-outline" label="Appearance" onPress={() => navigation.navigate('Appearance')} />
        <Divider C={C} />
        <Row C={C} icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
      </View>

      {/* ── Data & Privacy ── */}
      <Text style={styles.sectionLabel}>DATA & PRIVACY</Text>
      <Text style={styles.privacyNote}>
        PeggyBank stores all your data locally on this device. There is no account and nothing is uploaded.
      </Text>
      <View style={styles.card}>
        <Row C={C} icon="cloud-download-outline" label="Backup / Restore" onPress={() => navigation.navigate('Export')} />
      </View>

      {/* ── Destructive ── */}
      <View style={[styles.card, { marginTop: Spacing.md, borderColor: C.danger + '40', borderWidth: 1 }]}>
        <Row C={C} icon="trash-outline" label="Delete all PeggyBank data from this device" danger onPress={() => { setConfirmText(''); setDeleteStage('warn'); }} />
      </View>

      {/* ── Delete flow ── */}
      {deleteStage !== 'none' && (
        <View style={[styles.deleteBox, { borderColor: C.danger + '40' }]}>
          {deleteStage === 'warn' && (
            <>
              <Text style={[Typography.cardTitle, { color: C.danger }]}>This will permanently delete:</Text>
              {['Expenses', 'Bills', 'Goals', 'Income records', 'Debts', 'Tracked subscriptions', 'Preferences', 'Saved receipt & bill images', 'All other PeggyBank records'].map((x) => (
                <Text key={x} style={[Typography.helper, { color: C.textSecondary, marginTop: 3 }]}>•  {x}</Text>
              ))}
              <Text style={[Typography.helper, { color: C.textPrimary, marginTop: 10 }]}>This cannot be undone.</Text>
              <View style={styles.deleteBtnRow}>
                <TouchableOpacity onPress={() => setDeleteStage('none')} style={styles.cancelBtn}><Text style={{ color: C.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteStage('confirm')} style={[styles.dangerBtn, { backgroundColor: C.danger }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Continue</Text></TouchableOpacity>
              </View>
            </>
          )}
          {deleteStage === 'confirm' && (
            <>
              <Text style={[Typography.helper, { color: C.textPrimary }]}>Type <Text style={{ fontWeight: '800' }}>DELETE</Text> to confirm.</Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="DELETE"
                placeholderTextColor={C.textHint}
                autoCapitalize="characters"
                style={[styles.confirmInput, { color: C.textPrimary, backgroundColor: C.surfaceMuted }]}
              />
              <View style={styles.deleteBtnRow}>
                <TouchableOpacity onPress={() => setDeleteStage('none')} style={styles.cancelBtn} disabled={deleting}><Text style={{ color: C.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmFinal}
                  disabled={confirmText !== 'DELETE' || deleting}
                  style={[styles.dangerBtn, { backgroundColor: confirmText === 'DELETE' && !deleting ? C.danger : C.danger + '55' }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{deleting ? 'Deleting…' : 'Delete forever'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ C, icon, label, onPress, danger }: { C: ColorPalette; icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? C.danger : C.textSecondary} />
      <Text style={[Typography.body, { color: danger ? C.danger : C.textPrimary, flex: 1, fontWeight: danger ? '700' : '400' }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={16} color={C.textHint} />}
    </TouchableOpacity>
  );
}
function Divider({ C }: { C: ColorPalette }) { return <View style={{ height: 1, backgroundColor: C.borderLight }} />; }

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
    profileTop: { alignItems: 'center', marginBottom: Spacing.lg },
    avatarWrap: { marginBottom: Spacing.md },
    avatar: { width: 96, height: 96, borderRadius: 48 },
    editBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nameEditRow: { flexDirection: 'row', gap: 8, alignItems: 'center', width: '100%' },
    nameInput: { flex: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 46, ...Typography.body },
    saveNameBtn: { borderRadius: Radius.md, paddingHorizontal: 18, height: 46, alignItems: 'center', justifyContent: 'center' },
    sectionLabel: { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Spacing.lg, marginBottom: Spacing.sm },
    privacyNote: { ...Typography.helper, color: C.textSecondary, marginBottom: Spacing.sm },
    card: { backgroundColor: C.bgCard, borderRadius: Radius.lg, paddingHorizontal: Spacing.md },
    deleteBox: { marginTop: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, backgroundColor: C.bgCard },
    deleteBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: Spacing.md },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 12 },
    dangerBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: Radius.md },
    confirmInput: { borderRadius: Radius.md, paddingHorizontal: 14, height: 48, marginTop: 10, letterSpacing: 2, fontWeight: '700' },
  });
}
