import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import type { ShadowLevel } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STEP_DOWN: Record<ShadowLevel, ShadowLevel | null> = {
  s1: null,
  s2: 's1',
  s2up: null,
  s3: 's2',
};

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Resting shadow; steps down one level while pressed (design.md §2.6). */
  shadow?: ShadowLevel;
  /** Pressed scale (design.md §8.1). */
  scaleTo?: number;
  ripple?: boolean;
};

/**
 * A pressable surface with the house press feel: quick scale-in, slower release, shadow step-down,
 * optional Android ripple. Reduce motion keeps the shadow change and drops the scale.
 */
export function Tappable({
  children,
  style,
  shadow,
  scaleTo = 0.97,
  ripple = false,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      android_ripple={ripple && !disabled ? { color: theme.ripple } : undefined}
      onPressIn={(e) => {
        setPressed(true);
        if (!theme.reduceMotion) scale.set(withTiming(scaleTo, { duration: durations.pressIn }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.set(withTiming(1, { duration: durations.pressOut }));
        onPressOut?.(e);
      }}
      style={[style, shadow ? theme.shadow(pressed ? STEP_DOWN[shadow] : shadow) : null, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
