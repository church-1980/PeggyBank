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

export { default as PeggyScreen } from './PeggyScreen';
export { default as PeggyCard } from './PeggyCard';
export { default as PeggyHeroCard } from './PeggyHeroCard';
export { default as PeggySectionHeader } from './PeggySectionHeader';
export { default as PeggyButton } from './PeggyButton';
export { default as PeggyInput } from './PeggyInput';
export { default as PeggyProgressBar } from './PeggyProgressBar';
export { default as PeggyGoalCard, goalProgressColor, goalEncouragement } from './PeggyGoalCard';
export { default as PeggyQuickActionCard } from './PeggyQuickActionCard';
export { default as PeggyListRow } from './PeggyListRow';
export { default as PeggyIconBadge } from './PeggyIconBadge';
export { default as PeggyEmptyState } from './PeggyEmptyState';
export { default as PeggyIllustration } from './PeggyIllustration';
export { default as PeggyStatCard } from './PeggyStatCard';
export { default as PeggyChip } from './PeggyChip';
export { default as PeggyAvatar } from './PeggyAvatar';
export { default as PeggyDivider } from './PeggyDivider';

export type { PastelTone } from './PeggyQuickActionCard';
