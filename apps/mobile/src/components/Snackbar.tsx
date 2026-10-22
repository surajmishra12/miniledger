import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

const SnackbarContext = createContext<(message: string) => void>(() => undefined);

/** Clears the 64dp tab bar plus the 56dp FAB on Home, and footers on form screens. */
const BOTTOM_OFFSET = 152;

/**
 * Low-risk success feedback only, 4 s, announced to TalkBack (design.md §7, §7.1).
 * Raised surface (level 2), never an inverse slab, so it reads correctly in both themes.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const { colors, scheme, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [offset] = useState(() => new Animated.Value(8));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      AccessibilityInfo.announceForAccessibility(next);
      const duration = reduceMotion ? 0 : 180;
      offset.setValue(reduceMotion ? 0 : 8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }).start(() =>
          setMessage(null),
        );
      }, 4000);
    },
    [opacity, offset, reduceMotion],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      {message ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.bar,
            {
              opacity,
              transform: [{ translateY: offset }],
              bottom: insets.bottom + BOTTOM_OFFSET,
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.outline,
            },
            scheme === 'light' ? [styles.shadow, { shadowColor: colors.textPrimary }] : null,
          ]}
        >
          <AppText variant="secondary" weight="500">
            {message}
          </AppText>
        </Animated.View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

export const useSnackbar = () => useContext(SnackbarContext);

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.s5,
    right: space.s5,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
  // Warm espresso shadow, light mode only (design.md §2.6).
  shadow: {
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
