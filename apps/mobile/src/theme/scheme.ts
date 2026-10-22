export type ThemePreference = 'light' | 'dark' | 'system';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

/** The scheme to render for a stored preference and the OS appearance (design.md §2.4). */
export function resolveScheme(
  preference: ThemePreference,
  system: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}
