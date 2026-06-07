// ─── jest.setup.js ───────────────────────────────────────────────────────────
// Mocks for all native/expo modules so Jest can run without a real device.

// ── expo-sqlite ──────────────────────────────────────────────────────────────
jest.mock('expo-sqlite', () => {
  const mockDb = {
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync:   jest.fn().mockResolvedValue([]),
    runAsync:      jest.fn().mockResolvedValue({ changes: 1 }),
    execAsync:     jest.fn().mockResolvedValue(undefined),
  };
  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
    __mockDb: mockDb,
  };
});

// ── react-native-svg ─────────────────────────────────────────────────────────
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const mock = (name) => {
    const C = ({ children, ...props }) =>
      React.createElement(View, { testID: `svg-${name}`, ...props }, children);
    C.displayName = name;
    return C;
  };
  const SvgMock = mock('Svg');
  return {
    __esModule:     true,
    default:        SvgMock,
    Svg:            SvgMock,
    Path:           mock('Path'),
    Circle:         mock('Circle'),
    Line:           mock('Line'),
    Ellipse:        mock('Ellipse'),
    G:              mock('G'),
    Defs:           mock('Defs'),
    LinearGradient: mock('LinearGradient'),
    Stop:           mock('Stop'),
    Rect:           mock('Rect'),
    ClipPath:       mock('ClipPath'),
    Image:          mock('Image'),
  };
});

// ── @expo/vector-icons ───────────────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID, ...props }) =>
      React.createElement(Text, { testID: testID ?? `icon-${name}`, ...props }, name),
  };
});

// ── expo-blur ────────────────────────────────────────────────────────────────
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }) =>
      React.createElement(View, props, children),
  };
});

// ── @react-native-async-storage/async-storage ────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear:      jest.fn().mockResolvedValue(undefined),
}));

// ── react-native-safe-area-context ───────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useSafeAreaInsets:    () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame:     () => ({ x: 0, y: 0, width: 390, height: 844 }),
    SafeAreaProvider:     ({ children }) => React.createElement(View, null, children),
    SafeAreaView:         ({ children }) => React.createElement(View, null, children),
    initialWindowMetrics: { insets: { top: 0, bottom: 0, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } },
  };
});

// ── @react-navigation/native ─────────────────────────────────────────────────
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { cb(); },
  useNavigation:  () => ({
    navigate:    jest.fn(),
    goBack:      jest.fn(),
    replace:     jest.fn(),
    canGoBack:   jest.fn().mockReturnValue(true),
  }),
  NavigationContainer: ({ children }) => children,
}));

// ── expo-constants ────────────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '1.0.0' } },
}));

// ── expo-haptics ──────────────────────────────────────────────────────────────
jest.mock('expo-haptics', () => ({
  impactAsync:    jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
}));

// ── expo-image-picker ─────────────────────────────────────────────────────────
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

// ── react-native-reanimated ───────────────────────────────────────────────────
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

// ── ThemeContext ──────────────────────────────────────────────────────────────
jest.mock('./src/context/ThemeContext', () => {
  const { DarkColors } = require('./src/theme/colors');
  return {
    useColors:       () => DarkColors,
    ThemeProvider:   ({ children }) => children,
    useThemeContext: () => ({ mode: 'dark', setMode: jest.fn() }),
  };
});

// ── Silence noisy act() warnings ─────────────────────────────────────────────
global.IS_REACT_ACT_ENVIRONMENT = true;
