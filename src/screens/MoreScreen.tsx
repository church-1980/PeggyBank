import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { PeggyScreen } from '../components/peggy';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import { IconKey } from '../data/iconRegistry';
import PeggyCard from '../components/peggy/PeggyCard';
import { useT } from '../context/LanguageContext';

/**
 * MoreScreen — reproduces the approved visual spec. Content tools carry their
 * matte concept icon (via the registry → PeggyIconFrame); system/chrome tools
 * use a single consistent line-icon treatment. One card, one grid, one rhythm.
 */

interface ToolItem {
  labelKey: string;
  descKey: string;
  iconKey: IconKey;                                // matte concept art, always from the registry
  colorKey: 'goals' | 'primary' | 'subs' | 'debt' | 'income' | 'bills' | 'primaryLight' | 'textSecondary' | 'spending';
  screen: string;
  params?: object;
}

// One destination per row. Actions that already exist inside a screen (add a
// bill/goal/expense) or inside Settings (Export & Backup, Share) do NOT get a
// duplicate tile here. Ordered by purpose: money → planning → insights → tools →
// account.
const TOOLS: ToolItem[] = [
  // ── Money in & out ──
  { labelKey: 'nav.spending',  descKey: 'more.spendingDesc',  iconKey: 'spent',    colorKey: 'spending',      screen: 'Spending' },
  { labelKey: 'nav.income',    descKey: 'more.incomeDesc',    iconKey: 'income',   colorKey: 'income',        screen: 'Incomes' },
  { labelKey: 'nav.bills',     descKey: 'more.billsDesc',     iconKey: 'bills',    colorKey: 'bills',         screen: 'Bills' },
  { labelKey: 'nav.debt',      descKey: 'more.debtDesc',      iconKey: 'debt',     colorKey: 'debt',          screen: 'Debt' },
  // ── Saving & planning ──
  { labelKey: 'nav.goals',     descKey: 'more.goalsDesc',     iconKey: 'goals',    colorKey: 'goals',         screen: 'Goals' },
  // ── Insights ──
  { labelKey: 'nav.activity',  descKey: 'more.activityDesc',  iconKey: 'check-in', colorKey: 'primary',       screen: 'Activity' },
  { labelKey: 'nav.breakdown', descKey: 'more.breakdownDesc', iconKey: 'reports',  colorKey: 'bills',         screen: 'MonthlyBreakdown' },
  { labelKey: 'nav.calendar',  descKey: 'more.calendarDesc',  iconKey: 'calendar', colorKey: 'primary',       screen: 'Calendar' },
  // ── Tools ──
  { labelKey: 'nav.currency',  descKey: 'more.currencyDesc',  iconKey: 'currency', colorKey: 'primaryLight',  screen: 'Currency' },
  // ── Account ──
  { labelKey: 'nav.profile',   descKey: 'more.profileDesc',   iconKey: 'profile',  colorKey: 'primary',       screen: 'Profile' },
  { labelKey: 'settings.title', descKey: 'more.settingsDesc', iconKey: 'settings', colorKey: 'textSecondary', screen: 'Settings' },
];

export default function MoreScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const t = useT();

  return (
    <PeggyScreen>
      <Text style={styles.title}>{t('more.title')}</Text>
      <Text style={styles.subtitle}>{t('more.subtitle')}</Text>

      <View style={styles.grid}>
        {TOOLS.map((item) => {
          return (
            <PeggyCard
              key={item.labelKey}
              style={styles.card}
              onPress={() => navigation.navigate(item.screen, item.params)}
            >
              <PeggyIconFrame iconKey={item.iconKey} size="card" shape="tile" style={styles.iconSlot} />
              <Text style={styles.cardLabel}>{t(item.labelKey)}</Text>
              <Text style={styles.cardDesc}>{t(item.descKey)}</Text>
            </PeggyCard>
          );
        })}
      </View>
    </PeggyScreen>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: C.bg },
    content:    { padding: Spacing.md, paddingTop: 56, paddingBottom: 60 },
    title:      { ...Typography.h1, color: C.textPrimary, marginBottom: Spacing.xs },
    subtitle:   { ...Typography.small, color: C.textSecondary, marginBottom: Spacing.lg },
    grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    // PeggyCard owns the surface, radius, padding and shadow.
    // Only the two-column grid width is this screen's own business.
    card: {
      width: '47%',
    },
    iconSlot: { marginBottom: Spacing.sm },
    cardLabel: { ...Typography.bodyBold, color: C.textPrimary, marginBottom: 4 },
    cardDesc:  { ...Typography.caption, color: C.textSecondary, lineHeight: 16 },
  });
}
