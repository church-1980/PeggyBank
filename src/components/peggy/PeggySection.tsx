import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Spacing } from '../../theme';
import PeggySectionHeader from './PeggySectionHeader';

/**
 * PeggySection — a titled group with the ONE section rhythm (header + spacing).
 * Screens compose sections; they never set their own section margins.
 */
interface Props {
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  first?: boolean;                 // no top margin for the first section
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggySection({ title, actionLabel, onAction, children, first = false, style, testID }: Props) {
  return (
    <View testID={testID} style={[{ marginTop: first ? 0 : Spacing.lg }, style]}>
      {title ? <PeggySectionHeader title={title} actionLabel={actionLabel} onAction={onAction} /> : null}
      {children}
    </View>
  );
}
