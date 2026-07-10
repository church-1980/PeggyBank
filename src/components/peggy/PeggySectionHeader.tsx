import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Spacing, Typography } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggySectionHeader — Design Bible §15.
 *
 * Bold title left, optional quiet purple "See all" link right. Identical
 * spacing above and below on every screen so the user can skim structurally.
 *
 * RULE: Secondary navigation is always a purple text link, never a button.
 */

interface Props {
  title: string;
  actionLabel?: string;      // defaults to "See all" when onAction is given
  onAction?: () => void;
  testID?: string;
}

export default function PeggySectionHeader({ title, actionLabel = 'See all', onAction, testID }: Props) {
  const C = useColors();

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.lg,      // ~24 above
        marginBottom: Spacing.sm + 4, // ~12 below
      }}
    >
      <Text style={[Typography.sectionHeader, { color: C.textPrimary }]}>{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[Typography.seeAll, { color: C.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
