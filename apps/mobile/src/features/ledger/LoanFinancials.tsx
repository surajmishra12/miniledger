import { formatPaise, type LoanDto } from '@miniledger/shared';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedAmount } from '@/components/AnimatedAmount';
import { AppText } from '@/components/AppText';
import { StatusChip } from '@/components/StatusChip';
import { dueStatus, formatDateLong } from '@/lib/format';
import { curves, durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

/**
 * S07 financial hierarchy: Remaining (largest) → Original / Received → progress → due line.
 * The progress fill carries the loan's state and animates after each repayment (design.md §2.7).
 */
export function LoanFinancials({ loan }: { loan: LoanDto }) {
  const { colors, shadow, reduceMotion } = useTheme();
  const lent = loan.direction === 'LENT';
  const status = dueStatus(loan);
  const repaid = loan.repaymentStatus === 'REPAID';
  const ratio = loan.principalPaise > 0 ? loan.repaidPaise / loan.principalPaise : 0;
  const fill = repaid
    ? colors.successText
    : loan.isOverdue
      ? colors.dangerText
      : lent
        ? colors.lentText
        : colors.borrowedText;
  const chip =
    status.tone === 'danger'
      ? 'danger'
      : status.tone === 'warning'
        ? 'warning'
        : status.tone === 'success'
          ? 'success'
          : null;

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
      <View style={styles.chips}>
        <StatusChip kind={lent ? 'lent' : 'borrowed'} label={lent ? 'Lent' : 'Borrowed'} />
        {chip ? <StatusChip kind={chip} label={status.label} /> : null}
      </View>

      <View>
        <AppText variant="secondary" color="textSecondary">
          {repaid ? 'Fully repaid' : 'Remaining'}
        </AppText>
        <AnimatedAmount
          paise={repaid ? loan.principalPaise : loan.outstandingPaise}
          variant="hero"
          color={repaid ? 'successText' : 'textPrimary'}
          numberOfLines={1}
          adjustsFontSizeToFit
        />
      </View>

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
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Repaid"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
      >
        <Animated.View style={[styles.fill, { backgroundColor: fill }, bar]} />
      </View>

      <AppText color={status.tone === 'danger' ? 'dangerText' : 'textSecondary'}>
        {repaid
          ? `Repaid · was due ${formatDateLong(loan.dueDate)}`
          : `${status.label} · Due ${formatDateLong(loan.dueDate)}`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.s5,
    gap: space.s4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  chips: { flexDirection: 'row', gap: space.s2, flexWrap: 'wrap' },
  columns: { flexDirection: 'row', gap: space.s4 },
  column: { flex: 1, gap: 2 },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full },
});
