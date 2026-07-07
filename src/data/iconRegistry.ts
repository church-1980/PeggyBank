import { Ionicons } from '@expo/vector-icons';

/**
 * PeggyBank Icon Registry — THE SINGLE SOURCE OF TRUTH for icons.
 *
 * RULE: If an icon represents the same thing, it must always use the same
 * artwork. No screen may define its own icon. Goal types and expense
 * categories both map into the 15 buckets below, so e.g. "Health" (a goal) and
 * "Health" (a category) resolve to the exact same registry entry — it is
 * structurally impossible to have two different "Health" icons.
 *
 * Today each bucket renders an Ionicon (`ionicon`). When the premium PNG assets
 * land in assets/peggy-icons/, add `image: require(...)` to each entry and
 * PeggyIcon will prefer it — every screen upgrades at once, no screen edits.
 *
 * Master list: docs/ICON_MASTER_LIST.md
 */

export type IconKey =
  | 'travel'
  | 'vehicle'
  | 'home'
  | 'family'
  | 'education'
  | 'emergency-fund'
  | 'investing'
  | 'debt'
  | 'gifts'
  | 'health'
  | 'pet'
  | 'food'
  | 'shopping'
  | 'fun'
  | 'other';

export interface IconEntry {
  label: string;
  ionicon: keyof typeof Ionicons.glyphMap; // fallback until PNG assets exist
  // image?: number;  // require('../../assets/peggy-icons/<key>.png') — added in the PNG phase
}

export const ICON_REGISTRY: Record<IconKey, IconEntry> = {
  travel:           { label: 'Travel',         ionicon: 'airplane-outline' },
  vehicle:          { label: 'Vehicle',        ionicon: 'car-outline' },
  home:             { label: 'Home',           ionicon: 'home-outline' },
  family:           { label: 'Family',         ionicon: 'people-outline' },
  education:        { label: 'Education',       ionicon: 'school-outline' },
  'emergency-fund': { label: 'Emergency Fund',  ionicon: 'shield-checkmark-outline' },
  investing:        { label: 'Investing',       ionicon: 'trending-up-outline' },
  debt:             { label: 'Debt',            ionicon: 'card-outline' },
  gifts:            { label: 'Gifts',           ionicon: 'gift-outline' },
  health:           { label: 'Health',          ionicon: 'medkit-outline' },
  pet:              { label: 'Pet',             ionicon: 'paw-outline' },
  food:             { label: 'Food',            ionicon: 'restaurant-outline' },
  shopping:         { label: 'Shopping',        ionicon: 'bag-handle-outline' },
  fun:              { label: 'Fun',             ionicon: 'game-controller-outline' },
  other:            { label: 'Other',           ionicon: 'ellipsis-horizontal-outline' },
};

/** Every goal type resolves to one registry bucket. */
export const GOAL_TYPE_ICON: Record<string, IconKey> = {
  vacation: 'travel',
  cruise: 'travel',
  flight: 'travel',
  car: 'vehicle',
  home: 'home',
  down_payment: 'home',
  renovation: 'home',
  wedding: 'family',
  baby: 'family',
  education: 'education',
  emergency: 'emergency-fund',
  investing: 'investing',
  business: 'investing',
  retirement: 'investing',
  debt: 'debt',
  gifts: 'gifts',
  medical: 'health',
  pet: 'pet',
  technology: 'fun',
  other: 'other',
};

/** Every expense category resolves to one registry bucket. */
export const CATEGORY_ICON: Record<string, IconKey> = {
  groceries: 'food',
  restaurant: 'food',
  gas: 'vehicle',
  shopping: 'shopping',
  health: 'health',
  kids: 'family',
  fun: 'fun',
  gifts: 'gifts',
  pets: 'pet',
  home: 'home',
  travel: 'travel',
  other: 'other',
};

/** Ionicon for a goal type — the one true icon for that concept. */
export function goalTypeIonicon(goalType?: string): keyof typeof Ionicons.glyphMap {
  const key = GOAL_TYPE_ICON[goalType ?? 'other'] ?? 'other';
  return ICON_REGISTRY[key].ionicon;
}

/** Ionicon for an expense category — the one true icon for that concept. */
export function categoryIonicon(category?: string): keyof typeof Ionicons.glyphMap {
  const key = CATEGORY_ICON[category ?? 'other'] ?? 'other';
  return ICON_REGISTRY[key].ionicon;
}
