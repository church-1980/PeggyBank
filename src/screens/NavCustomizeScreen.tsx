import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavConfig, NAV_FEATURES, NavFeatureKey } from '../context/NavContext';
import { Spacing, Radius, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';

export default function NavCustomizeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { slots, updateSlots } = useNavConfig();
  const [draft, setDraft] = useState<NavFeatureKey[]>([...slots]);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = (featureKey: NavFeatureKey) => {
    if (pickingSlot === null) return;
    const newDraft = [...draft];
    const existingSlot = newDraft.indexOf(featureKey);
    if (existingSlot !== -1 && existingSlot !== pickingSlot) {
      newDraft[existingSlot] = newDraft[pickingSlot];
    }
    newDraft[pickingSlot] = featureKey;
    setDraft(newDraft);
    setPickingSlot(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSlots(draft);
    } catch {
      Alert.alert('Error', 'Could not save navigation preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Customize Navigation</Text>
        </View>

        <Text style={styles.subtitle}>
          Choose which three features appear in your bottom bar.
          Home and More are always visible.
        </Text>

        <View style={styles.previewBar}>
          <View style={styles.previewTab}>
            <Ionicons name="home" size={20} color={C.primary} />
            <Text style={[styles.previewLabel, { color: C.primary }]}>Home</Text>
          </View>

          {draft.map((key, i) => {
            const feature = NAV_FEATURES.find((f) => f.key === key);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.previewTab, styles.previewTabSlot]}
                onPress={() => setPickingSlot(i)}
              >
                <Ionicons name={feature?.iconActive as any ?? 'help'} size={20} color={C.textSecondary} />
                <Text style={styles.previewLabel}>{feature?.label ?? '—'}</Text>
                <View style={styles.editDot}>
                  <Ionicons name="pencil-outline" size={8} color={C.primary} />
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.previewTab}>
            <Ionicons name="grid" size={20} color={C.textSecondary} />
            <Text style={styles.previewLabel}>More</Text>
          </View>
        </View>
        <Text style={styles.tapHint}>Tap any middle tab to change it</Text>

        <View style={styles.slotsSection}>
          <Text style={styles.sectionLabel}>Your 3 middle tabs</Text>

          {draft.map((key, i) => {
            const feature = NAV_FEATURES.find((f) => f.key === key);
            return (
              <TouchableOpacity
                key={i}
                style={[styles.slotCard, pickingSlot === i && styles.slotCardActive]}
                onPress={() => setPickingSlot(pickingSlot === i ? null : i)}
                activeOpacity={0.75}
              >
                <View style={[styles.slotIcon, { backgroundColor: C.primary + '18' }]}>
                  <Ionicons name={feature?.iconActive as any ?? 'help'} size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotLabel}>Slot {i + 1}</Text>
                  <Text style={styles.slotValue}>{feature?.label ?? '—'}</Text>
                  <Text style={styles.slotDesc}>{feature?.description ?? ''}</Text>
                </View>
                <Ionicons
                  name={pickingSlot === i ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={C.textHint}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.allSection}>
          <Text style={styles.sectionLabel}>Available features</Text>
          {NAV_FEATURES.map((feature) => {
            const activeSlot = draft.indexOf(feature.key);
            const isActive = activeSlot !== -1;
            return (
              <TouchableOpacity
                key={feature.key}
                style={[styles.featureRow, isActive && styles.featureRowActive]}
                onPress={() => pickingSlot !== null ? pick(feature.key) : setPickingSlot(draft.indexOf(feature.key) !== -1 ? draft.indexOf(feature.key) : null)}
                activeOpacity={0.75}
              >
                <View style={[styles.featureIcon, { backgroundColor: (isActive ? C.primary : C.textSecondary) + '14' }]}>
                  <Ionicons
                    name={(isActive ? feature.iconActive : feature.icon) as any}
                    size={20}
                    color={isActive ? C.primary : C.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureLabel, isActive && { color: C.textPrimary }]}>
                    {feature.label}
                  </Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Slot {activeSlot + 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color={C.textOnPrimary} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Navigation'}</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {pickingSlot !== null && (
        <Modal transparent animationType="slide">
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setPickingSlot(null)}
          />
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Choose for Slot {pickingSlot + 1}</Text>
            {NAV_FEATURES.map((feature) => {
              const currentlyInSlot = draft[pickingSlot] === feature.key;
              return (
                <TouchableOpacity
                  key={feature.key}
                  style={[styles.pickerRow, currentlyInSlot && styles.pickerRowActive]}
                  onPress={() => pick(feature.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerIcon, { backgroundColor: (currentlyInSlot ? C.primary : C.textSecondary) + '14' }]}>
                    <Ionicons name={(currentlyInSlot ? feature.iconActive : feature.icon) as any} size={20} color={currentlyInSlot ? C.primary : C.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerLabel, currentlyInSlot && { color: C.primary }]}>{feature.label}</Text>
                    <Text style={styles.pickerDesc}>{feature.description}</Text>
                  </View>
                  {currentlyInSlot && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Modal>
      )}
    </View>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    content:    { padding: Spacing.md },

    header:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, paddingTop: Spacing.sm },
    backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    title:      { ...Typography.h2, color: C.textPrimary },
    subtitle:   { ...Typography.small, color: C.textSecondary, lineHeight: 22, marginBottom: Spacing.lg },

    previewBar: {
      flexDirection: 'row', backgroundColor: C.bgCard,
      borderRadius: Radius.lg, padding: Spacing.md,
      borderWidth: 1, borderColor: C.border,
      justifyContent: 'space-around', marginBottom: 6,
    },
    previewTab:      { alignItems: 'center', gap: 4, flex: 1 },
    previewTabSlot:  { position: 'relative' },
    previewLabel:    { ...Typography.caption, color: C.textSecondary },
    editDot: {
      position: 'absolute', top: -2, right: 0,
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: C.bgCard,
      borderWidth: 1, borderColor: C.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    tapHint:    { ...Typography.caption, color: C.textHint, textAlign: 'center', marginBottom: Spacing.lg },

    slotsSection: { marginBottom: Spacing.lg },
    allSection:   { marginBottom: Spacing.lg },
    sectionLabel: { ...Typography.label, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing.sm },

    slotCard: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      backgroundColor: C.bgCard, borderRadius: Radius.lg,
      padding: Spacing.md, marginBottom: 8,
      borderWidth: 1, borderColor: C.border,
    },
    slotCardActive: { borderColor: C.primary },
    slotIcon:       { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    slotLabel:      { ...Typography.caption, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.5 },
    slotValue:      { ...Typography.bodyBold, color: C.textPrimary },
    slotDesc:       { ...Typography.caption, color: C.textSecondary, marginTop: 2 },

    featureRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    featureRowActive: {},
    featureIcon:    { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    featureLabel:   { ...Typography.bodyBold, color: C.textSecondary },
    featureDesc:    { ...Typography.caption, color: C.textHint, marginTop: 2 },
    activeBadge: {
      backgroundColor: C.primary + '18', borderRadius: Radius.full,
      paddingHorizontal: 8, paddingVertical: 4,
    },
    activeBadgeText: { ...Typography.caption, color: C.primary, fontWeight: '700' },

    saveBtn: {
      backgroundColor: C.primary, borderRadius: Radius.lg,
      paddingVertical: 18, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: Spacing.md,
    },
    saveBtnText: { ...Typography.bodyBold, color: C.textOnPrimary, fontSize: 17 },

    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    pickerSheet: {
      backgroundColor: C.bgElevated,
      borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
      padding: Spacing.md,
    },
    pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: Spacing.md },
    pickerTitle:  { ...Typography.h3, color: C.textPrimary, marginBottom: Spacing.md, textAlign: 'center' },
    pickerRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    pickerRowActive: {},
    pickerIcon:   { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    pickerLabel:  { ...Typography.bodyBold, color: C.textPrimary },
    pickerDesc:   { ...Typography.caption, color: C.textSecondary, marginTop: 2 },
  });
}
