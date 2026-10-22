/**
 * Theme, fonts and motion preferences (design.md §2.4, §3.1, §8).
 * - Appearance: Light (first run) / Dark / Use device setting, persisted locally.
 * - Fonts never block rendering: the system font is used until Plus Jakarta Sans loads.
 * - Reduce motion follows the OS accessibility setting.
 */
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Appearance, useColorScheme } from 'react-native';

import { isThemePreference, resolveScheme, type ThemePreference } from './scheme';
import { darkTheme, lightTheme, type Theme } from './tokens';

export type { ThemePreference } from './scheme';

export type FontWeight = '400' | '500' | '600' | '700';

export const THEME_STORAGE_KEY = 'miniledger:theme';

const FAMILIES: Record<FontWeight, string> = {
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  '700': 'PlusJakartaSans_700Bold',
};

export type ThemeValue = Theme & {
  /** Font family for a weight, or undefined while the custom font is not available. */
  font: (weight: FontWeight) => string | undefined;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** OS "Remove animations" / reduce motion is on (design.md §8.1). */
  reduceMotion: boolean;
  /** The stored preference has been read; the splash stays up until then (no light flash). */
  ready: boolean;
};

const ThemeContext = createContext<ThemeValue>({
  ...lightTheme,
  font: () => undefined,
  preference: 'light',
  setPreference: () => undefined,
  reduceMotion: false,
  ready: true,
});

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduceMotion;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [ready, setReady] = useState(false);
  const system = useColorScheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isThemePreference(stored)) setPreferenceState(stored);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  // Native surfaces (date picker, dialogs) follow the app's choice, not only the OS.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const scheme = resolveScheme(preference, system === 'dark' ? 'dark' : 'light');
  const base = scheme === 'dark' ? darkTheme : lightTheme;

  // Root window colour behind screens and the keyboard: neutral onyx in dark mode.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(base.colors.canvas).catch(() => undefined);
  }, [base]);

  const value = useMemo<ThemeValue>(
    () => ({
      ...base,
      font: (weight) => (loaded ? FAMILIES[weight] : undefined),
      preference,
      setPreference,
      reduceMotion,
      ready,
    }),
    [base, loaded, preference, setPreference, reduceMotion, ready],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
