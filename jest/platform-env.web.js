// Tells Expo's jest setup which platform this parity run represents.
// Must run BEFORE jest-expo's own setup file, which reads process.env.EXPO_OS.
process.env.EXPO_OS = 'web';
