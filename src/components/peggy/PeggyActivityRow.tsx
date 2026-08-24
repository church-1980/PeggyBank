import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Typography, ColorPalette } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import PeggyIconFrame from './PeggyIconFrame';
import { categoryIconKey, subscriptionIconKey, IconKey } from '../../data/iconRegistry';
import { formatCurrency } from '../../utils/helpers';
import type { ActivityItem } from '../../lib/activity';

/**
 * One line of "what happened to my money".
 *
 * The same row is used on Home and in the full history, so a payment looks
 * identical wherever it is met. Money in and money out are told apart three
 * ways -- a plus or minus sign, the word, and colour -- because colour alone
 * fails for anyone with colour-vision difficulty, and this is the one
 * distinction in the app that must never be ambiguous.
 */

interface Props {
  item: ActivityItem;
  onPress?: (item: ActivityItem) => void;
  /** A merchant's own logo, when one has been attached. */
  logoUri?: string | null;
  style?: StyleProp<ViewStyle>;
}

/** The artwork for a piece of activity, from the concept registry. */
export function activityIconKey(item: ActivityItem): IconKey {
  if (item.source === 'income') return 'income';
  if (item.source === 'bill') return 'bills';
  if (item.source === 'subscription') return subscriptionIconKey(undefined);
  return categoryIconKey(item.category ?? undefined);
}

/** "83 dollars and 42 cents" — so a screen reader says money, not digits. */
function spoken(amount: number): string {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const d = whole === 1 ? 'dollar' : 'dollars';
  if (cents === 0) return whole + ' ' + d;
  return whole + ' ' + d + ' and ' + cents + (cents === 1 ? ' cent' : ' cents');
}

export default function PeggyActivityRow({ item, onPress, logoUri, style }: Props) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const isIn = item.direction === 'in';
  const sign = isIn ? '+' : '−';                 // a real minus sign, not a hyphen
  const tone = isIn ? C.income : C.textPrimary;

  // Reads as a sentence: "Maxi, groceries, 83 dollars and 42 cents spent".
  const label =
    item.title +
    (item.subtitle ? ', ' + item.subtitle : '') +
    ', ' + spoken(item.amount) + (isIn ? ' received' : ' spent');

  const Row = onPress ? TouchableOpacity : View;

  return (
    <Row
      style={[styles.row, style]}
      onPress={onPress ? () => onPress(item) : undefined}
      activeOpacity={0.75}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityHint={onPress ? 'Opens this record so you can check or change it' : undefined}
    >
      <PeggyIconFrame
        iconKey={activityIconKey(item)}
        size="card"
        shape="circle"
        overrideSource={logoUri ? { uri: logoUri } : undefined}
        style={{ marginRight: Spacing.sm + 2 }}
      />

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
      </View>

      <View style={styles.amountBlock}>
        <Text style={[styles.amount, { color: tone }]} numberOfLines={1}>
          {sign}{formatCurrency(item.amount)}
        </Text>
        {/* The word as well as the sign: never colour on its own. */}
        <Text style={styles.direction}>{isIn ? 'in' : 'out'}</Text>
      </View>
    </Row>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingVertical: Spacing.sm,
    },
    middle:    { flex: 1, paddingRight: Spacing.sm },
    title:     { ...Typography.bodyBold, color: C.textPrimary },
    subtitle:  { ...Typography.caption, color: C.textSecondary, marginTop: 2, textTransform: 'capitalize' },
    amountBlock: { alignItems: 'flex-end' },
    amount:    { ...Typography.bodyBold },
    direction: { ...Typography.caption, color: C.textHint, marginTop: 2 },
  });
}
