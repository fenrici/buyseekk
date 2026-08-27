// Expo SDK 52+ auto-configures monorepo watchFolders / nodeModulesPaths.
// Keep this file so Metro always extends expo/metro-config.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
