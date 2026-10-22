import { StyleSheet, View } from 'react-native';

import { initials } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { radius } from '@/theme/tokens';

import { AppText } from './AppText';

/** Neutral initials circle; no photos, no random colors (design.md §7.2). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no"
      style={[styles.circle, { width: size, height: size, backgroundColor: colors.surfaceMuted }]}
    >
      <AppText variant="rowTitle" color="textSecondary">
        {initials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
