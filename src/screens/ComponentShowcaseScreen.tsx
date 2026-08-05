import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PeggyPage, PeggyHeader, PeggyBottomNav, NavKey,
  PeggyCard, PeggyHeroCard, PeggySection, PeggyDivider,
  PeggyIconFrame, PeggyAvatar,
  PeggyGoalCard, PeggyQuickActionCard, PeggyListRow, PeggyStatCard, PeggyPickerTile,
  PeggyButton, PeggyIconButton, PeggyInput, PeggyCurrencyInput, PeggyChip, PeggyBadge, PeggyProgressBar,
  PeggyEmptyState, PeggyLoadingState, PeggyErrorState, PeggyModal, PeggyConfirmationModal,
} from '../components/peggy';
import { IconFrameSize, IconFrameSizeName, Spacing, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { ICON_REGISTRY, IconKey } from '../data/iconRegistry';

/**
 * ComponentShowcaseScreen — PRIVATE dev gallery. Not a user destination.
 * Proves the shared system is visually uniform before it is copied across the
 * 23 product screens. Every element here is a canonical component.
 */

const SIZE_NAMES: IconFrameSizeName[] = ['compact', 'standard', 'card', 'feature', 'hero'];
const CONCEPTS: IconKey[] = ['travel', 'vehicle', 'home', 'food', 'health', 'debt', 'pet', 'shopping', 'gifts', 'education', 'investing', 'other'];

function money(n: number) { return '$' + n.toLocaleString('en-US'); }

export default function ComponentShowcaseScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [nav, setNav] = useState<NavKey>('home');
  const [picked, setPicked] = useState<IconKey>('travel');
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [amount, setAmount] = useState('');

  return (
    <PeggyPage
      header={<PeggyHeader variant="large" title="Design System" subtitle="Every canonical component, one language" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} right={<PeggyIconButton icon="color-palette-outline" onPress={() => {}} tone={C.primary} />} />}
      footer={<PeggyBottomNav active={nav} onPress={setNav} />}
    >
      {/* ICON FRAME — sizes */}
      <Section title="Icon frame · semantic sizes">
        <View style={styles.rowWrap}>
          {SIZE_NAMES.map((s) => (
            <View key={s} style={styles.cell}>
              <PeggyIconFrame iconKey="travel" size={s} shape="tile" />
              <Text style={styles.cap}>{s}</Text>
              <Text style={styles.sub}>{IconFrameSize[s]}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* ICON FRAME — shapes & states */}
      <Section title="Icon frame · shapes & states">
        <View style={styles.rowWrap}>
          <View style={styles.cell}><PeggyIconFrame iconKey="home" size="card" shape="circle" /><Text style={styles.cap}>circle</Text></View>
          <View style={styles.cell}><PeggyIconFrame iconKey="home" size="card" shape="tile" /><Text style={styles.cap}>tile</Text></View>
          <View style={styles.cell}><PeggyIconFrame iconKey="home" size="card" shape="tile" selected /><Text style={styles.cap}>selected</Text></View>
          <View style={styles.cell}><PeggyIconFrame iconKey="home" size="card" shape="tile" disabled /><Text style={styles.cap}>disabled</Text></View>
        </View>
      </Section>

      {/* ICON LANGUAGE */}
      <Section title="One icon language">
        <View style={styles.rowWrap}>
          {CONCEPTS.map((k) => (
            <View key={k} style={styles.cell}>
              <PeggyIconFrame iconKey={k} size="card" shape="circle" />
              <Text style={styles.cap}>{ICON_REGISTRY[k].label}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* AVATAR */}
      <Section title="Avatar · one circle, every mode">
        <View style={styles.rowWrap}>
          <View style={styles.cell}><PeggyAvatar size={56} name="Peggy" /><Text style={styles.cap}>initial</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} brand /><Text style={styles.cap}>brand</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} brand bordered /><Text style={styles.cap}>bordered</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} name="Church" dotColor={C.success} /><Text style={styles.cap}>status dot</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} brand badgeCount={3} /><Text style={styles.cap}>badge</Text></View>
        </View>
      </Section>

      {/* BUTTONS */}
      <Section title="Buttons">
        <PeggyButton label="Primary action" onPress={() => {}} />
        <View style={{ height: Spacing.sm }} />
        <PeggyButton label="Disabled" onPress={() => {}} disabled />
        <View style={{ height: Spacing.sm }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <PeggyButton variant="pill" label="Pill" onPress={() => {}} />
          <PeggyButton variant="fab" onPress={() => {}} icon={<Ionicons name="add" size={26} color="#fff" />} />
          <PeggyIconButton icon="heart-outline" onPress={() => {}} variant="soft" tone={C.danger} />
          <PeggyIconButton icon="share-outline" onPress={() => {}} variant="solid" tone={C.primary} />
        </View>
      </Section>

      {/* INPUTS */}
      <Section title="Inputs">
        <PeggyInput label="Name" placeholder="e.g. Groceries" />
        <View style={{ height: Spacing.md }} />
        <Text style={styles.cap}>Currency</Text>
        <PeggyCurrencyInput value={amount} onChangeText={setAmount} />
      </Section>

      {/* CHIPS + BADGES */}
      <Section title="Chips & badges">
        <View style={styles.rowWrap}>
          <PeggyChip label="Groceries" color={C.success} />
          <PeggyChip label="This month" color={C.primary} />
          <PeggyBadge label={3} />
          <PeggyBadge label="Overdue" tone={C.danger} />
          <PeggyBadge label="Paid" tone={C.success} solid />
        </View>
      </Section>

      {/* PROGRESS */}
      <Section title="Progress bars">
        <PeggyProgressBar pct={0.2} color={C.danger} />
        <View style={{ height: 8 }} />
        <PeggyProgressBar pct={0.5} color={C.primary} />
        <View style={{ height: 8 }} />
        <PeggyProgressBar pct={0.85} color={C.success} />
        <View style={{ height: 8 }} />
        <PeggyProgressBar pct={1} color={C.gold} />
      </Section>

      {/* HERO */}
      <Section title="Hero card">
        <PeggyHeroCard>
          <Text style={[Typography.helper, { color: C.glassText, fontWeight: '600' }]}>Safe to Spend</Text>
          <Text style={[Typography.heroAmount, { color: C.glassBright, marginTop: 6 }]}>{money(2450)}</Text>
          <PeggyProgressBar pct={0.62} color={C.glassBright} trackColor="rgba(255,255,255,0.22)" height={7} style={{ marginTop: Spacing.sm }} />
        </PeggyHeroCard>
      </Section>

      {/* STAT CARDS */}
      <Section title="Stat cards">
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <PeggyStatCard label="Income" value={money(3000)} valueColor={C.success} style={{ flex: 1 }} />
          <PeggyStatCard label="Spent" value={money(1830)} valueColor={C.danger} style={{ flex: 1 }} />
        </View>
      </Section>

      {/* QUICK ACTIONS */}
      <Section title="Quick actions">
        <View style={{ flexDirection: 'row', gap: Spacing.sm + 2 }}>
          <PeggyQuickActionCard tone="green" iconKey="food" label="Add Expense" onPress={() => {}} />
          <PeggyQuickActionCard tone="blue" ionicon="cash" label="Add Income" onPress={() => {}} />
          <PeggyQuickActionCard tone="peach" ionicon="camera" label="Scan" onPress={() => {}} />
          <PeggyQuickActionCard tone="purple" iconKey="gifts" label="Add Goal" onPress={() => {}} />
        </View>
      </Section>

      {/* GOAL CARD */}
      <Section title="Goal card">
        <PeggyGoalCard name="Vacation" current={1830} target={5000} formatAmount={money} iconKey="travel" artworkTint={ICON_REGISTRY.travel.color} onPress={() => {}} />
        <PeggyGoalCard name="Vet Fund" current={1200} target={1200} formatAmount={money} iconKey="pet" artworkTint={ICON_REGISTRY.pet.color} onPress={() => {}} style={{ marginTop: Spacing.sm }} />
      </Section>

      {/* LIST ROWS */}
      <Section title="List rows">
        <PeggyCard padded={false}>
          <PeggyListRow iconKey="food" iconColor={ICON_REGISTRY.food.color} title="Groceries" subtitle="Today" amount={'-' + money(64)} amountColor={C.danger} />
          <PeggyDivider />
          <PeggyListRow iconKey="debt" iconColor={ICON_REGISTRY.debt.color} title="Visa" subtitle="Due in 3 days" amount={money(120)} />
          <PeggyDivider />
          <PeggyListRow iconKey="home" iconColor={ICON_REGISTRY.home.color} title="Rent" subtitle="Monthly" right={<Ionicons name="chevron-forward" size={18} color={C.textHint} />} />
        </PeggyCard>
      </Section>

      {/* PICKER TILES */}
      <Section title="Picker tiles (selected state)">
        <View style={styles.rowWrap}>
          {(['travel', 'food', 'health', 'pet'] as IconKey[]).map((k) => (
            <PeggyPickerTile key={k} iconKey={k} selected={picked === k} onPress={() => setPicked(k)} style={{ width: 92 }} />
          ))}
        </View>
      </Section>

      {/* STATES */}
      <Section title="Empty · Loading · Error">
        <PeggyCard><PeggyEmptyState title="No featured goal" message="Pin a goal to track it here." actionLabel="Browse" onAction={() => {}} /></PeggyCard>
        <View style={{ height: Spacing.sm }} />
        <PeggyCard><PeggyLoadingState message="Reading your document…" /></PeggyCard>
        <View style={{ height: Spacing.sm }} />
        <PeggyCard><PeggyErrorState onRetry={() => {}} /></PeggyCard>
      </Section>

      {/* OVERLAYS */}
      <Section title="Overlays">
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <PeggyButton variant="pill" label="Open sheet" onPress={() => setModal(true)} />
          <PeggyButton variant="pill" label="Confirm dialog" onPress={() => setConfirm(true)} />
        </View>
      </Section>

      <View style={{ height: Spacing.xl }} />

      <PeggyModal visible={modal} onClose={() => setModal(false)} title="Choose an action">
        <PeggyListRow iconKey="food" iconColor={ICON_REGISTRY.food.color} title="Add expense" onPress={() => setModal(false)} />
        <PeggyListRow iconKey="gifts" iconColor={ICON_REGISTRY.gifts.color} title="Add goal" onPress={() => setModal(false)} />
      </PeggyModal>

      <PeggyConfirmationModal
        visible={confirm}
        title="Delete all data?"
        message="This removes everything from this device. It can't be undone."
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </PeggyPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const C = useColors();
  return (
    <PeggySection title={title} style={{ marginTop: Spacing.lg }}>
      <View style={{ marginTop: Spacing.xs }}>{children}</View>
    </PeggySection>
  );
}

function makeStyles(C: ColorPalette) {
  return StyleSheet.create({
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, alignItems: 'flex-start' },
    cell: { alignItems: 'center', gap: 4 },
    cap: { ...Typography.caption, color: C.textPrimary, fontWeight: '600' },
    sub: { ...Typography.caption, color: C.textHint },
  });
}
