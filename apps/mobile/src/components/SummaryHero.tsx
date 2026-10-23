import { formatPaise } from '@miniledger/shared';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { plural } from '@/lib/format';
import { curves, durations, springLively } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

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

const GAP = 3;
const WALLET = 76;

/**
 * One stacked bar for everything you lent: repaid (green), still owed (neutral), overdue (coral).
 * Reveals left to right on the first load; reduce motion shows it at once.
 */
function LentBar({
  lent,
  repaid,
  overdue,
  reveal,
}: {
  lent: number;
  repaid: number;
  overdue: number;
  reveal: boolean;
}) {
  const { colors, reduceMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const shown = useSharedValue(reveal && !reduceMotion ? 0 : 1);
  useEffect(() => {
    if (width === 0) return;
    shown.set(
      reduceMotion ? 1 : withTiming(1, { duration: durations.amount, easing: curves.standard }),
    );
  }, [width, reduceMotion, shown]);
  const clip = useAnimatedStyle(() => ({ width: width * shown.get() }));

  const pending = Math.max(0, lent - repaid - overdue);
  const parts = [
    { key: 'repaid', value: repaid, color: colors.heroPositive, opacity: 1 },
    { key: 'pending', value: pending, color: colors.onHero, opacity: 0.32 },
    { key: 'overdue', value: overdue, color: colors.heroAlert, opacity: 1 },
  ].filter((p) => p.value > 0);
  const usable = Math.max(0, width - GAP * (parts.length - 1));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View
        style={[StyleSheet.absoluteFill, styles.trackTint, { backgroundColor: colors.onHero }]}
      />
      <Animated.View style={[styles.clip, clip]}>
        <View style={[styles.segments, { width }]}>
          {parts.map((p) => (
            <View
              key={p.key}
              style={[
                styles.segment,
                {
                  width: lent > 0 ? Math.max(4, (p.value / lent) * usable) : 0,
                  backgroundColor: p.color,
                  opacity: p.opacity,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function Figure({
  label,
  paise,
  dot,
  hollow,
}: {
  label: string;
  paise: number;
  dot: keyof ColorTokens;
  hollow?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.figure}>
      <View style={styles.figureLabel}>
        <View
          style={[
            styles.dot,
            hollow
              ? { borderWidth: 1.5, borderColor: colors[dot] }
              : { backgroundColor: colors[dot] },
          ]}
        />
        <AppText variant="secondary" color="onHeroMuted" numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <AppText
        variant="rowTitle"
        weight="700"
        color="onHero"
        tabular
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatPaise(paise)}
      </AppText>
    </View>
  );
}

/**
 * Tonal layers inside the card (no glow): a lighter-to-deeper diagonal shade, two large soft
 * discs in the card's own ink at a few percent, and a 1dp top highlight like a lit edge.
 */
function Shading() {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  return (
    <View
      style={[
        styles.shading,
        {
          backgroundImage: `linear-gradient(155deg, ${colors.heroTop} 0%, ${colors.heroSurface} 55%, ${colors.heroBottom} 100%)`,
        },
      ]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[styles.discLarge, { backgroundColor: colors.onHero, opacity: dark ? 0.045 : 0.06 }]}
      />
      <View
        style={[
          styles.discSmall,
          { backgroundColor: colors.onHero, opacity: dark ? 0.035 : 0.045 },
        ]}
      />
      <View
        style={[
          styles.highlight,
          { backgroundColor: dark ? '#FFFFFF' : colors.onHero, opacity: dark ? 0.7 : 0.1 },
        ]}
      />
    </View>
  );
}

/**
 * The one coloured surface on Home (design.md S04 v2): what you'll receive with the living wallet
 * mark beside it, a stacked bar of everything you lent, and the brief's three figures (lent,
 * repaid, overdue) as a legend. Tonal layers and two sheets peeking below give it depth.
 * Amounts stay in ink; colour only marks repaid and overdue.
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
  const dark = scheme === 'dark';
  const owed = outstandingLentPaise > 0;

  // The wallet comes alive on events only: a peek after the first count-up, a peek whenever a
  // payment changes the figures, and the cover opening while the card is pressed.
  const open = useSharedValue(0);
  const seen = useRef<string | null>(null);
  const figures = `${outstandingLentPaise}:${totalRepaidPaise}`;
  useEffect(() => {
    const first = seen.current === null;
    if (seen.current === figures) return;
    seen.current = figures;
    if (reduceMotion || (first && !countUp)) return;
    open.set(
      withDelay(
        first ? durations.amount + 150 : 0,
        withSequence(withSpring(1, springLively), withDelay(420, withSpring(0, springLively))),
      ),
    );
  }, [figures, countUp, reduceMotion, open]);

  const lentAny = totalLentPaise > 0;
  const context = owed
    ? `from ${plural(peopleOwingYou, 'person', 'people')}`
    : lentAny
      ? 'Everything you lent has been repaid'
      : 'Nothing owed to you right now';
  const spoken = [
    `You'll receive ${formatPaise(outstandingLentPaise)}`,
    context,
    lentAny
      ? `Lent ${formatPaise(totalLentPaise)}, repaid ${formatPaise(totalRepaidPaise)}, overdue ${formatPaise(overduePaise)}`
      : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View style={styles.stack}>
      {/* Two sheets peeking below the card: it reads as the top page of a ledger stack. */}
      <View
        style={[
          styles.sheet,
          styles.sheetBack,
          { backgroundColor: colors.heroSurface, opacity: dark ? 0.2 : 0.16 },
        ]}
      />
      <View
        style={[
          styles.sheet,
          styles.sheetMid,
          { backgroundColor: colors.heroSurface, opacity: dark ? 0.42 : 0.38 },
        ]}
      />
      <Tappable
        accessibilityRole={onPress ? 'button' : 'summary'}
        accessibilityLabel={spoken}
        accessibilityHint={onPress ? 'Shows the loans people still owe you' : undefined}
        disabled={!onPress}
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) open.set(withSpring(1, springLively));
        }}
        onPressOut={() => {
          open.set(reduceMotion ? 0 : withSpring(0, springLively));
        }}
        shadow="s2"
        scaleTo={0.985}
        style={[styles.card, { backgroundColor: colors.heroSurface }]}
      >
        <Shading />
        <View style={styles.top}>
          <View style={styles.headline}>
            <AppText variant="overline" color="onHeroMuted">
              YOU&apos;LL RECEIVE
            </AppText>
            <AnimatedAmount
              paise={outstandingLentPaise}
              countUp={countUp}
              variant="hero"
              color="onHero"
              numberOfLines={1}
              adjustsFontSizeToFit
            />
            <View style={styles.context}>
              <AppText variant="secondary" color="onHeroMuted" numberOfLines={1}>
                {context}
              </AppText>
              {onPress ? (
                <ChevronRight size={16} color={colors.onHeroMuted} strokeWidth={2} />
              ) : null}
            </View>
          </View>
          <View style={styles.wallet}>
            <HeroWallet size={WALLET} open={open} rimmed={!dark} coin />
          </View>
        </View>

        {lentAny ? (
          <>
            <LentBar
              lent={totalLentPaise}
              repaid={totalRepaidPaise}
              overdue={overduePaise}
              reveal={!!countUp}
            />
            <View style={styles.figures}>
              <Figure label="Lent" paise={totalLentPaise} dot="onHeroMuted" hollow />
              <Figure label="Repaid" paise={totalRepaidPaise} dot="heroPositive" />
              <Figure label="Overdue" paise={overduePaise} dot="heroAlert" />
            </View>
          </>
        ) : null}
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Room for the sheets that peek below the card.
  stack: { paddingBottom: 12 },
  sheet: { position: 'absolute', height: 40, borderRadius: radius.xl },
  sheetMid: { left: 10, right: 10, bottom: 6 },
  sheetBack: { left: 22, right: 22, bottom: 0 },
  card: {
    borderRadius: radius.xl,
    paddingHorizontal: space.s5,
    paddingTop: space.s5,
    paddingBottom: space.s5,
    gap: space.s4,
  },
  shading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  discLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -120,
    right: -90,
  },
  discSmall: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -130,
    left: -60,
  },
  highlight: { position: 'absolute', top: 0, left: 22, right: 22, height: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s3 },
  headline: { flex: 1, gap: 2 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  wallet: { marginTop: -space.s1, marginRight: -space.s2 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  trackTint: { opacity: 0.12 },
  clip: { height: 8, overflow: 'hidden' },
  segments: { flexDirection: 'row', height: 8, gap: GAP },
  segment: { height: 8, borderRadius: 4 },
  figures: { flexDirection: 'row', gap: space.s3 },
  figure: { flex: 1, gap: 2 },
  figureLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
