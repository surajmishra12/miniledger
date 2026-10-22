import { CheckCheck } from 'lucide-react-native';
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

import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

const SnackbarContext = createContext<(message: string) => void>(() => undefined);

/** Clears the bottom bar (and its raised Add button) and two-button form footers. */
const BOTTOM_OFFSET = 152;

/**
 * Low-risk success feedback only, 4 s, announced to TalkBack (design.md §7, §8.1):
 * rises 12dp with a check, S3 shadow in light, hairline in dark.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const { colors, shadow, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [offset] = useState(() => new Animated.Value(12));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      AccessibilityInfo.announceForAccessibility(next);
      const duration = reduceMotion ? 0 : durations.success;
      offset.setValue(reduceMotion ? 0 : 12);
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
            shadow('s3'),
          ]}
        >
          <CheckCheck size={18} color={colors.successText} strokeWidth={2} />
          <AppText variant="secondary" weight="500" style={styles.text}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  text: { flex: 1 },
});
