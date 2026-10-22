/**
 * Expo app configuration (architecture.md §11.2).
 * APP_VARIANT selects the Android application ID so dev and production builds can coexist.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const IS_PRODUCTION = process.env.APP_VARIANT === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PRODUCTION ? 'MiniLedger' : 'MiniLedger (Dev)',
  slug: 'miniledger',
  version: '1.0.0',
  orientation: 'portrait',
  // Full-bleed 512×512 icon; also the Play Store listing icon (design.md §1.2).
  icon: './assets/brand/icon.png',
  scheme: 'miniledger',
  // Android colorPrimary (recents/task tint) = brandPrimary (design.md §2.1).
  primaryColor: '#B4472B',
  // P0 ships the light theme only (design.md §2.4); switches to "automatic" in Phase 5.
  userInterfaceStyle: 'light',
  android: {
    package: IS_PRODUCTION ? 'com.surajmishra.miniledger' : 'com.surajmishra.miniledger.dev',
    // Receipts and credentials are never backed up (architecture.md §8).
    allowBackup: false,
    adaptiveIcon: {
      // Cream background behind the logo mark (design.md §1.2).
      backgroundColor: '#FDFBF7',
      // 432×432 (108dp @ xxxhdpi) with the mark inside the 66dp safe zone.
      foregroundImage: './assets/brand/adaptive-foreground.png',
      // monochromeImage: add './assets/brand/adaptive-monochrome.png' when the themed-icon asset exists.
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF7F2',
        image: './assets/brand/mark.png',
        imageWidth: 120,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
