import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { curves } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';

/**
 * Entrance: fade in and rise 8dp after `delay` ms (design.md §8.1 first-load stagger).
 * `animate=false` renders in place immediately (later visits, reduce motion).
 */
export function Rise({
  children,
  delay = 0,
  animate = true,
  style,
}: {
  children: ReactNode;
  delay?: number;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { reduceMotion } = useTheme();
  const run = animate && !reduceMotion;
  const progress = useSharedValue(run ? 0 : 1);

  useEffect(() => {
    if (run)
      progress.set(withDelay(delay, withTiming(1, { duration: 320, easing: curves.standard })));
  }, [run, delay, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 8 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
