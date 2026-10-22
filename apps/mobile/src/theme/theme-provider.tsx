import { createContext, useContext, type ReactNode } from 'react';

import { lightTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(lightTheme);

/** P0: always light. Phase 5 adds the Light / Dark / Use device setting preference. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
