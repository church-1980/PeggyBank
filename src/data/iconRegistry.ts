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
  ionicon: keyof typeof Ionicons.glyphMap; // fallback, used until a premium PNG exists
  image?: any;                             // require('../../assets/peggy-icons/<key>.png')
}

// ── PNG PHASE: THE ONLY EDIT NEEDED ──────────────────────────────────────────
// When the 15 premium PNGs land in assets/peggy-icons/, add one line per bucket
// here (e.g. `image: require('../../assets/peggy-icons/travel.png')`) and every
// screen upgrades automatically — no screen edits, no duplicated mappings.
// Leave a key's `image` unset to keep falling back to its Ionicon.
// ─────────────────────────────────────────────────────────────────────────────

export const ICON_REGISTRY: Record<IconKey, IconEntry> = {
  travel:           { label: 'Travel',         ionicon: 'airplane-outline',            image: require('../../assets/peggy-icons/travel.png') },
  vehicle:          { label: 'Vehicle',        ionicon: 'car-outline',                 image: require('../../assets/peggy-icons/vehicle.png') },
  home:             { label: 'Home',           ionicon: 'home-outline',                image: require('../../assets/peggy-icons/home.png') },
  family:           { label: 'Family',         ionicon: 'people-outline',              image: require('../../assets/peggy-icons/family.png') },
  education:        { label: 'Education',       ionicon: 'school-outline',              image: require('../../assets/peggy-icons/education.png') },
  'emergency-fund': { label: 'Emergency Fund',  ionicon: 'shield-checkmark-outline',    image: require('../../assets/peggy-icons/emergency-fund.png') },
  investing:        { label: 'Investing',       ionicon: 'trending-up-outline',         image: require('../../assets/peggy-icons/investing.png') },
  debt:             { label: 'Debt',            ionicon: 'card-outline',                image: require('../../assets/peggy-icons/debt.png') },
  gifts:            { label: 'Gifts',           ionicon: 'gift-outline',                image: require('../../assets/peggy-icons/gifts.png') },
  health:           { label: 'Health',          ionicon: 'medkit-outline',              image: require('../../assets/peggy-icons/health.png') },
  pet:              { label: 'Pet',             ionicon: 'paw-outline',                 image: require('../../assets/peggy-icons/pet.png') },
  food:             { label: 'Food',            ionicon: 'restaurant-outline',          image: require('../../assets/peggy-icons/food.png') },
  shopping:         { label: 'Shopping',        ionicon: 'bag-handle-outline',          image: require('../../assets/peggy-icons/shopping.png') },
  fun:              { label: 'Fun',             ionicon: 'game-controller-outline',     image: require('../../assets/peggy-icons/fun.png') },
  other:            { label: 'Other',           ionicon: 'ellipsis-horizontal-outline', image: require('../../assets/peggy-icons/other.png') },
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

/** Registry bucket key for a goal type. */
export function goalTypeIconKey(goalType?: string): IconKey {
  return GOAL_TYPE_ICON[goalType ?? 'other'] ?? 'other';
}

/** Registry bucket key for an expense category. */
export function categoryIconKey(category?: string): IconKey {
  return CATEGORY_ICON[category ?? 'other'] ?? 'other';
}

/** Ionicon for a goal type — the one true icon for that concept. */
export function goalTypeIonicon(goalType?: string): keyof typeof Ionicons.glyphMap {
  return ICON_REGISTRY[goalTypeIconKey(goalType)].ionicon;
}

/** Ionicon for an expense category — the one true icon for that concept. */
export function categoryIonicon(category?: string): keyof typeof Ionicons.glyphMap {
  return ICON_REGISTRY[categoryIconKey(category)].ionicon;
}
