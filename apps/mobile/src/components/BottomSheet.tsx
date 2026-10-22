import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Raised sheet over a scrim: the sheet rises (280 ms) while the scrim fades in; it leaves faster
 * (200 ms) (design.md §8.1). Scrim tap and Android back close it. Light: S3 shadow; dark: hairline.
 */
export function BottomSheet({ visible, title, onClose, children }: Props) {
  const { colors, scheme, shadow, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? durations.sheetIn : durations.sheetOut,
      easing: visible ? Easing.bezier(0.2, 0, 0, 1) : Easing.bezier(0.3, 0, 1, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, mounted, progress, reduceMotion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
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
          scheme === 'dark'
            ? { borderColor: colors.outline, borderWidth: StyleSheet.hairlineWidth * 2 }
            : shadow('s3'),
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.outlineStrong }]} />
        {title ? (
          <AppText variant="section" accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
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
});
