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

/** Low-risk success feedback only, 4 s, announced to TalkBack (design.md §7, §7.1). */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      AccessibilityInfo.announceForAccessibility(next);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() =>
          setMessage(null),
        );
      }, 4000);
    },
    [opacity],
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
          style={[
            styles.bar,
            { opacity, bottom: insets.bottom + 96, backgroundColor: colors.textPrimary },
          ]}
        >
          <AppText variant="secondary" color="canvas">
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
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
  },
});
