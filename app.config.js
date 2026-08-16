// app.config.js — ADDITIVE OVERLAY on top of app.json (PeggyBank Dev variant).
//
// Expo reads app.json first and passes it here as `config`. When APP_VARIANT is
// not "dev" (i.e. every production / EAS build), this returns app.json UNCHANGED,
// so production identity, EAS credentials, owner, and projectId are untouched.
//
// Only when APP_VARIANT === "dev" do we swap in a SEPARATE Android/iOS identity so
// PeggyBank Dev installs alongside production PeggyBank with its own SQLite sandbox.
//
// To fully revert the dev variant: delete this file. app.json becomes the sole config again.
const IS_DEV = process.env.APP_VARIANT === 'dev';

module.exports = ({ config }) => {
  if (!IS_DEV) return config; // production / EAS: byte-identical to app.json

  return {
    ...config,
    name: 'PeggyBank Dev',
    scheme: 'peggybank-dev', // avoid deep-link collision with production
    android: {
      ...config.android,
      package: 'com.spall.peggybank.dev', // separate applicationId => separate data sandbox
    },
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.spall.peggybank.dev',
    },
  };
};
