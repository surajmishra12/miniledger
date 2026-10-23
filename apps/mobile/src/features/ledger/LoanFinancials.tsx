import { formatPaise, type LoanDto } from '@miniledger/shared';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedAmount } from '@/components/AnimatedAmount';
import { AppText } from '@/components/AppText';
import { StatusChip, type ChipKind } from '@/components/StatusChip';
import { dueStatus, formatDateLong } from '@/lib/format';
import { curves, durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space, type ColorTokens } from '@/theme/tokens';

const COUNTDOWN: Record<ReturnType<typeof dueStatus>['tone'], ChipKind> = {
  danger: 'danger',
  warning: 'warning',
  success: 'settled',
  neutral: 'due',
};

/**
 * S07 financial hierarchy on a tinted header strip in the loan's state colour: chips and
 * Remaining (largest) up top, then Original / Received, progress and the due line
 * (design.md S07, §2.7). The progress fill animates after each repayment.
 */
export function LoanFinancials({ loan }: { loan: LoanDto }) {
  const { colors, shadow, reduceMotion } = useTheme();
  const lent = loan.direction === 'LENT';
  const status = dueStatus(loan);
  const repaid = loan.repaymentStatus === 'REPAID';
  const ratio = loan.principalPaise > 0 ? loan.repaidPaise / loan.principalPaise : 0;

  const tone: { text: keyof ColorTokens; surface: keyof ColorTokens } = repaid
    ? { text: 'textSecondary', surface: 'surfaceMuted' }
    : loan.isOverdue
      ? { text: 'dangerText', surface: 'dangerSurface' }
      : lent
        ? { text: 'lentText', surface: 'lentSurface' }
        : { text: 'borrowedText', surface: 'borrowedSurface' };
  const fill = repaid ? colors.successText : colors[tone.text];

  const progress = useSharedValue(reduceMotion ? ratio : 0);
  useEffect(() => {
    progress.set(
      reduceMotion
        ? ratio
        : withTiming(ratio, { duration: durations.progress, easing: curves.standard }),
    );
  }, [ratio, reduceMotion, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.min(100, progress.get() * 100)}%` }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.outline },
        shadow('s1'),
      ]}
    >
      <View style={[styles.strip, { backgroundColor: colors[tone.surface] }]}>
        <View style={styles.chips}>
          <StatusChip kind={lent ? 'lent' : 'borrowed'} label={lent ? 'Lent' : 'Borrowed'} onTint />
          <StatusChip kind={COUNTDOWN[status.tone]} label={status.label} onTint />
        </View>
        <View>
          <AppText variant="secondary" color="textSecondary">
            {repaid ? 'Fully repaid' : lent ? 'Remaining to receive' : 'Remaining to pay back'}
          </AppText>
          <AnimatedAmount
            paise={repaid ? loan.principalPaise : loan.outstandingPaise}
            variant="hero"
            color={tone.text}
            numberOfLines={1}
            adjustsFontSizeToFit
          />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <AppText variant="secondary" color="textSecondary">
              Original
            </AppText>
            <AppText variant="rowTitle" tabular>
              {formatPaise(loan.principalPaise)}
            </AppText>
          </View>
          <View style={styles.column}>
            <AppText variant="secondary" color="textSecondary">
              {lent ? 'Received' : 'Paid back'}
            </AppText>
            <AnimatedAmount paise={loan.repaidPaise} variant="rowTitle" />
          </View>
          <View style={[styles.column, styles.share]}>
            <AppText variant="secondary" color="textSecondary">
              Repaid
            </AppText>
            <AppText variant="rowTitle" tabular>
              {Math.floor(ratio * 100)}%
            </AppText>
          </View>
        </View>

        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Repaid"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
          style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
        >
          <Animated.View style={[styles.fill, { backgroundColor: fill }, bar]} />
        </View>

        <AppText variant="secondary" color={loan.isOverdue ? 'dangerText' : 'textSecondary'}>
          {repaid
            ? `Was due ${formatDateLong(loan.dueDate)}`
            : `Due ${formatDateLong(loan.dueDate)}`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  // Rounded to sit inside the card's border (no overflow clipping, so the shadow stays intact).
  strip: {
    padding: space.s5,
    gap: space.s4,
    borderTopLeftRadius: radius.lg - 1,
    borderTopRightRadius: radius.lg - 1,
  },
  body: { padding: space.s5, gap: space.s4 },
  chips: { flexDirection: 'row', gap: space.s2, flexWrap: 'wrap' },
  columns: { flexDirection: 'row', gap: space.s4 },
  column: { flex: 1, gap: 2 },
  share: { flex: 0, alignItems: 'flex-end' },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full },
});
