/**
 * Theme + fonts. Fonts never block rendering: the system font is used until Plus Jakarta Sans
 * finishes loading (design.md §3.1). P0 is light-only; Phase 5 adds Dark / Use device setting.
 */
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { lightTheme, type Theme } from './tokens';

export type FontWeight = '400' | '500' | '600' | '700';

const FAMILIES: Record<FontWeight, string> = {
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  '700': 'PlusJakartaSans_700Bold',
};

export type ThemeValue = Theme & {
  /** Font family for a weight, or undefined while the custom font is not available. */
  font: (weight: FontWeight) => string | undefined;
};

const ThemeContext = createContext<ThemeValue>({ ...lightTheme, font: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const value = useMemo<ThemeValue>(
    () => ({ ...lightTheme, font: (weight) => (loaded ? FAMILIES[weight] : undefined) }),
    [loaded],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
