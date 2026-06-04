import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { getDatabase } from '../database/database';
import { ColorPalette, DarkColors, LightColors } from '../theme/colors';

export type AppearanceMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode:     AppearanceMode;
  setMode:  (m: AppearanceMode) => Promise<void>;
  isDark:   boolean;
  colors:   ColorPalette;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode:    'system',
  setMode: async () => {},
  isDark:  true,
  colors:  DarkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');

  // Load saved preference from DB
  useEffect(() => {
    getDatabase().then(db =>
      db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'appearance_mode'`
      )
    ).then(row => {
      if (row?.value === 'light' || row?.value === 'dark' || row?.value === 'system') {
        setModeState(row.value);
      }
    }).catch(() => {});
  }, []);

  const setMode = useCallback(async (m: AppearanceMode) => {
    setModeState(m);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('appearance_mode', ?)`,
        [m]
      );
    } catch {}
  }, []);

  const isDark = useMemo(() => {
    if (mode === 'light') return false;
    if (mode === 'dark')  return true;
    return systemScheme !== 'light'; // default dark if system unknown
  }, [mode, systemScheme]);

  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

// The two hooks screens will use:
export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors;
}

export function useTheme() {
  return useContext(ThemeContext);
}
