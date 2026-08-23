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
  // ── Category / goal concepts (final matte art) ──
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
  | 'other'
  // ── Navigation / action / tool concepts (placeholder until art lands) ──
  | 'camera'
  | 'add-expense'
  | 'add-income'
  | 'bills'
  | 'goals'
  | 'check-in'
  | 'reports'
  | 'calendar'
  | 'currency'
  | 'payday'
  | 'backup'
  | 'settings'
  | 'profile'
  | 'notifications'
  | 'share'
  // ── Summary / status concepts (Monthly Breakdown + Settings) ──
  | 'income'
  | 'spent'
  | 'paid'
  | 'due'
  | 'paid-out'
  | 'appearance'
  // ── Insights / rewards / recurrence concepts ──
  | 'tips'
  | 'award'
  | 'recurring'
  // ── Goal-type specific concepts ──
  | 'cruise'
  | 'flight'
  | 'down-payment'
  | 'renovation'
  | 'wedding'
  | 'baby'
  | 'business'
  | 'retirement'
  | 'technology'
  // ── Income-source concepts ──
  | 'paycheck'
  | 'freelance'
  | 'cash'
  | 'side-job'
  | 'restaurant';

export interface IconEntry {
  label: string;
  ionicon: keyof typeof Ionicons.glyphMap; // fallback, used until a premium PNG exists
  image?: any;                             // require('../../assets/peggy-icons/<key>.png')
  color: string;                           // dominant concept color — default frame tint
  status: 'ready' | 'pending';             // 'ready' = premium art exists; 'pending' = fallback
  accessibilityLabel?: string;             // defaults to `label`
}

/** Resolve a concept's accessibility label. */
export function iconLabel(key: IconKey): string {
  const e = ICON_REGISTRY[key] ?? ICON_REGISTRY.other;
  return e.accessibilityLabel ?? e.label;
}

// ── PNG PHASE: THE ONLY EDIT NEEDED ──────────────────────────────────────────
// When the 15 premium PNGs land in assets/peggy-icons/, add one line per bucket
// here (e.g. `image: require('../../assets/peggy-icons/travel.png')`) and every
// screen upgrades automatically — no screen edits, no duplicated mappings.
// Leave a key's `image` unset to keep falling back to its Ionicon.
// ─────────────────────────────────────────────────────────────────────────────

// Clearly-marked placeholder asset. A 'pending' concept renders THIS through the
// same PeggyIconFrame — never an Ionicon. When the real matte art is generated,
// swap this one entry's `image` + `status` and the whole app upgrades; no screen
// edits, no layout change (Charter: Placeholder Rule).
const PENDING_ART = require('../../assets/peggy-icons/_placeholder.png');

/**
 * DECLARED ALIASES — concepts that deliberately share one piece of artwork.
 *
 * The registry's rule is one concept, one picture, so that two different things
 * never look the same. But some pairs are not two different things: "Add
 * Expense" is the act of recording something Spent. Showing the same picture
 * there helps a person connect the button to the idea; it is not the drift the
 * rule exists to prevent.
 *
 * An alias must be written down here with a reason. The audit accepts a shared
 * image only when it is declared; two concepts that quietly end up on the same
 * file still fail, which is what caught this pair in the first place.
 */
export const ICON_ALIASES: Record<string, { of: IconKey; why: string }> = {
  'add-expense': {
    of: 'spent',
    why: 'Adding an expense IS recording something spent — the same idea, as an action.',
  },
  'add-income': {
    of: 'income',
    why: 'Adding income IS recording income — the same idea, as an action.',
  },
};

