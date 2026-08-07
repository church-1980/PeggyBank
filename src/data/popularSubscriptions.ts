import { Ionicons } from '@expo/vector-icons';

/**
 * Popular-subscription quick-pick catalog — the single source for the
 * "Popular subscriptions" section in Bills & Subscriptions → Add Subscription.
 * Tapping one only PREFILLS the name; the user still edits/saves. Do not
 * duplicate this list anywhere else.
 */

export interface QuickSub {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export interface QuickSubCategory {
  title: string;
  data: QuickSub[];
}

export const POPULAR_SUBSCRIPTIONS: QuickSubCategory[] = [
  {
    title: 'Entertainment',
    data: [
      { name: 'Netflix',          icon: 'tv-outline',               color: '#E50914' },
      { name: 'Disney+',          icon: 'sparkles-outline',         color: '#113CCF' },
      { name: 'Prime Video',      icon: 'videocam-outline',         color: '#00A8E0' },
      { name: 'Crave',            icon: 'film-outline',             color: '#FF6B00' },
      { name: 'YouTube Premium',  icon: 'logo-youtube',             color: '#FF0000' },
      { name: 'Apple TV+',        icon: 'play-circle-outline',      color: '#555555' },
    ],
  },
  {
    title: 'Music',
    data: [
      { name: 'Spotify',          icon: 'musical-notes-outline',    color: '#1DB954' },
      { name: 'Apple Music',      icon: 'musical-note-outline',     color: '#FA2D55' },
      { name: 'Tidal',            icon: 'headset-outline',          color: '#00FFFF' },
    ],
  },
  {
    title: 'Cloud & Storage',
    data: [
      { name: 'iCloud',           icon: 'cloud-outline',            color: '#3478F6' },
      { name: 'Google One',       icon: 'logo-google',              color: '#4285F4' },
      { name: 'Dropbox',          icon: 'folder-open-outline',      color: '#0061FF' },
      { name: 'OneDrive',         icon: 'cloud-upload-outline',     color: '#0078D4' },
    ],
  },
  {
    title: 'Gaming',
    data: [
      { name: 'Xbox Game Pass',   icon: 'game-controller-outline',  color: '#107C10' },
      { name: 'PlayStation Plus', icon: 'game-controller-outline',  color: '#003087' },
      { name: 'Nintendo Online',  icon: 'game-controller-outline',  color: '#E60012' },
    ],
  },
  {
    title: 'Fitness & Health',
    data: [
      { name: 'Gym',              icon: 'barbell-outline',          color: '#FF6B35' },
      { name: 'Fitbit Premium',   icon: 'heart-outline',            color: '#00B0B9' },
      { name: 'MyFitnessPal',     icon: 'nutrition-outline',        color: '#0062FF' },
      { name: 'Calm',             icon: 'moon-outline',             color: '#5B5EA6' },
    ],
  },
  {
    title: 'AI & Tools',
    data: [
      { name: 'ChatGPT Plus',     icon: 'chatbubble-ellipses-outline', color: '#10A37F' },
      { name: 'Claude Pro',       icon: 'sparkles-outline',            color: '#C77DFF' },
      { name: 'Canva Pro',        icon: 'brush-outline',               color: '#7D2AE8' },
      { name: 'Adobe Creative',   icon: 'color-palette-outline',       color: '#FF0000' },
      { name: 'Notion',           icon: 'document-text-outline',       color: '#FFFFFF' },
    ],
  },
  {
    title: 'Other',
    data: [
      { name: 'Amazon Prime',     icon: 'bag-outline',               color: '#FF9900' },
      { name: 'Microsoft 365',    icon: 'grid-outline',              color: '#D83B01' },
      { name: 'VPN',              icon: 'shield-outline',            color: '#6C63FF' },
      { name: 'Password Manager', icon: 'lock-closed-outline',       color: '#4ECDC4' },
    ],
  },
];
