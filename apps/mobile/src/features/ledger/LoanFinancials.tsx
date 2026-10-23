import { formatPaise, type LoanDto } from '@miniledger/shared';
import { Send } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedAmount } from '@/components/AnimatedAmount';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { StatusChip, type ChipKind } from '@/components/StatusChip';
import { dueStatus, formatDateLong } from '@/lib/format';
import { curves, durations } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

const COUNTDOWN: Record<ReturnType<typeof dueStatus>['tone'], ChipKind> = {
  danger: 'danger',
  warning: 'warning',
  success: 'settled',
  neutral: 'due',
};

/**
 * S07 financial hierarchy (design.md S07 v2): chips, Remaining (largest, in ink), Original /
 * Received / share, a state-coloured progress bar and the due line. Colour lives on the chips,
 * the bar and the due line only. The bar and Remaining animate after each repayment.
 */
export function LoanFinancials({ loan, onRemind }: { loan: LoanDto; onRemind?: () => void }) {
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
      <View style={styles.top}>
        <View style={styles.chips}>
          <StatusChip kind={lent ? 'lent' : 'borrowed'} label={lent ? 'Lent' : 'Borrowed'} />
          <StatusChip kind={COUNTDOWN[status.tone]} label={status.label} />
        </View>
        <View>
          <AppText variant="secondary" color="textSecondary">
            {repaid ? 'Fully repaid' : lent ? 'Remaining to receive' : 'Remaining to pay back'}
          </AppText>
          <AnimatedAmount
            paise={repaid ? loan.principalPaise : loan.outstandingPaise}
            variant="hero"
            color={repaid ? 'textSecondary' : 'textPrimary'}
            numberOfLines={1}
            adjustsFontSizeToFit
          />
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.outline }]} />

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

        <View style={styles.dueRow}>
          <AppText
            variant="secondary"
            color={loan.isOverdue ? 'dangerText' : 'textSecondary'}
            style={styles.flex}
          >
            {repaid
              ? `Was due ${formatDateLong(loan.dueDate)}`
              : `Due ${formatDateLong(loan.dueDate)}`}
          </AppText>
          {onRemind ? (
            <Button variant="ghost" compact icon={Send} label="Remind" onPress={onRemind} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2 },
  top: { padding: space.s5, gap: space.s4 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginHorizontal: space.s5 },
  body: { padding: space.s5, gap: space.s4 },
  chips: { flexDirection: 'row', gap: space.s2, flexWrap: 'wrap' },
  columns: { flexDirection: 'row', gap: space.s4 },
  column: { flex: 1, gap: 2 },
  share: { flex: 0, alignItems: 'flex-end' },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, minHeight: 32 },
  flex: { flex: 1 },
});
