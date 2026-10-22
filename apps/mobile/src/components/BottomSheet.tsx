import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

const DURATION = 240;

/**
 * Raised sheet over a scrim: the scrim fades while the sheet rises, 220–300 ms, no overshoot
 * (design.md §7 BottomSheet, §8.1). Android back closes it.
 */
export function BottomSheet({ visible, title, onClose, children }: Props) {
  const { colors, scheme, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : DURATION,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, mounted, progress, reduceMotion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [360, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.fill, { opacity: progress }]}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          style={[styles.fill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surfaceRaised,
            paddingBottom: insets.bottom + space.s5,
            transform: [{ translateY }],
          },
          scheme === 'light' ? [styles.shadow, { shadowColor: colors.textPrimary }] : null,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.outlineStrong }]} />
        <AppText variant="section" accessibilityRole="header">
          {title}
        </AppText>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    gap: space.s4,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.6 },
  shadow: {
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
});
