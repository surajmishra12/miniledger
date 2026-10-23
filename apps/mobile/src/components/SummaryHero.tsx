import { formatPaise } from '@miniledger/shared';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { plural } from '@/lib/format';
import { curves, durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

import { AnimatedAmount } from './AnimatedAmount';
import { AppText } from './AppText';
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
 * The one coloured surface on Home (design.md S04 v2): what you'll receive, a stacked bar of
 * everything you lent, and the brief's three figures (lent, repaid, overdue) as a legend.
 * Amounts stay in neutral ink; colour only marks repaid and overdue.
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
  const { colors, scheme } = useTheme();
  const owed = outstandingLentPaise > 0;
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
    <Tappable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={spoken}
      accessibilityHint={onPress ? 'Shows the loans people still owe you' : undefined}
      disabled={!onPress}
      onPress={onPress}
      shadow="s2"
      scaleTo={0.985}
      style={[
        styles.card,
        {
          backgroundColor: colors.heroSurface,
          // In dark mode a hairline separates the espresso card from the onyx canvas.
          borderColor: scheme === 'dark' ? colors.outline : 'transparent',
        },
      ]}
    >
      <View style={styles.top}>
        <AppText variant="overline" color="onHeroMuted">
          YOU&apos;LL RECEIVE
        </AppText>
        {onPress ? <ChevronRight size={20} color={colors.onHeroMuted} strokeWidth={1.75} /> : null}
      </View>

      <View style={styles.headline}>
        <AnimatedAmount
          paise={outstandingLentPaise}
          countUp={countUp}
          variant="hero"
          color="onHero"
          numberOfLines={1}
          adjustsFontSizeToFit
        />
        <AppText variant="secondary" color="onHeroMuted">
          {context}
        </AppText>
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.s5,
    paddingTop: space.s5,
    paddingBottom: space.s5,
    gap: space.s4,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headline: { gap: 2, marginTop: -space.s2 },
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
