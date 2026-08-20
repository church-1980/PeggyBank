/**
 * CROSS-PLATFORM PARITY CONFIG (audit section 8).
 *
 * Runs the SAME parity test file twice -- once resolving modules the way an
 * Android build does, once the way a web build does -- and has each run write
 * its numbers to .audit/parity-<platform>.json.
 *
 * scripts/audit/parity-compare.js then asserts all three things:
 *
 *     ANDROID == EXPECTED      (Android is right)
 *     WEB     == EXPECTED      (web is right)
 *     ANDROID == WEB           (they are right in the same way)
 *
 * Comparing the platforms only to EACH OTHER would not be enough: both could
 * run the same wrong line of code and agree perfectly. That is why every run is
 * also checked against the hand-computed expectations in src/core/golden.ts.
 *
 * HOW THE PLATFORMS ARE MADE REAL
 * -------------------------------
 * Each project takes its PLATFORM-DECIDING settings from Expo's own per-platform
 * preset -- module extension order (so foo.web.ts beats foo.ts), haste platform,
 * the react-native -> react-native-web alias, the platform's setup file and test
 * environment. Everything else, above all the babel transform, comes from the
 * project's known-good base `jest-expo` config; the per-platform presets replace
 * the transform in a way that cannot parse React Native's Flow-typed internals
 * here, and fixing that would mean adding a root babel.config.js that would also
 * change how Metro bundles the real app.
 */

// The base preset owns the ONE transform that is known to work in this project.
// Note: we must NOT set a "preset" key on the projects below -- Jest concatenates a
// preset's setupFiles with the config's, which would drag React Native's native
// setup file into the web run and break it.
const basePreset = require('jest-expo/jest-preset');

function project(platform, envFile) {
  const p = require(`jest-expo/${platform}/jest-preset`);
  return {
    transform: basePreset.transform,
    transformIgnorePatterns: basePreset.transformIgnorePatterns,
    rootDir: __dirname,
    displayName: platform,
    testMatch: ['**/src/__tests__/parity/**/*.parity.test.ts'],

    // --- the settings that actually make this "Android" or "web" ---
    moduleFileExtensions: p.moduleFileExtensions,
    haste: p.haste,
    testEnvironment: p.testEnvironment,
    moduleNameMapper: { ...p.moduleNameMapper, '^@/(.*)$': '<rootDir>/src/$1' },
    // envFile marks the platform for Expo's runtime before its setup file loads.
    setupFiles: [require.resolve(envFile), ...p.setupFiles],
    setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect', '<rootDir>/jest.setup.js'],
  };
}

module.exports = {
  projects: [
    project('android', './jest/platform-env.android.js'),
    project('web', './jest/platform-env.web.js'),
  ],
};
