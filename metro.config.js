// Metro configuration.
//
// Web needs two things the defaults do not provide:
//  1. .wasm as an asset — expo-sqlite runs SQLite in the browser via wa-sqlite,
//     which ships a .wasm binary Metro otherwise refuses to resolve.
//  2. Nothing else is overridden, so native builds behave exactly as before.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
