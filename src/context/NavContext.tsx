import React, { createContext, useContext, useState, useCallback } from 'react';
import { getDatabase } from '../database/database';

export type NavFeatureKey = 'Spending' | 'Bills' | 'Calendar' | 'Debt' | 'Budget';

export interface NavFeatureDef {
  key: NavFeatureKey;
  label: string;
  icon: string;       // Ionicons name (outline)
  iconActive: string; // Ionicons name (filled)
  description: string;
}

export const NAV_FEATURES: NavFeatureDef[] = [
  { key: 'Spending',      label: 'Spending',  icon: 'card-outline',          iconActive: 'card',          description: 'Track everything you spend'     },
  { key: 'Bills',         label: 'Bills',     icon: 'receipt-outline',       iconActive: 'receipt',       description: 'Manage recurring bills'         },
  { key: 'Calendar',      label: 'Calendar',  icon: 'calendar-outline',      iconActive: 'calendar',      description: 'See your month at a glance'     },
  { key: 'Debt',          label: 'Debt',      icon: 'trending-down-outline', iconActive: 'trending-down', description: 'Pay it down, step by step'      },
  { key: 'Budget',        label: 'Budget',    icon: 'bar-chart-outline',     iconActive: 'bar-chart',     description: 'Monthly spending breakdown'     },
];

const DEFAULT_SLOTS: NavFeatureKey[] = ['Spending', 'Bills', 'Calendar'];

interface NavContextValue {
  slots: NavFeatureKey[];
  navKey: number;
  updateSlots: (newSlots: NavFeatureKey[]) => Promise<void>;
  loadSlots: () => Promise<void>;
}

const NavContext = createContext<NavContextValue>({
  slots: DEFAULT_SLOTS,
  navKey: 0,
  updateSlots: async () => {},
  loadSlots: async () => {},
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<NavFeatureKey[]>(DEFAULT_SLOTS);
  const [navKey, setNavKey] = useState(0);

  const loadSlots = useCallback(async () => {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'nav_slots'`
      );
      if (row?.value) {
        const parsed = JSON.parse(row.value) as NavFeatureKey[];
        if (Array.isArray(parsed) && parsed.length === 3) {
          setSlots(parsed);
        }
      }
    } catch {
      // Keep defaults
    }
  }, []);

  const updateSlots = useCallback(async (newSlots: NavFeatureKey[]) => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('nav_slots', ?)`,
      [JSON.stringify(newSlots)]
    );
    setSlots(newSlots);
    setNavKey((k) => k + 1); // Force navigator remount
  }, []);

  return (
    <NavContext.Provider value={{ slots, navKey, updateSlots, loadSlots }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNavConfig() {
  return useContext(NavContext);
}
