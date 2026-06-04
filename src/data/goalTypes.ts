import { Ionicons } from '@expo/vector-icons';

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

export const GOAL_TYPES: Record<GoalType, GoalTypeInfo> = {
  vacation:     { label: 'Vacation',     emoji: '🌴', color: '#52C9B8', icon: 'airplane-outline' },
  cruise:       { label: 'Cruise',       emoji: '🚢', color: '#7C6EFA', icon: 'boat-outline' },
  flight:       { label: 'Flight',       emoji: '✈️', color: '#7CBFCF', icon: 'airplane-outline' },
  wedding:      { label: 'Wedding',      emoji: '💒', color: '#F57FA0', icon: 'heart-outline' },
  car:          { label: 'Car',          emoji: '🚗', color: '#F5A662', icon: 'car-outline' },
  home:         { label: 'Home',         emoji: '🏠', color: '#7CBFCF', icon: 'home-outline' },
  down_payment: { label: 'Down Payment', emoji: '🔑', color: '#FFD166', icon: 'key-outline' },
  emergency:    { label: 'Emergency',    emoji: '🛡️', color: '#E87070', icon: 'shield-outline' },
  education:    { label: 'Education',    emoji: '🎓', color: '#98D8C8', icon: 'school-outline' },
  baby:         { label: 'Baby',         emoji: '🍼', color: '#A8D8EA', icon: 'happy-outline' },
  renovation:   { label: 'Renovation',   emoji: '🔨', color: '#F5A662', icon: 'hammer-outline' },
  medical:      { label: 'Medical',      emoji: '💊', color: '#98D8C8', icon: 'medkit-outline' },
  retirement:   { label: 'Retirement',   emoji: '🌅', color: '#FFD166', icon: 'sunny-outline' },
  investing:    { label: 'Investing',    emoji: '📈', color: '#52C9B8', icon: 'trending-up-outline' },
  business:     { label: 'Business',     emoji: '💼', color: '#7C6EFA', icon: 'briefcase-outline' },
  debt:         { label: 'Pay Off Debt', emoji: '💳', color: '#E87070', icon: 'card-outline' },
  gifts:        { label: 'Gifts',        emoji: '🎁', color: '#C084FC', icon: 'gift-outline' },
  pet:          { label: 'Pet',          emoji: '🐾', color: '#F5A662', icon: 'paw-outline' },
  technology:   { label: 'Technology',   emoji: '💻', color: '#8B8FA8', icon: 'laptop-outline' },
  other:        { label: 'Other',        emoji: '⭐', color: '#8B8FA8', icon: 'star-outline' },
};
