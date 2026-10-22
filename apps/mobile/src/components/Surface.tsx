import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

/** Level-1 surface: white/charcoal with a hairline outline (design.md §2.6). */
export function Surface({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.outline }, style]}
    >
      {children}
    </View>
  );
}

/** Hairline divider inset by the row padding (design.md §7.3). */
export function Divider({ inset = 16 }: { inset?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth * 2,
        marginLeft: inset,
        backgroundColor: colors.outline,
      }}
    />
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
});
