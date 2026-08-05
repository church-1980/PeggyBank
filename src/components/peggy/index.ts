/**
 * The PeggyBank component library.
 *
 * Every visual element in the app is composed from these. They encode the rules
 * in docs/PEGGYBANK_DESIGN_SYSTEM.md, which were extracted from the approved
 * Design Bible (design/PeggyBank-Design-Bible.png).
 *
 * RULE: Nothing enters the application unless it is built from these components.
 * No screen may define its own card, shadow, radius, icon container, button,
 * input, progress bar, list row, or empty state.
 */

// ── Page shell ────────────────────────────────────────────────────────────────
export { default as PeggyPage } from './PeggyPage';
export { default as PeggyScreen } from './PeggyScreen';
export { default as PeggyHeader } from './PeggyHeader';
export { default as PeggyBackButton } from './PeggyBackButton';
export { default as PeggyBottomNav } from './PeggyBottomNav';
export type { NavKey } from './PeggyBottomNav';

// ── Surfaces & structure ──────────────────────────────────────────────────────
export { default as PeggyCard } from './PeggyCard';
export { default as PeggyHeroCard } from './PeggyHeroCard';
export { default as PeggySection } from './PeggySection';
export { default as PeggySectionHeader } from './PeggySectionHeader';
export { default as PeggyDivider } from './PeggyDivider';

// ── Icons & avatar (one pipeline) ─────────────────────────────────────────────
export { default as PeggyIconFrame } from './PeggyIconFrame';
export { default as PeggyIconBadge } from './PeggyIconBadge';   // deprecated shim → PeggyIconFrame
export { default as PeggyAvatar } from './PeggyAvatar';
export { default as PeggyIllustration } from './PeggyIllustration';

// ── Content cards & rows ──────────────────────────────────────────────────────
export { default as PeggyGoalCard, goalProgressColor, goalEncouragement, goalEncouragementSecondary } from './PeggyGoalCard';
export { default as PeggyQuickActionCard } from './PeggyQuickActionCard';
export { default as PeggyListRow } from './PeggyListRow';
export { default as PeggyStatCard } from './PeggyStatCard';
export { default as PeggyPickerTile } from './PeggyPickerTile';

// ── Controls ──────────────────────────────────────────────────────────────────
export { default as PeggyButton } from './PeggyButton';
export { default as PeggyIconButton } from './PeggyIconButton';
export { default as PeggyInput } from './PeggyInput';
export { default as PeggyCurrencyInput } from './PeggyCurrencyInput';
export { default as PeggyChip } from './PeggyChip';
export { default as PeggyBadge } from './PeggyBadge';
export { default as PeggyProgressBar } from './PeggyProgressBar';

// ── States & overlays ─────────────────────────────────────────────────────────
export { default as PeggyEmptyState } from './PeggyEmptyState';
export { default as PeggyLoadingState } from './PeggyLoadingState';
export { default as PeggyErrorState } from './PeggyErrorState';
export { default as PeggyModal } from './PeggyModal';
export { default as PeggyConfirmationModal } from './PeggyConfirmationModal';

export type { PastelTone } from './PeggyQuickActionCard';
