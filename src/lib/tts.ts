// Text-to-speech helper — Phase 1 stub.
// The Read Aloud button is present in the UI now per CLAUDE.md.
// When expo-speech ships: replace speakText with Speech.speak(text, { language: 'en' })
// and stopSpeaking with Speech.stop(). Remove this file's Alert import.

import { Alert } from 'react-native';

export function speakText(_text: string): void {
  Alert.alert(
    'Coming Soon',
    'Voice reading will be available in a future update.',
    [{ text: 'OK' }]
  );
}

export function stopSpeaking(): void {
  // stub — no-op until expo-speech is wired
}
