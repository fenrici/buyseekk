import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Buyseek native app config.
 * Icon/splash assets are Expo placeholders — replace before TestFlight.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Buyseek',
  slug: 'buyseek',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'buyseek',
  userInterfaceStyle: 'dark',
  backgroundColor: '#050a18',
  platforms: ['ios', 'android'],
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.buyseek.app',
  },
  android: {
    package: 'com.buyseek.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#050a18',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#050a18',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
});
