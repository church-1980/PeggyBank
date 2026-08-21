import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { getAllCustomLogos, setCustomLogo, removeCustomLogo, logoKey } from '../lib/customLogos';

/**
 * One shared cache + flow for user-attached merchant logos. Any screen can:
 *   - logoFor(name)      → the custom logo URI for that item, if set
 *   - pickAndSetLogo(name)→ open the photo picker and attach a logo
 *   - removeLogo(name)   → revert to the built-in matte icon
 *
 * Because logos are keyed by the item's name, a change made anywhere updates the
 * icon everywhere that name appears — instantly, via this shared state.
 */

interface CustomLogoContextValue {
  logoFor: (name?: string | null) => string | undefined;
  hasLogo: (name?: string | null) => boolean;
  pickAndSetLogo: (name: string) => Promise<boolean>;
  removeLogo: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CustomLogoContext = createContext<CustomLogoContextValue | undefined>(undefined);

export function CustomLogoProvider({ children }: { children: React.ReactNode }) {
  const [logos, setLogos] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try { setLogos(await getAllCustomLogos()); } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logoFor = useCallback((name?: string | null) => logos[logoKey(name)], [logos]);
  const hasLogo = useCallback((name?: string | null) => !!logos[logoKey(name)], [logos]);

  const pickAndSetLogo = useCallback(async (name: string): Promise<boolean> => {
    if (!logoKey(name)) { Alert.alert('Name it first', 'Give this item a name, then add a logo.'); return false; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Photos access needed', 'Allow photo access to choose a logo.'); return false; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.[0]?.uri) return false;
    const uri = await setCustomLogo(name, result.assets[0].uri);
    setLogos((prev) => ({ ...prev, [logoKey(name)]: uri }));
    return true;
  }, []);

  const removeLogo = useCallback(async (name: string) => {
    await removeCustomLogo(name);
    setLogos((prev) => { const next = { ...prev }; delete next[logoKey(name)]; return next; });
  }, []);

  return (
    <CustomLogoContext.Provider value={{ logoFor, hasLogo, pickAndSetLogo, removeLogo, refresh }}>
      {children}
    </CustomLogoContext.Provider>
  );
}

// Safe default so components (e.g. PeggyListRow) render fine outside a provider,
// including in unit tests — they simply show the built-in icons, no custom logos.
const NOOP: CustomLogoContextValue = {
  logoFor: () => undefined,
  hasLogo: () => false,
  pickAndSetLogo: async () => false,
  removeLogo: async () => {},
  refresh: async () => {},
};

export function useCustomLogos(): CustomLogoContextValue {
  return useContext(CustomLogoContext) ?? NOOP;
}
