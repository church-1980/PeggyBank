import React, { useCallback, useRef, useState } from 'react';
import { View, Text, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../database/database';
import { currentCycleDate, paidCyclesFor } from '../lib/billCycles';
import { loadFinanceSummary, loadSafeToSpendExplanation, type SafeToSpendExplanation } from '../lib/financeSummary';
import { recentActivity, type ActivityItem } from '../lib/activity';
import PeggyActivityRow from '../components/peggy/PeggyActivityRow';
import { formatCurrency, getDaysUntil } from '../utils/helpers';
import { SavingsGoal, Bill, Category } from '../types';
import { Spacing, Typography, IconSize, Radius } from '../theme';
import { useColors } from '../context/ThemeContext';
import { CATEGORIES } from '../data/categories';
import { categoryIconKey, goalIconKey, ICON_REGISTRY } from '../data/iconRegistry';
import {
  PeggyScreen, PeggyHeroCard, PeggySectionHeader, PeggyCard,
  PeggyQuickActionCard, PeggyGoalCard, PeggyListRow, PeggyEmptyState,
  PeggyAvatar, PeggyButton, PeggyProgressBar, PeggyIconFrame,
} from '../components/peggy';

interface MonthSummary {
  totalIncome: number;
  totalSpending: number;
  moneyLeft: number;
  safeToSpend: number;
}

function greetingForNow(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * Rotating welcome lines. The owner's name is the point of this header, so it
 * appears in the message too — a different one each time Home is opened.
 */
const WELCOME_LINES: ((name: string) => string)[] = [
  (n) => `Nice to see you again, ${n} 💜`,
  (n) => `${n}, every small step counts.`,
  (n) => `You're doing amazing today, ${n}!`,
  (n) => `Let's make today count, ${n}.`,
  (n) => `${n}, your future self says thanks.`,
  (n) => `Small wins add up, ${n}.`,
  (n) => `Steady as you go, ${n}.`,
  (n) => `${n}, you've got this.`,
  (n) => `Good to have you back, ${n}.`,
  (n) => `${n}, one layer at a time.`,
];

function welcomeLine(name: string | undefined, tick: number): string {
  if (!name) return "You're doing amazing today! 💜";
  return WELCOME_LINES[tick % WELCOME_LINES.length](name);
}

export default function DashboardScreen({ navigation }: any) {
  const C = useColors();
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0, totalSpending: 0, moneyLeft: 0, safeToSpend: 0,
  });
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [pinnedGoals, setPinnedGoals] = useState<SavingsGoal[]>([]);
  const [suggestion, setSuggestion] = useState('');
  // What happened lately, and why Safe to Spend is what it is. Both are read
  // from records that already exist; Home stores no figures of its own.
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [explaining, setExplaining] = useState<SafeToSpendExplanation | null>(null);

  const openExplanation = async () => {
    try {
      const db = await getDatabase();
      setExplaining(await loadSafeToSpendExplanation(db));
    } catch { /* no explanation is better than a wrong one */ }
  };
  const [refreshing, setRefreshing] = useState(false);
  const [profileName, setProfileName] = useState('');
  // Picked once per mount so the welcome line differs each time Home is opened.
  // A ref (not state) on purpose: setting state from the focus effect re-renders
  // and loops.
  const welcomeTick = useRef(Math.floor(Math.random() * WELCOME_LINES.length)).current;
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = await getDatabase();

      // Profile (shared with the Profile screen via the settings table)
      const nameRow = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = 'display_name'`);
      const photoRow = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = 'profile_photo_uri'`);
      setProfileName(nameRow?.value?.trim() ?? '');
      setProfilePhoto(photoRow?.value ? photoRow.value : null);

      // Every figure on this screen comes from the ONE shared engine, so the
      // Dashboard and the Weekly Check-In can never show different amounts.
      const finance = await loadFinanceSummary(db);
      // A short preview only: Home asks for the few rows it shows, not a
      // year of history it would immediately throw away.
      setActivity(await recentActivity(db, 4));
      const totalIncome = finance.monthIncome;
      const totalSpending = finance.monthSpending;

      const pinnedGoalsResult = await db.getAllAsync<SavingsGoal>(
        `SELECT * FROM savings_goals WHERE pinned = 1 ORDER BY created_at ASC`
      );
      setPinnedGoals(pinnedGoalsResult);

      const bills = await db.getAllAsync<Bill>(`SELECT * FROM bills`);
      // Only what is still owed for the CURRENT occurrence. Reading is_paid off
      // the bill meant last month's payment silently reduced this month's total,
      // and hid the bill from Coming Up forever.
      const paidBillCycles = await paidCyclesFor(db, 'bill');
      const unpaidBills = bills.filter(
        (b) => !paidBillCycles.get(b.id as number)?.has(currentCycleDate(b as any))
      );

      // NOTE: this used to read only the three most recent goals (LIMIT 3), so a
      // person with four or more goals had the rest silently left out of Safe to
      // Spend, and was told more was safe than really was. The shared engine
      // counts every goal.
      const moneyLeft = finance.moneyLeft;
      const safeToSpend = finance.safeToSpend;

      setSummary({ totalIncome, totalSpending, moneyLeft, safeToSpend });

      const sortedBills = [...unpaidBills].sort(
        (a, b) => getDaysUntil(a.due_day ?? 1) - getDaysUntil(b.due_day ?? 1)
      );
      setUpcomingBills(sortedBills.slice(0, 3));

      // A few goal names, only so the suggestion below can mention one.
      // DISPLAY ONLY: Safe to Spend counts every goal via the shared engine,
      // never this shortened list.
      const goalsResult = await db.getAllAsync<SavingsGoal>(
        `SELECT * FROM savings_goals ORDER BY created_at DESC LIMIT 3`
      );

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
          {/* Top-left is the PeggyBank logo (spec). Always shows Peggy; a saved
              profile photo lives on the Profile screen, not here. */}
          <PeggyAvatar size={84} brand bare />
        </TouchableOpacity>
        {/* The owner's name is the headline here, on its own line, so it is
            always fully readable — it must never truncate to "Pau...". */}
        <View style={{ flex: 1, marginLeft: Spacing.sm + 4 }}>
          <Text style={[Typography.helper, { color: C.textSecondary }]} numberOfLines={1}>
            {greetingForNow()} 👋
          </Text>
          {profileName ? (
            <Text
              style={[Typography.greeting, { color: C.textPrimary }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {profileName}
            </Text>
          ) : null}
          <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 2 }]} numberOfLines={2}>
            {welcomeLine(profileName, welcomeTick)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Notifications and settings"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PeggyIconFrame iconKey="notifications" size={38} tinted={false} />
        </TouchableOpacity>
      </View>

      {/* ── Hero: Safe to Spend (§3) ───────────────────────────── */}
      <PeggyHeroCard onPress={openExplanation}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Safe to Spend. Tap to see how this number was worked out"
        >
          <Text style={[Typography.helper, { color: C.glassText, fontWeight: '600' }]}>Safe to Spend</Text>
          <Ionicons name="information-circle-outline" size={14} color={C.glassText} />
        </View>
        <Text style={[Typography.heroAmount, { color: C.glassBright, marginTop: 6 }]}>
          {formatCurrency(summary.safeToSpend)}
        </Text>

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

      {/* ── What happened ─────────────────────────────────────── */}
      {activity.length > 0 && (
        <>
          <PeggySectionHeader title="What happened" onAction={() => navigation.navigate('Activity')} />
          <PeggyCard>
            {activity.map((a, i) => (
              <View key={a.key}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: C.border }} /> : null}
                <PeggyActivityRow item={a} onPress={() => navigation.navigate('Activity')} />
              </View>
            ))}
          </PeggyCard>
        </>
      )}

      {/* ── Quick Add (§6) ─────────────────────────────────────── */}
      <PeggySectionHeader title="Quick Add" />
      <View style={{ flexDirection: 'row', gap: Spacing.sm + 2 }}>
        <PeggyQuickActionCard tone="green"  iconKey="add-expense" label="Add Expense" onPress={() => navigation.navigate('AddExpense')} />
        <PeggyQuickActionCard tone="blue"   iconKey="add-income"  label="Add Income"  onPress={() => navigation.navigate('AddIncome')} />
        <PeggyQuickActionCard tone="peach"  iconKey="bills"      label="Add Bill"    onPress={() => navigation.navigate('Bills')} />
        <PeggyQuickActionCard tone="purple" iconKey="goals"       label="Add to Goal" onPress={() => navigation.navigate('Goals')} />
      </View>

      {/* ── Your Goals (§4) ────────────────────────────────────── */}
      <PeggySectionHeader title="Your Goals" onAction={() => navigation.navigate('Goals')} />
      {pinnedGoals.length > 0 ? (
        pinnedGoals.map((goal, i) => {
          const gKey = goalIconKey(goal.name, goal.goal_type);
          return (
            <PeggyGoalCard
              key={goal.id}
              name={goal.name}
              current={goal.current_amount}
              target={goal.target_amount}
              formatAmount={formatCurrency}
              iconKey={gKey}
              artworkTint={ICON_REGISTRY[gKey].color}
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

      {/* ── Why is that my number? ─────────────────────────────── */}
      <Modal
        visible={!!explaining}
        transparent
        animationType="slide"
        onRequestClose={() => setExplaining(null)}
      >
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000066' }}
          activeOpacity={1}
          onPress={() => setExplaining(null)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          backgroundColor: C.bgCard, padding: Spacing.lg,
          borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
        }}>
          <Text style={[Typography.h3, { color: C.textPrimary }]}>Your Safe to Spend</Text>
          <Text style={[Typography.helper, { color: C.textSecondary, marginTop: 4, marginBottom: Spacing.md }]}>
            Where this month&apos;s number comes from.
          </Text>

          {explaining?.lines.map(line => (
            <View key={line.key} style={{ marginBottom: Spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[Typography.body, { color: C.textPrimary, flex: 1 }]}>{line.label}</Text>
                <Text style={[Typography.bodyBold, {
                  color: line.amount < 0 ? C.textPrimary : C.income,
                }]}>
                  {line.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(line.amount))}
                </Text>
              </View>
              {/* One level of detail: enough to answer "which bills?" */}
              {line.detail?.slice(0, 4).map((d, i) => (
                <View key={line.key + i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: Spacing.md, marginTop: 2 }}>
                  <Text style={[Typography.caption, { color: C.textSecondary }]}>{d.label}</Text>
                  <Text style={[Typography.caption, { color: C.textSecondary }]}>{formatCurrency(d.amount)}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: C.border, marginVertical: Spacing.sm }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>Safe to Spend</Text>
            <Text style={[Typography.h3, { color: C.primary }]}>
              {formatCurrency(explaining?.safeToSpend ?? 0)}
            </Text>
          </View>

          {explaining?.shortfall ? (
            <Text style={[Typography.caption, { color: C.textSecondary, marginTop: Spacing.sm }]}>
              This month&apos;s bills and savings come to more than has come in, so there is
              nothing spare. We show zero rather than a negative number.
            </Text>
          ) : null}

          <TouchableOpacity
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md }}
            onPress={() => setExplaining(null)}
            accessibilityRole="button"
            accessibilityLabel="Close this explanation"
          >
            <Text style={[Typography.body, { color: C.textSecondary, fontWeight: '600' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </PeggyScreen>
  );
}
