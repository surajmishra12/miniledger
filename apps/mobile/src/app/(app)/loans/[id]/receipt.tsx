/**
 * S11 full-screen receipt viewer: neutral black, pinch to zoom, drag when zoomed,
 * double tap to reset; native back closes it (design.md S11, §8.3).
 */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { useSession } from '@/features/auth/session';
import { receiptUri } from '@/features/receipts/storage';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export default function ReceiptViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { colors, reduceMotion } = useTheme();
  const [uri] = useState(() => (user ? receiptUri(user.id, id) : null));

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = usePinchGesture({
    onUpdate: (event) => {
      'worklet';
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * event.scale));
    },
    onDeactivate: () => {
      'worklet';
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        x.value = 0;
        y.value = 0;
        savedX.value = 0;
        savedY.value = 0;
      }
    },
  });

  const pan = usePanGesture({
    minPointers: 1,
    onUpdate: (event) => {
      'worklet';
      if (scale.value <= MIN_SCALE) return;
      x.value = savedX.value + event.translationX;
      y.value = savedY.value + event.translationY;
    },
    onDeactivate: () => {
      'worklet';
      savedX.value = x.value;
      savedY.value = y.value;
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      const duration = reduceMotion ? 0 : 200;
      scale.value = withTiming(1, { duration });
      x.value = withTiming(0, { duration });
      y.value = withTiming(0, { duration });
      savedScale.value = 1;
      savedX.value = 0;
      savedY.value = 0;
    },
  });

  const gestures = useSimultaneousGestures(pinch, pan, doubleTap);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.viewerCanvas }]}>
      <View style={styles.top}>
        <IconButton icon={X} label="Close receipt" color="onHero" onPress={() => router.back()} />
      </View>
      {uri ? (
        <GestureDetector gesture={gestures}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.viewerCanvas }, animated]}>
            <Image
              source={{ uri }}
              cachePolicy="none"
              contentFit="contain"
              style={[styles.fill, { backgroundColor: colors.viewerCanvas }]}
              accessibilityLabel="Receipt photo. Pinch to zoom."
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </GestureDetector>
      ) : (
        <View style={styles.missing}>
          <AppText color="onHero" align="center">
            Receipt unavailable on this device.
          </AppText>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Neutral black in both themes (viewerCanvas); the photo is never tinted (design.md §6.1 S11).
  fill: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.s2 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.s6 },
});
