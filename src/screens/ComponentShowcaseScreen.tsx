import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PeggyPage, PeggyHeader, PeggyBottomNav, NavKey,
  PeggyCard, PeggyHeroCard, PeggySection, PeggyDivider,
  PeggyIconFrame, PeggyAvatar,
  PeggyGoalCard, PeggyQuickActionCard, PeggyListRow, PeggyStatCard, PeggyPickerTile, PeggyDocumentCard,
  PeggyButton, PeggyIconButton, PeggyInput, PeggyCurrencyInput, PeggySearchBar, PeggyForm,
  PeggyChip, PeggyBadge, PeggyNotificationBadge, PeggyProgressBar,
  PeggyCameraCapture, PeggyReceiptPreview,
  PeggyEmptyState, PeggyLoadingState, PeggyErrorState, PeggySuccessState,
  PeggyModal, PeggyConfirmationModal, PeggyDeleteConfirmation,
} from '../components/peggy';
import { IconFrameSize, IconFrameSizeName, Spacing, Typography, ColorPalette } from '../theme';
import { useColors } from '../context/ThemeContext';
import { ICON_REGISTRY, IconKey } from '../data/iconRegistry';

/**
 * ComponentShowcaseScreen — the PRIVATE Component Playground (Charter Phase 2).
 * Not a user destination. Every canonical component is exercised here in every
 * applicable state, so a component is perfected ONCE and every screen inherits
 * that quality. Reached via More ▸ Design System (dev).
 */

const SIZE_NAMES: IconFrameSizeName[] = ['compact', 'standard', 'card', 'feature', 'hero'];
const CONCEPTS: IconKey[] = ['travel', 'vehicle', 'home', 'food', 'health', 'debt', 'pet', 'shopping', 'gifts', 'education', 'investing', 'other'];
// Demo image for photo/thumbnail slots — resolved THROUGH the registry (no
// direct art import in a screen, even in the dev playground).
const DEMO_IMG = Image.resolveAssetSource(ICON_REGISTRY.pet.image).uri;

function money(n: number) { return '$' + n.toLocaleString('en-US'); }

