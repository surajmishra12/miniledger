import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

/** Slow opacity pulse shared by all placeholders on screen (design.md §8.1). */
function usePulse() {
  const { reduceMotion } = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.55, { duration: durations.skeleton / 2 }), -1, true));
  }, [opacity, reduceMotion]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}

/** Placeholder block with stable dimensions; never zeros or empty states while loading. */
export function SkeletonBlock({
  height,
  width = '100%',
  rounded = radius.md,
}: {
  height: number;
  width?: DimensionValue;
  rounded?: number;
}) {
  const { colors } = useTheme();
  const pulse = usePulse();
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: rounded, backgroundColor: colors.surfaceMuted },
        pulse,
      ]}
    />
  );
}

/** Row-shaped placeholders: avatar circle, two text lines, amount. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.outline }]}
    >
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBlock height={40} width={40} rounded={20} />
          <View style={styles.lines}>
            <SkeletonBlock height={14} width="55%" />
            <SkeletonBlock height={12} width="35%" />
          </View>
          <SkeletonBlock height={16} width={64} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    minHeight: 72,
  },
  lines: { flex: 1, gap: space.s2 },
});
