import { Category } from '../types';
import { Ionicons } from '@expo/vector-icons';

export interface CategoryInfo {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  groceries:  { label: 'Groceries',  icon: 'basket-outline',              color: '#52C9B8' },
  gas:        { label: 'Gas',        icon: 'car-outline',                 color: '#F5A662' },
  restaurant: { label: 'Restaurant', icon: 'restaurant-outline',          color: '#E87070' },
  shopping:   { label: 'Shopping',   icon: 'bag-handle-outline',          color: '#F57FA0' },
  health:     { label: 'Health',     icon: 'medkit-outline',              color: '#98D8C8' },
  kids:       { label: 'Kids',       icon: 'happy-outline',               color: '#A8D8EA' },
  fun:        { label: 'Fun',        icon: 'game-controller-outline',     color: '#FFD166' },
  gifts:      { label: 'Gifts',      icon: 'gift-outline',                color: '#C084FC' },
  pets:       { label: 'Pets',       icon: 'paw-outline',                 color: '#F5A662' },
  home:       { label: 'Home',       icon: 'home-outline',                color: '#7CBFCF' },
  travel:     { label: 'Travel',     icon: 'airplane-outline',            color: '#7C6EFA' },
  other:      { label: 'Other',      icon: 'ellipsis-horizontal-outline', color: '#8B8FA8' },
};