export default function ComponentShowcaseScreen({ navigation }: any) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [nav, setNav] = useState<NavKey>('home');
  const [picked, setPicked] = useState<IconKey>('travel');
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [del, setDel] = useState(false);
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(true);

  return (
    <PeggyPage
      header={<PeggyHeader variant="large" title="Design System" subtitle="Component Playground · every state" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} right={<PeggyIconButton icon="color-palette-outline" onPress={() => {}} tone={C.primary} />} />}
      footer={<PeggyBottomNav active={nav} onPress={setNav} />}
    >
      {/* ICON FRAME — sizes */}
      <Section title="Icon frame · semantic sizes">
        <View style={styles.rowWrap}>
          {SIZE_NAMES.map((s) => (
            <View key={s} style={styles.cell}>
              <PeggyIconFrame iconKey="travel" size={s} shape="tile" />
              <Text style={styles.cap}>{s}</Text><Text style={styles.sub}>{IconFrameSize[s]}</Text>
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

      {/* FINAL vs PENDING + swap proof */}
      <Section title="Final vs pending · no layout movement on swap">
        <View style={styles.rowWrap}>
          <View style={styles.cell}><PeggyIconFrame iconKey="food" size="card" /><Text style={styles.cap}>Food</Text><Text style={styles.sub}>ready</Text></View>
          <View style={styles.cell}><PeggyIconFrame iconKey="bills" size="card" /><Text style={styles.cap}>Bills</Text><Text style={styles.sub}>pending</Text></View>
          <View style={styles.cell}><PeggyIconFrame iconKey="settings" size="card" /><Text style={styles.cap}>Settings</Text><Text style={styles.sub}>pending</Text></View>
          <View style={styles.cell}><PeggyIconFrame iconKey="profile" size="card" /><Text style={styles.cap}>Profile</Text><Text style={styles.sub}>pending</Text></View>
        </View>
        <Text style={[styles.note]}>Placeholder and final art occupy the exact same frame footprint — swapping the registry entry never moves anything.</Text>
      </Section>

      {/* ICON LANGUAGE */}
      <Section title="One icon language">
        <View style={styles.rowWrap}>
          {CONCEPTS.map((k) => (
            <View key={k} style={styles.cell}><PeggyIconFrame iconKey={k} size="card" shape="circle" /><Text style={styles.cap}>{ICON_REGISTRY[k].label}</Text></View>
          ))}
        </View>
      </Section>

      {/* AVATAR */}
      <Section title="Avatar · one circle, every mode">
        <View style={styles.rowWrap}>
          <View style={styles.cell}><PeggyAvatar size={56} name="Peggy" /><Text style={styles.cap}>initial</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} brand /><Text style={styles.cap}>brand</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} source={{ uri: DEMO_IMG }} name="C" /><Text style={styles.cap}>photo</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} brand bordered /><Text style={styles.cap}>bordered</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} name="C" dotColor={C.success} /><Text style={styles.cap}>status dot</Text></View>
          <View style={styles.cell}><PeggyAvatar size={56} brand badgeCount={3} /><Text style={styles.cap}>badge</Text></View>
        </View>
      </Section>

      {/* BUTTONS */}
      <Section title="Buttons · hierarchy & states">
        <PeggyButton label="Primary action" onPress={() => {}} />
        <View style={{ height: Spacing.sm }} />
        <PeggyButton label="Disabled" onPress={() => {}} disabled />
        <View style={{ height: Spacing.sm }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <PeggyButton variant="pill" label="Pill" onPress={() => {}} />
          <PeggyButton variant="fab" onPress={() => {}} icon={<Ionicons name="add" size={26} color="#fff" />} />
          <PeggyIconButton icon="heart-outline" onPress={() => {}} variant="soft" tone={C.danger} />
          <PeggyIconButton icon="share-outline" onPress={() => {}} variant="solid" tone={C.primary} />
          <PeggyIconButton icon="ellipsis-horizontal" onPress={() => {}} variant="plain" />
        </View>
      </Section>

      {/* INPUTS */}
      <Section title="Inputs · default · error · currency · search">
        <PeggyInput label="Name" placeholder="e.g. Groceries" />
        <View style={{ height: Spacing.sm }} />
        <PeggyInput label="Amount" placeholder="0.00" error="Please enter a number greater than 0." />
        <View style={{ height: Spacing.md }} />
        <Text style={styles.cap}>Currency</Text>
        <PeggyCurrencyInput value={amount} onChangeText={setAmount} />
        <View style={{ height: Spacing.md }} />
        <PeggySearchBar value={search} onChangeText={setSearch} placeholder="Search bills" />
      </Section>

      {/* CHIPS + BADGES */}
      <Section title="Chips · badges · notification badge">
        <View style={[styles.rowWrap, { alignItems: 'center' }]}>
          <PeggyChip label="Groceries" color={C.success} />
          <PeggyChip label="This month" color={C.primary} />
          <PeggyBadge label={3} />
          <PeggyBadge label="Overdue" tone={C.danger} />
          <PeggyBadge label="Paid" tone={C.success} solid />
          <View style={{ width: 44, height: 44 }}>
            <PeggyIconButton icon="notifications-outline" onPress={() => {}} />
            <PeggyNotificationBadge count={5} style={{ position: 'absolute', top: 0, right: 0 }} />
          </View>
        </View>
      </Section>

      {/* PROGRESS */}
      <Section title="Progress · milestone bands">
        <PeggyProgressBar pct={0.2} color={C.danger} /><View style={{ height: 8 }} />
        <PeggyProgressBar pct={0.5} color={C.primary} /><View style={{ height: 8 }} />
        <PeggyProgressBar pct={0.85} color={C.success} /><View style={{ height: 8 }} />
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

      {/* QUICK ACTIONS — now via registry concepts (placeholder-safe) */}
      <Section title="Quick actions">
        <View style={{ flexDirection: 'row', gap: Spacing.sm + 2 }}>
          <PeggyQuickActionCard tone="green" iconKey="food" label="Add Expense" onPress={() => {}} />
          <PeggyQuickActionCard tone="blue" iconKey="add-income" label="Add Income" onPress={() => {}} />
          <PeggyQuickActionCard tone="peach" iconKey="camera" label="Scan" onPress={() => {}} />
          <PeggyQuickActionCard tone="purple" iconKey="goals" label="Add Goal" onPress={() => {}} />
        </View>
      </Section>

      {/* GOAL CARD */}
      <Section title="Goal card · in-progress & complete">
        <PeggyGoalCard name="Vacation" current={1830} target={5000} formatAmount={money} iconKey="travel" artworkTint={ICON_REGISTRY.travel.color} onPress={() => {}} />
        <PeggyGoalCard name="Vet Fund" current={1200} target={1200} formatAmount={money} iconKey="pet" artworkTint={ICON_REGISTRY.pet.color} onPress={() => {}} style={{ marginTop: Spacing.sm }} />
      </Section>

      {/* LIST ROWS — short & long text */}
      <Section title="List rows · short & long text">
        <PeggyCard padded={false}>
          <PeggyListRow iconKey="food" iconColor={ICON_REGISTRY.food.color} title="Groceries" subtitle="Today" amount={'-' + money(64)} amountColor={C.danger} />
          <PeggyDivider />
          <PeggyListRow iconKey="bills" iconColor={ICON_REGISTRY.bills.color} title="Bell Telephone Plus Internet Plus Streaming Bundle" subtitle="Due in 22 days (26th of month)" amount={money(435)} />
          <PeggyDivider />
          <PeggyListRow iconKey="home" iconColor={ICON_REGISTRY.home.color} title="Rent" subtitle="Monthly" right={<Ionicons name="chevron-forward" size={18} color={C.textHint} />} />
        </PeggyCard>
      </Section>

      {/* DOCUMENT CARD */}
      <Section title="Document card (OCR result)">
        <PeggyDocumentCard title="Loblaws" subtitle="Aug 4, 2026 · Groceries" amount={money(84)} iconKey="food" statusLabel="Review" statusTone={C.warning} onPress={() => {}} />
        <View style={{ height: Spacing.sm }} />
        <PeggyDocumentCard title="Hydro One" subtitle="Captured receipt" amount={money(216)} thumbUri={DEMO_IMG} statusLabel="Ready" statusTone={C.success} onPress={() => {}} />
      </Section>

      {/* PICKER TILES */}
      <Section title="Picker tiles (selected)">
        <View style={styles.rowWrap}>
          {(['travel', 'food', 'health', 'pet'] as IconKey[]).map((k) => (
            <PeggyPickerTile key={k} iconKey={k} selected={picked === k} onPress={() => setPicked(k)} style={{ width: 92 }} />
          ))}
        </View>
      </Section>

      {/* FORM */}
      <Section title="Form scaffold">
        <PeggyForm
          title="New bill"
          footer={<PeggyButton label="Save bill" onPress={() => {}} />}
        >
          <PeggyInput label="Bill name" placeholder="e.g. Hydro" />
          <PeggyInput label="Amount" placeholder="0.00" keyboardType="decimal-pad" />
        </PeggyForm>
      </Section>

      {/* CAMERA FLOW */}
      <Section title="Camera capture & receipt preview">
        <View style={{ height: 240 }}>
          <PeggyCameraCapture onCapture={() => {}} onFlip={() => {}} onFlash={() => {}}>
            <View style={{ flex: 1, backgroundColor: '#1a1726' }} />
          </PeggyCameraCapture>
        </View>
        <View style={{ height: Spacing.sm }} />
        <PeggyReceiptPreview uri={DEMO_IMG} state={scanning ? 'scanning' : 'ready'} caption="Tap to re-scan" />
        <View style={{ height: Spacing.sm }} />
        <PeggyButton variant="pill" label={scanning ? 'Finish scan' : 'Scan again'} onPress={() => setScanning((s) => !s)} />
      </Section>

      {/* STATES */}
      <Section title="Empty · Loading · Error · Success">
        <PeggyCard><PeggyEmptyState title="No featured goal" message="Pin a goal to track it here." actionLabel="Browse" onAction={() => {}} /></PeggyCard>
        <View style={{ height: Spacing.sm }} />
        <PeggyCard><PeggyLoadingState message="Reading your document…" /></PeggyCard>
        <View style={{ height: Spacing.sm }} />
        <PeggyCard><PeggyErrorState onRetry={() => {}} /></PeggyCard>
        <View style={{ height: Spacing.sm }} />
        <PeggyCard><PeggySuccessState title="Saved!" message="Your bill was added." /></PeggyCard>
      </Section>

      {/* OVERLAYS */}
      <Section title="Overlays · sheet · confirm · delete">
        <View style={[styles.rowWrap]}>
          <PeggyButton variant="pill" label="Open sheet" onPress={() => setModal(true)} />
          <PeggyButton variant="pill" label="Confirm" onPress={() => setConfirm(true)} />
          <PeggyButton variant="pill" label="Delete" onPress={() => setDel(true)} />
        </View>
      </Section>

      {/* ACCESSIBILITY */}
      <Section title="Accessibility · large text">
        <PeggyCard>
          <Text style={[Typography.cardTitle, { color: C.textPrimary, fontSize: 22 }]}>Big, readable titles</Text>
          <Text style={[Typography.body, { color: C.textSecondary, fontSize: 19, lineHeight: 30 }]}>Body scales for readability; touch targets stay ≥44px. Device font-scale is verified on-device.</Text>
        </PeggyCard>
      </Section>

      <View style={{ height: Spacing.xl }} />

      <PeggyModal visible={modal} onClose={() => setModal(false)} title="Choose an action">
        <PeggyListRow iconKey="add-expense" iconColor={ICON_REGISTRY['add-expense'].color} title="Add expense" onPress={() => setModal(false)} />
        <PeggyListRow iconKey="goals" iconColor={ICON_REGISTRY.goals.color} title="Add goal" onPress={() => setModal(false)} />
      </PeggyModal>
      <PeggyConfirmationModal visible={confirm} title="Mark as paid?" message="This moves the bill to paid for this cycle." confirmLabel="Mark paid" onConfirm={() => setConfirm(false)} onCancel={() => setConfirm(false)} />
      <PeggyDeleteConfirmation visible={del} title="Delete this bill?" onConfirm={() => setDel(false)} onCancel={() => setDel(false)} />
    </PeggyPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
    note: { ...Typography.caption, color: C.textSecondary, marginTop: Spacing.sm, lineHeight: 17 },
  });
}
