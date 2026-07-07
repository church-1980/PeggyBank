import { Ionicons } from '@expo/vector-icons';
import { goalTypeIonicon } from './iconRegistry';

export type GoalType =
  | 'vacation' | 'cruise' | 'flight' | 'wedding' | 'car'
  | 'home' | 'down_payment' | 'emergency' | 'education' | 'baby'
  | 'renovation' | 'medical' | 'retirement' | 'investing' | 'business'
  | 'debt' | 'gifts' | 'pet' | 'technology' | 'other';

export interface GoalTypeInfo {
  label: string;
  emoji: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// label/emoji/color are per-type; `icon` is NOT chosen here — it is derived from
// the single icon registry so the same concept always renders the same icon.
type GoalTypeMeta = Omit<GoalTypeInfo, 'icon'>;

const GOAL_TYPE_META: Record<GoalType, GoalTypeMeta> = {
  vacation:     { label: 'Vacation',     emoji: '🌴', color: '#52C9B8' },
  cruise:       { label: 'Cruise',       emoji: '🚢', color: '#7C6EFA' },
  flight:       { label: 'Flight',       emoji: '✈️', color: '#7CBFCF' },
  wedding:      { label: 'Wedding',      emoji: '💒', color: '#F57FA0' },
  car:          { label: 'Car',          emoji: '🚗', color: '#F5A662' },
  home:         { label: 'Home',         emoji: '🏠', color: '#7CBFCF' },
  down_payment: { label: 'Down Payment', emoji: '🔑', color: '#FFD166' },
  emergency:    { label: 'Emergency',    emoji: '🛡️', color: '#E87070' },
  education:    { label: 'Education',    emoji: '🎓', color: '#98D8C8' },
  baby:         { label: 'Baby',         emoji: '🍼', color: '#A8D8EA' },
  renovation:   { label: 'Renovation',   emoji: '🔨', color: '#F5A662' },
  medical:      { label: 'Medical',      emoji: '💊', color: '#98D8C8' },
  retirement:   { label: 'Retirement',   emoji: '🌅', color: '#FFD166' },
  investing:    { label: 'Investing',    emoji: '📈', color: '#52C9B8' },
  business:     { label: 'Business',     emoji: '💼', color: '#7C6EFA' },
  debt:         { label: 'Pay Off Debt', emoji: '💳', color: '#E87070' },
  gifts:        { label: 'Gifts',        emoji: '🎁', color: '#C084FC' },
  pet:          { label: 'Pet',          emoji: '🐾', color: '#F5A662' },
  technology:   { label: 'Technology',   emoji: '💻', color: '#8B8FA8' },
  other:        { label: 'Other',        emoji: '⭐', color: '#8B8FA8' },
};

export const GOAL_TYPES: Record<GoalType, GoalTypeInfo> = Object.fromEntries(
  (Object.entries(GOAL_TYPE_META) as [GoalType, GoalTypeMeta][]).map(
    ([key, meta]) => [key, { ...meta, icon: goalTypeIonicon(key) }]
  )
) as Record<GoalType, GoalTypeInfo>;
