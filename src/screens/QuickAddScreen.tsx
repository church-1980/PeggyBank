import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Pressable, BackHandler, Dimensions, Easing, ScrollView, Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius, Spacing } from '../theme';
import { useColors } from '../context/ThemeContext';

// ─── Arc geometry ────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const RADIUS    = 155;
const ITEM_W    = 74;
const ITEM_H    = 90;
const ICON_SIZE = 52;
const ARC_ANGLES = [-70, -35, 0, 35, 70];
const STORAGE_KEY = '@peggybank_arc_items';
const DEFAULT_KEYS = ['checkin', 'income', 'bill', 'goal', 'more'];

type ColorKey = 'spending' | 'income' | 'bills' | 'goals' | 'primary' | 'debt' | 'subs';

interface ArcOption {
  key:      string;
  label:    string;
  icon:     string;
  colorKey: ColorKey;
  screen:   string;
  params?:  object;
}

// ─── Full pool of available actions ──────────────────────────────────────────
export const ARC_POOL: ArcOption[] = [
  { key: 'checkin',   label: 'Check-In',  icon: 'checkmark-circle-outline', colorKey: 'income',   screen: 'WeeklyCheckIn' },
  { key: 'income',    label: 'Income',    icon: 'arrow-down-circle-outline', colorKey: 'income',   screen: 'AddIncome' },
  { key: 'expense',   label: 'Expense',   icon: 'arrow-up-circle-outline',   colorKey: 'spending', screen: 'AddExpense' },
  { key: 'bill',      label: 'Add Bill',  icon: 'receipt-outline',           colorKey: 'bills',    screen: 'Bills',    params: { autoOpen: true } },
  { key: 'goal',      label: 'Add Goal',  icon: 'flag-outline',              colorKey: 'goals',    screen: 'Goals',    params: { autoOpen: true } },
  { key: 'debt',      label: 'Debt',      icon: 'trending-down-outline',     colorKey: 'debt',     screen: 'Debt' },
  { key: 'currency',  label: 'Currency',  icon: 'swap-horizontal-outline',   colorKey: 'primary',  screen: 'Currency' },
  { key: 'calendar',  label: 'Calendar',  icon: 'calendar-outline',          colorKey: 'bills',    screen: 'Calendar' },
  { key: 'breakdown', label: 'Breakdown', icon: 'bar-chart-outline',         colorKey: 'goals',    screen: 'MonthlyBreakdown' },
  { key: 'payday',    label: 'Payday',    icon: 'cash-outline',              colorKey: 'income',   screen: 'Payday' },
  { key: 'more',      label: 'More',      icon: 'grid-outline',              colorKey: 'primary',  screen: 'More' },
];

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function getOption(key: string): ArcOption {
  return ARC_POOL.find(o => o.key === key) ?? ARC_POOL[ARC_POOL.length - 1];
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function QuickAddScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const C      = useColors();

  const FAB_CENTER_FROM_BOTTOM = insets.bottom + 46;

  const [activeKeys, setActiveKeys]     = useState<string[]>(DEFAULT_KEYS);
  const [customizing, setCustomizing]   = useState(false);
  const [editSlot, setEditSlot]         = useState<number | null>(null);

  // ── Load saved config ────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const keys = JSON.parse(raw) as string[];
          if (Array.isArray(keys) && keys.length === 5) setActiveKeys(keys);
        } catch {}
      }
    });
  }, []);

  const saveKeys = useCallback((keys: string[]) => {
    setActiveKeys(keys);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }, []);

  // ── Animations ──────────────────────────────────────────────────────────
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const itemAnims    = useRef(
    ARC_ANGLES.map(() => ({
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0.35),
    }))
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ...itemAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(i * 35),
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1, duration: 240,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
            Animated.spring(anim.scale, {
              toValue: 1, tension: 65, friction: 8, useNativeDriver: true,
            }),
          ]),
        ])
      ),
    ]).start();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (customizing) { setCustomizing(false); return true; }
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [customizing]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ...itemAnims.map(anim =>
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(anim.scale,   { toValue: 0.35, duration: 150, useNativeDriver: true }),
        ])
      ),
    ]).start(() => {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Home');
    });
  };

  const handleAction = (screen: string, params?: object) => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      ...itemAnims.map(a =>
        Animated.timing(a.opacity, { toValue: 0, duration: 110, useNativeDriver: true })
      ),
    ]).start(() => navigation.replace(screen, params));
  };

  const swapSlot = (slotIndex: number, newKey: string) => {
    const next = [...activeKeys];
    next[slotIndex] = newKey;
    saveKeys(next);
    setEditSlot(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: backdropAnim }]}
        pointerEvents="auto"
      >
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </BlurView>
      </Animated.View>

      {/* Arc items */}
      {activeKeys.map((key, i) => {
        const item    = getOption(key);
        const rad     = toRad(ARC_ANGLES[i]);
        const offsetX      = Math.round(RADIUS * Math.sin(rad));
        const offsetUpward = Math.round(RADIUS * Math.cos(rad));
        const left   = SCREEN_W / 2 + offsetX - ITEM_W / 2;
        const bottom = FAB_CENTER_FROM_BOTTOM + offsetUpward - ITEM_H / 2;
        const color  = C[item.colorKey] ?? C.primary;

        return (
          <Animated.View
            key={i}
            pointerEvents="auto"
            style={[
              styles.itemWrap,
              {
                left, bottom,
                width: ITEM_W, height: ITEM_H,
                opacity:   itemAnims[i].opacity,
                transform: [{ scale: itemAnims[i].scale }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.itemBtn}
              onPress={() => customizing ? setEditSlot(i) : handleAction(item.screen, item.params)}
              onLongPress={() => { setCustomizing(true); setEditSlot(i); }}
              activeOpacity={0.72}
            >
              <View style={[styles.iconCircle, { backgroundColor: color, shadowColor: color }]}>
                {customizing && <View style={[styles.editBadge, { backgroundColor: C.black + '73' }]}><Ionicons name="pencil-outline" size={10} color={C.white} /></View>}
                <Ionicons name={item.icon as any} size={24} color="#fff" />
              </View>
              <Text style={[styles.label, { color: C.textPrimary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Customize label */}
      {customizing && (
        <Animated.View
          pointerEvents="auto"
          style={[styles.customizeBar, { bottom: FAB_CENTER_FROM_BOTTOM + RADIUS + 30, opacity: backdropAnim }]}
        >
          <Text style={[styles.customizeHint, { color: C.textPrimary }]}>Tap a button to change it</Text>
          <TouchableOpacity onPress={() => setCustomizing(false)} style={[styles.doneBtn, { backgroundColor: C.white + '26' }]}>
            <Text style={[styles.doneBtnText, { color: C.primary }]}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Slot picker modal */}
      <Modal
        visible={editSlot !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditSlot(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setEditSlot(null)}
        />
        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16, backgroundColor: C.bgCard }]}>
          <View style={[styles.pickerHandle, { backgroundColor: C.border }]} />
          <Text style={[styles.pickerTitle, { color: C.textPrimary }]}>Choose an action</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ARC_POOL.map(option => {
              const color      = C[option.colorKey] ?? C.primary;
              const isSelected = editSlot !== null && activeKeys[editSlot] === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.pickerRow, isSelected && { backgroundColor: C.primary + '15' }]}
                  onPress={() => editSlot !== null && swapSlot(editSlot, option.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerIcon, { backgroundColor: color + '22' }]}>
                    <Ionicons name={option.icon as any} size={20} color={color} />
                  </View>
                  <Text style={[styles.pickerLabel, { color: C.textPrimary }]}>{option.label}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  itemWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  itemBtn: {
    alignItems: 'center',
    width: ITEM_W,
  },
  iconCircle: {
    width:  ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius:  8,
    elevation: 5,
  },
  editBadge: {
    position: 'absolute',
    top: 2, right: 2,
    width: 18, height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 7,
    textAlign: 'center',
    width: ITEM_W,
  },
  customizeBar: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  customizeHint: {
    ...Typography.caption,
    fontWeight: '600',
    opacity: 0.85,
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  doneBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
  },
  pickerSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  pickerTitle: {
    ...Typography.h3,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 14,
  },
  pickerIcon: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    ...Typography.body,
    flex: 1,
  },
});
