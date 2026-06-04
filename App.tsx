import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { useFonts, DMSans_300Light, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

// TEMP DEBUG: capture which component throws the Text-in-View error
const _origError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Text strings must be rendered')) {
    _origError('[TEXT_BUG] component stack:', args[1] ?? new Error('no stack').stack);
  }
  _origError(...args);
};
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavProvider, useNavConfig } from './src/context/NavContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { setupDatabase, getDatabase } from './src/database/database';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors, Typography } from './src/theme';
import {
  setupNotificationChannel,
  requestNotificationPermissions,
  rescheduleAll,
  getNotificationMode,
} from './src/lib/notifications';

function AppRoot() {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [error, setError] = useState('');
  const { loadSlots } = useNavConfig();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    (async () => {
      try {
        await setupDatabase();
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'onboarding_done'`
        );
        setOnboardingDone(row?.value === '1');
        await loadSlots();
        setReady(true);

        // Set up notifications quietly in the background — never block startup
        try {
          await setupNotificationChannel();
          const mode = await getNotificationMode();
          if (mode !== 'off') {
            const granted = await requestNotificationPermissions();
            if (granted) await rescheduleAll(mode);
          }
        } catch {}
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  // Re-schedule when app comes back to foreground (keeps bill dates fresh)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        try {
          const mode = await getNotificationMode();
          if (mode !== 'off') await rescheduleAll(mode);
        } catch {}
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Something went wrong starting the app.</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading PeggyBank...</Text>
      </View>
    );
  }

  return <AppNavigator initialRoute={onboardingDone ? 'Home' : 'Onboarding'} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({ DMSans_300Light, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavProvider>
          <AppRoot />
        </NavProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.h3, color: Colors.textSecondary },
  errorText:   { ...Typography.bodyBold, color: Colors.spending, textAlign: 'center', padding: 20 },
  errorDetail: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', padding: 20 },
});
