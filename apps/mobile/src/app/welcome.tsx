/**
 * S00 Welcome (design.md S00): shown once per device before sign-in. The wallet mark greets
 * with a coin peek, three swipeable pages explain the app, and the next button grows into
 * "Get started" on the last page. Everything follows the swipe; reduce motion keeps it still.
 */
import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { HeroWallet } from '@/components/HeroWallet';
import { Wordmark } from '@/components/Wordmark';
import { HandoverArt, LedgerArt, ReminderArt } from '@/features/onboarding/illustrations';
import { useWelcome } from '@/features/onboarding/welcome-state';
import { haptics } from '@/lib/haptics';
import { springLively } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, radius, space } from '@/theme/tokens';

const PAGES = [
  {
    key: 'lend',
    Art: HandoverArt,
    title: 'Track what you lend',
    body: "Note who has your money and when it's due back.",
  },
  {
    key: 'owe',
    Art: LedgerArt,
    title: 'Remember what you owe',
    body: 'Every loan in one calm ledger, with due dates that never slip.',
  },
  {
    key: 'terms',
    Art: ReminderArt,
    title: 'Stay on good terms',
    body: 'Friendly reminders in a tap. No awkward conversations.',
  },
] as const;

const LAST = PAGES.length - 1;
const BUTTON = 56;
const BUTTON_WIDE = 168;

function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => {
    const p = width > 0 ? x.get() / width : 0;
    const t = interpolate(Math.abs(p - index), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 8 + t * 16, opacity: 0.35 + t * 0.65 };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: colors.brandPrimary }, style]} />;
}

function Page({
  index,
  x,
  width,
  page,
}: {
  index: number;
  x: SharedValue<number>;
  width: number;
  page: (typeof PAGES)[number];
}) {
  const { reduceMotion } = useTheme();
  // Gentle parallax: the art drifts slower than the page and fades at the edges.
  const art = useAnimatedStyle(() => {
    const p = x.get() / width - index;
    return {
      opacity: interpolate(Math.abs(p), [0, 0.8], [1, 0.2], Extrapolation.CLAMP),
      transform: [
        { translateX: reduceMotion ? 0 : p * width * 0.35 },
        { scale: reduceMotion ? 1 : interpolate(Math.abs(p), [0, 1], [1, 0.92]) },
      ],
    };
  });
  const Art = page.Art;
  return (
    <View style={[styles.page, { width }]}>
      <Animated.View style={art}>
        <Art width={Math.min(300, width - 56)} />
      </Animated.View>
      <View style={styles.copy}>
        <AppText variant="title" align="center" accessibilityRole="header">
          {page.title}
        </AppText>
        <AppText color="textSecondary" align="center">
          {page.body}
        </AppText>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const { colors, reduceMotion } = useTheme();
  const { finish } = useWelcome();
  const { width } = useWindowDimensions();
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  const last = useRef(0);

  // The mark says hello once: the cover opens and a coin peeks out.
  const open = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    open.set(
      withDelay(
        350,
        withSequence(withSpring(1, springLively), withDelay(500, withSpring(0, springLively))),
      ),
    );
  }, [open, reduceMotion]);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  const button = useAnimatedStyle(() => {
    const p = interpolate(x.get(), [(LAST - 1) * width, LAST * width], [0, 1], Extrapolation.CLAMP);
    return { width: BUTTON + (BUTTON_WIDE - BUTTON) * p };
  });
  const label = useAnimatedStyle(() => ({
    opacity: interpolate(
      x.get(),
      [(LAST - 0.4) * width, LAST * width],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const arrow = useAnimatedStyle(() => ({
    opacity: interpolate(
      x.get(),
      [(LAST - 1) * width, (LAST - 0.6) * width],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const goTo = (index: number) => {
    scroll.current?.scrollTo({ x: index * width, animated: !reduceMotion });
  };
  const next = () => {
    if (page >= LAST) {
      haptics.success();
      finish();
    } else {
      goTo(page + 1);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.canvas }]}>
      <View style={styles.topBar}>
        {page < LAST ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            onPress={finish}
            hitSlop={12}
            style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
          >
            <AppText variant="button" color="textSecondary">
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.brand}>
        <HeroWallet size={92} open={open} coin />
        <Wordmark size="large" />
        <AppText color="textSecondary" align="center">
          Lend, borrow, stay on good terms.
        </AppText>
      </View>

      <Animated.ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          if (index !== last.current) {
            last.current = index;
            haptics.selection();
          }
          setPage(index);
        }}
        style={styles.pager}
      >
        {PAGES.map((p, i) => (
          <Page key={p.key} index={i} x={x} width={width} page={p} />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}
        >
          {PAGES.map((p, i) => (
            <Dot key={p.key} index={i} x={x} width={width} />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={page >= LAST ? 'Get started' : 'Next'}
          onPress={next}
        >
          {({ pressed }) => (
            <Animated.View
              style={[
                styles.next,
                { backgroundColor: pressed ? colors.brandPressed : colors.brandPrimary },
                button,
              ]}
            >
              <Animated.View style={[styles.nextLabel, label]}>
                <AppText variant="button" color="onBrand" numberOfLines={1}>
                  Get started
                </AppText>
              </Animated.View>
              <Animated.View style={[styles.nextArrow, arrow]}>
                <ArrowRight size={24} color={colors.onBrand} strokeWidth={2.25} />
              </Animated.View>
            </Animated.View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space.s5,
  },
  skip: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: space.s2 },
  brand: { alignItems: 'center', gap: space.s2, paddingHorizontal: space.s6 },
  pager: { flexGrow: 1 },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s5,
    paddingHorizontal: space.s6,
  },
  copy: { gap: space.s2, maxWidth: 340 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.s6,
    paddingBottom: space.s6,
    paddingTop: space.s3,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  next: {
    height: BUTTON,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nextLabel: { position: 'absolute' },
  nextArrow: { position: 'absolute' },
});
