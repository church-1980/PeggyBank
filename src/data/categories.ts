import { Category } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { categoryIonicon, categoryIconKey, IconKey } from './iconRegistry';

export interface CategoryInfo {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconKey: IconKey;
}

// label/color are per-category; `icon` is NOT chosen here — it is derived from
// the single icon registry so the same concept always renders the same icon.
type CategoryMeta = Omit<CategoryInfo, 'icon' | 'iconKey'>;

const CATEGORY_META: Record<Category, CategoryMeta> = {
  groceries:  { label: 'Groceries',  color: '#52C9B8' },
  gas:        { label: 'Gas',        color: '#F5A662' },
  restaurant: { label: 'Restaurant', color: '#E87070' },
  shopping:   { label: 'Shopping',   color: '#F57FA0' },
  health:     { label: 'Health',     color: '#98D8C8' },
  kids:       { label: 'Kids',       color: '#A8D8EA' },
  fun:        { label: 'Fun',        color: '#FFD166' },
  gifts:      { label: 'Gifts',      color: '#C084FC' },
  pets:       { label: 'Pets',       color: '#F5A662' },
  home:       { label: 'Home',       color: '#7CBFCF' },
  travel:     { label: 'Travel',     color: '#7C6EFA' },
  other:      { label: 'Other',      color: '#8B8FA8' },
};

export const CATEGORIES: Record<Category, CategoryInfo> = Object.fromEntries(
  (Object.entries(CATEGORY_META) as [Category, CategoryMeta][]).map(
    ([key, meta]) => [key, { ...meta, icon: categoryIonicon(key), iconKey: categoryIconKey(key) }]
  )
) as Record<Category, CategoryInfo>;