export const ICON_REGISTRY: Record<IconKey, IconEntry> = {
  travel:           { label: 'Travel',         ionicon: 'airplane-outline',            color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/travel.png') },
  vehicle:          { label: 'Vehicle',        ionicon: 'car-outline',                 color: '#4B9BFF', status: 'ready', image: require('../../assets/peggy-icons/vehicle.png') },
  home:             { label: 'Home',           ionicon: 'home-outline',                color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/home.png') },
  family:           { label: 'Family',         ionicon: 'people-outline',              color: '#8B5CF6', status: 'ready', image: require('../../assets/peggy-icons/family.png') },
  education:        { label: 'Education',       ionicon: 'school-outline',              color: '#4B9BFF', status: 'ready', image: require('../../assets/peggy-icons/education.png') },
  'emergency-fund': { label: 'Emergency Fund',  ionicon: 'shield-checkmark-outline',    color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/emergency-fund.png') },
  investing:        { label: 'Investing',       ionicon: 'trending-up-outline',         color: '#34C77B', status: 'ready', image: require('../../assets/peggy-icons/investing.png') },
  debt:             { label: 'Debt',            ionicon: 'card-outline',                color: '#FF6B6B', status: 'ready', image: require('../../assets/peggy-icons/debt.png') },
  gifts:            { label: 'Gifts',           ionicon: 'gift-outline',                color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/gifts.png') },
  health:           { label: 'Health',          ionicon: 'medkit-outline',              color: '#FF6B6B', status: 'ready', image: require('../../assets/peggy-icons/health.png') },
  pet:              { label: 'Pet',             ionicon: 'paw-outline',                 color: '#FF9F5A', status: 'ready', image: require('../../assets/peggy-icons/pet.png') },
  food:             { label: 'Food',            ionicon: 'restaurant-outline',          color: '#3FBF7F', status: 'ready', image: require('../../assets/peggy-icons/food.png') },
  shopping:         { label: 'Shopping',        ionicon: 'bag-handle-outline',          color: '#8B5CF6', status: 'ready', image: require('../../assets/peggy-icons/shopping.png') },
  fun:              { label: 'Fun',             ionicon: 'game-controller-outline',     color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/fun.png') },
  other:            { label: 'Other',           ionicon: 'ellipsis-horizontal-outline', color: '#8E8CA3', status: 'ready', image: require('../../assets/peggy-icons/other.png') },

  // ── Navigation / action / tool concepts — placeholder until matte art lands.
  //    Swap `image: PENDING_ART` → the real require + set status:'ready'. Nothing else changes.
  camera:           { label: 'Camera',          ionicon: 'camera-outline',              color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/camera.png') },
  'add-expense':    { label: 'Add Expense',     ionicon: 'arrow-up-circle-outline',     color: '#FF6B6B', status: 'ready', image: require('../../assets/peggy-icons/spent.png') },
  'add-income':     { label: 'Add Income',      ionicon: 'arrow-down-circle-outline',   color: '#34C77B', status: 'ready', image: require('../../assets/peggy-icons/income.png') },
  bills:            { label: 'Bills',           ionicon: 'receipt-outline',             color: '#FF9F5A', status: 'ready', image: require('../../assets/peggy-icons/bills.png') },
  goals:            { label: 'Goals',           ionicon: 'flag-outline',                color: '#34C77B', status: 'ready', image: require('../../assets/peggy-icons/goals.png') },
  'check-in':       { label: 'Weekly Check-In', ionicon: 'checkmark-circle-outline',    color: '#34C77B', status: 'ready', image: require('../../assets/peggy-icons/check-in.png') },
  reports:          { label: 'Reports',         ionicon: 'bar-chart-outline',           color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/reports.png') },
  calendar:         { label: 'Calendar',        ionicon: 'calendar-outline',            color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/calendar.png') },
  currency:         { label: 'Currency',        ionicon: 'swap-horizontal-outline',     color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/currency.png') },
  payday:           { label: 'Payday',          ionicon: 'cash-outline',                color: '#34C77B', status: 'ready', image: require('../../assets/peggy-icons/payday.png') },
  backup:           { label: 'Backup',          ionicon: 'cloud-download-outline',      color: '#8E8CA3', status: 'ready', image: require('../../assets/peggy-icons/backup.png') },
  settings:         { label: 'Settings',        ionicon: 'settings-outline',            color: '#8E8CA3', status: 'ready', image: require('../../assets/peggy-icons/settings.png') },
  profile:          { label: 'Profile',         ionicon: 'person-circle-outline',       color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/profile.png') },
  notifications:    { label: 'Notifications',   ionicon: 'notifications-outline',       color: '#F4B740', status: 'ready', image: require('../../assets/peggy-icons/notifications.png') },
  share:            { label: 'Share',           ionicon: 'share-social-outline',        color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/share.png') },

  // ── Summary / status concepts — swap `image: PENDING_ART` → real require + status:'ready' as art lands.
  income:           { label: 'Income',          ionicon: 'arrow-down-circle-outline',   color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/income.png') },
  spent:            { label: 'Spent',           ionicon: 'arrow-up-circle-outline',     color: '#FF6B6B', status: 'ready', image: require('../../assets/peggy-icons/spent.png') },
  paid:             { label: 'Paid',            ionicon: 'checkmark-circle-outline',    color: '#34C77B', status: 'ready', image: require('../../assets/peggy-icons/paid.png') },
  due:              { label: 'Still Due',       ionicon: 'time-outline',                color: '#F5A623', status: 'ready', image: require('../../assets/peggy-icons/due.png') },
  'paid-out':       { label: 'Paid Out',        ionicon: 'wallet-outline',              color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/paidout.png') },
  appearance:       { label: 'Appearance',      ionicon: 'contrast-outline',            color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/appearance.png') },
  tips:             { label: 'Tips',            ionicon: 'bulb-outline',                color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/tips.png') },
  award:            { label: 'Award',           ionicon: 'ribbon-outline',              color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/award.png') },
  recurring:        { label: 'Recurring',       ionicon: 'repeat-outline',              color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/recurring.png') },

  // ── Goal-type specific matte icons — swap PENDING_ART -> real require + status:'ready' as art lands. ──
  cruise:           { label: 'Cruise',          ionicon: 'boat-outline',                color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/cruise.png') },
  flight:           { label: 'Flight',          ionicon: 'airplane-outline',            color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/flight.png') },
  'down-payment':   { label: 'Down Payment',    ionicon: 'key-outline',                 color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/downpayment.png') },
  renovation:       { label: 'Renovation',      ionicon: 'hammer-outline',              color: '#F5A662', status: 'ready', image: require('../../assets/peggy-icons/renovation.png') },
  wedding:          { label: 'Wedding',         ionicon: 'heart-outline',               color: '#F57FA0', status: 'ready', image: require('../../assets/peggy-icons/wedding.png') },
  baby:             { label: 'Baby',            ionicon: 'happy-outline',               color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/baby.png') },
  business:         { label: 'Business',        ionicon: 'briefcase-outline',           color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/business.png') },
  retirement:       { label: 'Retirement',      ionicon: 'sunny-outline',               color: '#F5A662', status: 'ready', image: require('../../assets/peggy-icons/retirement.png') },
  technology:       { label: 'Technology',      ionicon: 'laptop-outline',              color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/technology.png') },

  // ── Income sources — swap PENDING_ART -> real require + status:'ready' as art lands.
  paycheck:         { label: 'Paycheck',        ionicon: 'card-outline',                color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/paycheck.png') },
  freelance:        { label: 'Freelance',       ionicon: 'laptop-outline',              color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/freelance.png') },
  cash:             { label: 'Cash',            ionicon: 'cash-outline',                color: '#25C2A0', status: 'ready', image: require('../../assets/peggy-icons/cash.png') },
  'side-job':       { label: 'Side Job',        ionicon: 'construct-outline',           color: '#F5A623', status: 'ready', image: require('../../assets/peggy-icons/sidejob.png') },
  restaurant:       { label: 'Restaurant',      ionicon: 'restaurant-outline',          color: '#7B61FF', status: 'ready', image: require('../../assets/peggy-icons/restaurant.png') },
};

/** Every goal type resolves to one registry bucket. */
export const GOAL_TYPE_ICON: Record<string, IconKey> = {
  vacation: 'travel',
  cruise: 'cruise',
  flight: 'flight',
  car: 'vehicle',
  home: 'home',
  down_payment: 'down-payment',
  renovation: 'renovation',
  wedding: 'wedding',
  baby: 'baby',
  education: 'education',
  emergency: 'emergency-fund',
  investing: 'investing',
  business: 'business',
  retirement: 'retirement',
  debt: 'debt',
  gifts: 'gifts',
  medical: 'health',
  pet: 'pet',
  technology: 'technology',
  other: 'other',
};

/** Every expense category resolves to one registry bucket. */
export const CATEGORY_ICON: Record<string, IconKey> = {
  groceries: 'food',
  restaurant: 'restaurant',
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

/**
 * Registry bucket for a SUBSCRIPTION.
 *
 * Subscriptions used to fall back to the 'fun' bucket, whose artwork is a game
 * controller. Since the subscriptions table stores no category at all, that
 * fallback fired every single time: a gym membership, an audiobook plan and a
 * cloud storage plan were all drawn as video games.
 *
 * A subscription is not a genre, it is a SHAPE of payment -- something that
 * comes back every month whether it is a gym, a newspaper, software or music.
 * So the generic bucket is 'recurring', whose artwork is the circular repeat
 * mark, not any one industry's symbol. A television or play button would be
 * just as wrong as a controller.
 *
 * A real category still wins when there is one, and a merchant's own logo wins
 * over both -- that is handled by the caller passing overrideSource.
 */
export function subscriptionIconKey(category?: string): IconKey {
  const named = category && category !== 'other' ? CATEGORY_ICON[category] : undefined;
  return named ?? 'recurring';
}

/** Registry bucket key for a goal type. */
export function goalTypeIconKey(goalType?: string): IconKey {
  return GOAL_TYPE_ICON[goalType ?? 'other'] ?? 'other';
}

/**
 * Best concept icon for a goal. Uses the goal's type when it maps to something
 * specific; otherwise infers from the goal NAME (many goals are created without
 * a type). Keeps "Vacation" → travel, "Visa" → debt, etc. instead of the generic
 * "other" icon.
 */
const GOAL_NAME_HINTS: [RegExp, IconKey][] = [
  [/vacation|trip|travel|holiday|flight|cruise|disney/i, 'travel'],
  [/\bcar\b|auto|vehicle|truck|motor/i, 'vehicle'],
  [/visa|debt|loan|credit|master ?card|amex|payoff|pay off/i, 'debt'],
  [/home|house|rent|mortgage|down ?payment|reno|furnitur/i, 'home'],
  [/wedding|baby|family|kids?|child/i, 'family'],
  [/school|tuition|educat|college|universit|course/i, 'education'],
  [/emergency|rainy|safety ?net/i, 'emergency-fund'],
  [/invest|retire|stock|business|nest ?egg/i, 'investing'],
  [/pet|dog|cat|vet|puppy|kitten/i, 'pet'],
  [/gift|present|birthday|christmas|holiday ?gift/i, 'gifts'],
  [/health|medical|dental|doctor|surgery|braces/i, 'health'],
  [/grocer|restaurant|dining/i, 'food'],
  [/shop|clothes|amazon|wardrobe/i, 'shopping'],
  [/\bfun\b|game|hobby|tech|gadget|phone|laptop|console/i, 'fun'],
];
export function goalIconKey(name?: string, goalType?: string): IconKey {
  const byType = goalTypeIconKey(goalType);
  if (byType !== 'other') return byType;
  const n = name ?? '';
  for (const [re, key] of GOAL_NAME_HINTS) if (re.test(n)) return key;
  return 'other';
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
