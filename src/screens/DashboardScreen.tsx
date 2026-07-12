import React, { useCallback, useState } from 'react';
import { View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { formatCurrency, getMonthRange, getDaysUntil } from '../utils/helpers';
import { SavingsGoal, Bill, Category } from '../types';
import { Spacing, Typography, IconSize } from '../theme';
import { useColors } from '../context/ThemeContext';
import { CATEGORIES } from '../data/categories';
import { categoryIconKey } from '../data/iconRegistry';
import { GOAL_TYPES, GoalType } from '../data/goalTypes';
import {
  PeggyScreen, PeggyHeroCard, PeggySectionHeader, PeggyCard,
  PeggyQuickActionCard, PeggyGoalCard, PeggyListRow, PeggyEmptyState,
  PeggyAvatar, PeggyButton, PeggyProgressBar, PeggyIllustration,
} from '../components/peggy';

interface MonthSummary {
  totalIncome: number;
  totalSpending: number;
  moneyLeft: number;
  safeToSpend: number;
}

function greetingForNow(name?: string): string {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${g}, ${name}!` : `${g}!`;
}

export default function DashboardScreen({ navigation }: any) {
  const C = useColors();
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0, totalSpending: 0, moneyLeft: 0, safeToSpend: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [pinnedGoals, setPinnedGoals] = useState<SavingsGoal[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const { start, end } = getMonthRange();

      // Profile (shared with the Profile screen via the settings table)
      const nameRow = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = 'display_name'`);
      const photoRow = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = 'profile_photo_uri'`);
      setProfileName(nameRow?.value?.trim() ?? '');
      setProfilePhoto(photoRow?.value ? photoRow.value : null);

      const incomeResult = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE date >= ? AND date <= ?`,
        [start, end]
      );
      const expenseResult = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?`,
        [start, end]
      );

      const totalIncome = incomeResult?.total ?? 0;
      const totalSpending = expenseResult?.total ?? 0;

      const pinnedGoalsResult = await db.getAllAsync<SavingsGoal>(
        `SELECT * FROM savings_goals WHERE pinned = 1 ORDER BY created_at ASC`
      );
      setPinnedGoals(pinnedGoalsResult);

      const bills = await db.getAllAsync<Bill>(`SELECT * FROM bills`);
      const unpaidBills = bills.filter((b) => !b.is_paid);
      const unpaidTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

      const goalsResult = await db.getAllAsync<SavingsGoal>(
        `SELECT * FROM savings_goals ORDER BY created_at DESC LIMIT 3`
      );
      const goalsSavingsNeeded = goalsResult.reduce((sum, g) => {
        return sum + Math.max(0, g.target_amount - g.current_amount) / 12;
      }, 0);

      const moneyLeft = totalIncome - totalSpending;
      const safeToSpend = Math.max(0, moneyLeft - unpaidTotal - goalsSavingsNeeded);

      setSummary({ totalIncome, totalSpending, moneyLeft, safeToSpend });

      const sortedBills = [...unpaidBills].sort(
        (a, b) => getDaysUntil(a.due_day ?? 1) - getDaysUntil(b.due_day ?? 1)
      );
      setUpcomingBills(sortedBills.slice(0, 3));

      if (safeToSpend > 50 && totalIncome > 0) {
        const extra = Math.round(safeToSpend * 0.2);
        if (goalsResult.length > 0) {
          setSuggestion(`You have some breathing room this month. Want to move ${formatCurrency(extra)} toward "${goalsResult[0].name}"?`);
        } else {
          setSuggestion('You have some breathing room this month. A small emergency fund could protect you.');
        }
      } else {
        setSuggestion('');
      }
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Hero "spent of income" progress (Bible shows spent-of-budget %). App has no
  // budget concept, so monthly income is the reference. [Flagged in report.]
  const spentPct = summary.totalIncome > 0 ? summary.totalSpending / summary.totalIncome : 0;
  const spentPctInt = Math.round(spentPct * 100);

  return (
    <PeggyScreen
      contentStyle={{ paddingBottom: 140 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* ── Header (§2) ────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, marginBottom: Spacing.md }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <PeggyAvatar size={44} name={profileName || 'P'} source={profilePhoto ? { uri: profilePhoto } : undefined} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.sm + 4 }}>
          <Text style={[Typography.greeting, { color: C.textPrimary }]} numberOfLines={1}>
            {greetingForNow(profileName)} 👋
          </Text>
          <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 1 }]} numberOfLines={1}>
            You're doing amazing today! 💜
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications-outline" size={24} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Hero: Safe to Spend (§3) ───────────────────────────── */}
      <PeggyHeroCard>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={[Typography.helper, { color: C.glassText, fontWeight: '600' }]}>Safe to Spend</Text>
              <Ionicons name="information-circle-outline" size={14} color={C.glassText} />
            </View>
            <Text style={[Typography.heroAmount, { color: C.glassBright, marginTop: 6 }]}>
              {formatCurrency(summary.safeToSpend)}
            </Text>
          </View>
          {/* Reserved slot for the PeggyBank piggy illustration (Bible §3).
              Placeholder now; real art drops into `source` later with no layout shift. */}
          <PeggyIllustration size={76} circle tint={C.glassBright} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={[Typography.helper, { color: C.glassText }]}>
            of {formatCurrency(summary.totalIncome)} this month
          </Text>
          <Text style={[Typography.percent, { color: C.glassBright }]}>{spentPctInt}%</Text>
        </View>

        <PeggyProgressBar
          pct={spentPct}
          color={C.glassBright}
          trackColor="rgba(255,255,255,0.22)"
          height={7}
          style={{ marginTop: Spacing.sm }}
        />

        <PeggyButton
          variant="pill"
          label="View full breakdown"
          onPress={() => navigation.navigate('MonthlyBreakdown')}
          iconRight={<Ionicons name="chevron-down" size={14} color={C.glassBright} />}
          style={{ marginTop: Spacing.md }}
        />
      </PeggyHeroCard>

      {/* Suggestion — NOT in the Bible; kept as a soft nudge. [Flagged.] */}
      {suggestion ? (
        <PeggyCard style={{ marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
          <Ionicons name="bulb-outline" size={IconSize.sm} color={C.warning} style={{ marginTop: 1 }} />
          <Text style={[Typography.helper, { color: C.textSecondary, flex: 1, lineHeight: 19 }]}>{suggestion}</Text>
        </PeggyCard>
      ) : null}

      {/* ── Quick Add (§6) ─────────────────────────────────────── */}
      <PeggySectionHeader title="Quick Add" onAction={() => navigation.navigate('QuickAdd')} />
      <View style={{ flexDirection: 'row', gap: Spacing.sm + 2 }}>
        <PeggyQuickActionCard tone="green"  ionicon="receipt"     label="Add Expense" onPress={() => navigation.navigate('AddExpense')} />
        <PeggyQuickActionCard tone="blue"   ionicon="cash"        label="Add Income"  onPress={() => navigation.navigate('AddIncome')} />
        <PeggyQuickActionCard tone="peach"  ionicon="camera"      label="Scan Receipt" onPress={() => navigation.navigate('AddExpense', { openCamera: true })} />
        <PeggyQuickActionCard tone="purple" ionicon="add-circle"  label="Add to Goal" onPress={() => navigation.navigate('Goals')} />
      </View>

      {/* ── Your Goals (§4) ────────────────────────────────────── */}
      <PeggySectionHeader title="Your Goals" onAction={() => navigation.navigate('Goals')} />
      {pinnedGoals.length > 0 ? (
        pinnedGoals.map((goal, i) => {
          const typeInfo = GOAL_TYPES[(goal.goal_type ?? 'other') as GoalType] ?? GOAL_TYPES.other;
          return (
            <PeggyGoalCard
              key={goal.id}
              name={goal.name}
              current={goal.current_amount}
              target={goal.target_amount}
              formatAmount={formatCurrency}
              artworkTint={typeInfo.color}
              onPress={() => navigation.navigate('Goals')}
              style={i > 0 ? { marginTop: Spacing.sm + 2 } : undefined}
            />
          );
        })
      ) : (
        <PeggyCard>
          <PeggyEmptyState
            title="No featured goal"
            message="Pin a goal to track your progress here."
            actionLabel="Browse"
            onAction={() => navigation.navigate('Goals')}
          />
        </PeggyCard>
      )}

      {/* ── Coming Up (§14) ────────────────────────────────────── */}
      {upcomingBills.length > 0 && (
        <>
          <PeggySectionHeader title="Coming Up" onAction={() => navigation.navigate('Bills')} />
          <PeggyCard>
            {upcomingBills.map((bill, i) => {
              const days = getDaysUntil(bill.due_day ?? 1);
              const cat = (bill.category as Category) ?? 'other';
              const catInfo = CATEGORIES[cat] ?? CATEGORIES.other;
              return (
                <View key={bill.id}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: C.borderLight }} /> : null}
                  <PeggyListRow
                    iconKey={categoryIconKey(cat)}
                    iconColor={catInfo.color}
                    title={bill.name}
                    subtitle={days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}
                    amount={formatCurrency(bill.amount)}
                    amountColor={C.amount}
                    onPress={() => navigation.navigate('Bills')}
                  />
                </View>
              );
            })}
          </PeggyCard>
        </>
      )}
    </PeggyScreen>
  );
}
