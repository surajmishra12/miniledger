import { StyleSheet, View, type DimensionValue } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

/** Static placeholder block with stable dimensions; no shimmer loop (design.md §7.2). */
export function SkeletonBlock({
  height,
  width = '100%',
}: {
  height: number;
  width?: DimensionValue;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{ height, width, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}
    />
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonBlock key={i} height={64} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: space.s3 } });
