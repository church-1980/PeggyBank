import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { useFonts, DMSans_300Light, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { setupDatabase, getDatabase } from './src/database/database';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors, Typography } from './src/theme';

function AppRoot() {
  const [ready, setReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await setupDatabase();
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM settings WHERE key = 'onboarding_done'`
        );
        setOnboardingDone(row?.value === '1');
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
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
        <Text style={styles.loadingText}>Loading...</Text>
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
        <AppRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...Typography.h3, color: Colors.textSecondary },
  errorText:   { ...Typography.bodyBold, color: Colors.critical, textAlign: 'center', padding: 20 },
  errorDetail: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', padding: 20 },
});
