import { useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Press feedback over ~120 ms: a tiny scale plus a tracked pressed flag for tonal changes
 * (design.md §7.3, §8.1). Reduce motion keeps the tonal change and drops the scale.
 */
export function usePressFeedback(reduceMotion: boolean, scaleTo = 0.98) {
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  const to = (value: number) => {
    animation.current?.stop();
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    animation.current = Animated.timing(scale, {
      toValue: value,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.current.start();
  };

  return {
    pressed,
    scaleStyle: { transform: [{ scale }] },
    onPressIn: () => {
      setPressed(true);
      to(scaleTo);
    },
    onPressOut: () => {
      setPressed(false);
      to(1);
    },
  };
}
