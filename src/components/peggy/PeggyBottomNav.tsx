import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyBottomNav — the ONE bottom navigation: Home · Camera · More.
 * Presentational (can back the real tab bar). Camera is the elevated center.
 */

export type NavKey = 'home' | 'camera' | 'more';

interface Props {
  active: NavKey;
  onPress: (key: NavKey) => void;
}

const ITEMS: { key: NavKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home',   label: 'Home',   icon: 'home' },
  { key: 'camera', label: 'Camera', icon: 'camera' },
  { key: 'more',   label: 'More',   icon: 'grid' },
];

export default function PeggyBottomNav({ active, onPress }: Props) {
  const C = useColors();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, paddingBottom: 6 }}>
      {ITEMS.map((it) => {
        const on = active === it.key;
        const color = on ? C.primary : C.textHint;
        const camera = it.key === 'camera';
        return (
          <TouchableOpacity key={it.key} onPress={() => onPress(it.key)} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <View style={camera ? { width: 40, height: 40, borderRadius: 20, backgroundColor: on ? C.primaryGlow : C.primaryDim, alignItems: 'center', justifyContent: 'center' } : { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={it.icon} size={camera ? 22 : 24} color={color} />
            </View>
            <Text style={[Typography.navLabel, { color }]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
