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
  // Light / Dark / Use device setting (design.md §2.4); the in-app preference overrides it.
  userInterfaceStyle: 'automatic',
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
    // Receipts use the camera and the Android photo picker only (architecture.md §10.1):
    // no storage, media or audio access.
    permissions: ['android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.RECORD_AUDIO',
      // Only the development error overlay needs it.
      ...(IS_PRODUCTION ? ['android.permission.SYSTEM_ALERT_WINDOW'] : []),
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FAF7F2',
        image: './assets/brand/mark.png',
        imageWidth: 120,
        // Onyx canvas with the full-colour mark, no brown wash (design.md §6.1 S01).
        dark: { backgroundColor: '#0B0B0C', image: './assets/brand/mark.png' },
      },
    ],
    'expo-secure-store',
    // Applies userInterfaceStyle and the root background on Android.
    'expo-system-ui',
    '@react-native-community/datetimepicker',
    'expo-image',
    'expo-font',
    [
      'expo-image-picker',
      {
        // Requested only when the user attaches a receipt (design.md S11).
        photosPermission: 'MiniLedger uses your photos only to attach a receipt you choose.',
        cameraPermission: 'MiniLedger uses the camera only to photograph a receipt.',
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    reactCompiler: true,
  },
});
