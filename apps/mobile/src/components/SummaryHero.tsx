import { formatPaise } from '@miniledger/shared';
import { ChevronRight, CircleAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { repaidShare } from '@/lib/format';
import { curves, durations, spring } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { heroGradient, radius, space } from '@/theme/tokens';

import { AnimatedAmount } from './AnimatedAmount';
import { AppText } from './AppText';
import { HeroWallet } from './HeroWallet';
import { Tappable } from './Tappable';

type Props = {
  outstandingLentPaise: number;
  totalLentPaise: number;
  totalRepaidPaise: number;
  overduePaise: number;
  peopleOwingYou: number;
  countUp?: boolean;
  onPress?: () => void;
};

const WALLET = 92;

/** Faint ledger rings and ruled lines across the right half (design.md §10.3). */
function LineArt() {
  const { colors } = useTheme();
  return (
    <Svg
      width={300}
      height={220}
      viewBox="0 0 300 220"
      style={styles.lineArt}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[84, 128, 172].map((r) => (
        <Circle
          key={r}
          cx={268}
          cy={236}
          r={r}
          fill="none"
          stroke={colors.onHero}
          strokeOpacity={0.07}
          strokeWidth={1.5}
        />
      ))}
      {[118, 146, 174].map((y) => (
        <Path
          key={y}
          d={`M60 ${y} H300`}
          stroke={colors.onHero}
          strokeOpacity={0.06}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

/**
 * The one decorated card (design.md S04 item 2): outstanding lent, a received bar and an overdue
 * footer, over line art with the wallet mark tucked into the corner. Pressing opens the flap.
 */
export function SummaryHero({
  outstandingLentPaise,
  totalLentPaise,
  totalRepaidPaise,
  overduePaise,
  peopleOwingYou,
  countUp,
  onPress,
}: Props) {
  const { colors, scheme, reduceMotion } = useTheme();
  const share = repaidShare(totalRepaidPaise, totalLentPaise);
  const fraction = totalLentPaise > 0 ? Math.min(1, totalRepaidPaise / totalLentPaise) : 0;

  const open = useSharedValue(0);
  const fill = useSharedValue(countUp && !reduceMotion ? 0 : fraction);
  useEffect(() => {
    fill.set(
      reduceMotion
        ? fraction
        : withTiming(fraction, { duration: durations.amount, easing: curves.standard }),
    );
  }, [fill, fraction, reduceMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  const owed = outstandingLentPaise > 0;
  const people = `from ${peopleOwingYou} ${peopleOwingYou === 1 ? 'person' : 'people'}`;
  const received =
    share === null
      ? null
      : `${formatPaise(totalRepaidPaise)} of ${formatPaise(totalLentPaise)} received · ${share}%`;
  const overdue = overduePaise > 0 ? `${formatPaise(overduePaise)} overdue` : null;
  const spoken = [
    `You are owed ${formatPaise(outstandingLentPaise)}`,
    owed ? people : 'Nothing owed to you right now',
    received,
    overdue,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Tappable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={spoken}
      accessibilityHint={onPress ? 'Shows the loans people still owe you' : undefined}
      disabled={!onPress}
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) open.set(withSpring(1, spring));
      }}
      onPressOut={() => {
        open.set(reduceMotion ? 0 : withSpring(0, spring));
      }}
      shadow="s2"
      scaleTo={0.985}
      style={[styles.card, { backgroundColor: colors.heroSurface }]}
    >
      {/* Decoration is clipped by its own layer so the card's shadow is never cut off. */}
      <View
        style={[styles.clip, { backgroundImage: heroGradient[scheme] }]}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        <LineArt />
        <View style={styles.wallet}>
          <HeroWallet size={WALLET} open={open} />
        </View>
      </View>

      <View style={styles.headline}>
        <AppText variant="overline" color="onHeroMuted">
          YOU ARE OWED
        </AppText>
        <AnimatedAmount
          paise={outstandingLentPaise}
          countUp={countUp}
          variant="hero"
          color="onHero"
          numberOfLines={1}
          adjustsFontSizeToFit
        />
      </View>

      {received ? (
        <View style={styles.progress}>
          <View style={styles.track}>
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.trackTint,
                { backgroundColor: colors.onHero },
              ]}
            />
            <Animated.View
              style={[styles.fill, { backgroundColor: colors.heroAccent }, fillStyle]}
            />
          </View>
          <AppText variant="secondary" color="onHeroMuted" tabular numberOfLines={1}>
            {received}
          </AppText>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <AppText variant="secondary" color="onHeroMuted" numberOfLines={1}>
            {owed ? people : 'Nothing owed to you right now'}
          </AppText>
          {overdue ? (
            <>
              <AppText variant="secondary" color="onHeroMuted">
                ·
              </AppText>
              <CircleAlert size={15} color={colors.heroAccent} strokeWidth={2} />
              <AppText variant="secondary" color="onHero" weight="600" tabular numberOfLines={1}>
                {overdue}
              </AppText>
            </>
          ) : null}
        </View>
        {onPress ? <ChevronRight size={20} color={colors.onHeroMuted} strokeWidth={1.75} /> : null}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: space.s6, gap: space.s4 },
  clip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  lineArt: { position: 'absolute', right: 0, bottom: 0 },
  wallet: {
    position: 'absolute',
    top: -6,
    right: -14,
    transform: [{ rotate: '-8deg' }],
  },
  headline: { gap: space.s1, paddingRight: WALLET - space.s5 },
  progress: { gap: space.s2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackTint: { opacity: 0.14 },
  fill: { height: 6, borderRadius: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  footerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
});
