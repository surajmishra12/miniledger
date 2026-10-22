import { formatPaise, type LoanDto } from '@miniledger/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { StatusChip } from '@/components/StatusChip';
import { Surface } from '@/components/Surface';
import { dueStatus, formatDateLong } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

/** S07 financial hierarchy: Remaining (largest) → Original / Received → progress → due line. */
export function LoanFinancials({ loan }: { loan: LoanDto }) {
  const { colors } = useTheme();
  const lent = loan.direction === 'LENT';
  const status = dueStatus(loan);
  const progress = loan.principalPaise > 0 ? loan.repaidPaise / loan.principalPaise : 0;
  const chip =
    status.tone === 'danger'
      ? 'danger'
      : status.tone === 'warning'
        ? 'warning'
        : status.tone === 'success'
          ? 'success'
          : null;

  return (
    <Surface style={styles.card}>
      <View style={styles.chips}>
        <StatusChip kind={lent ? 'lent' : 'borrowed'} label={lent ? 'Lent' : 'Borrowed'} />
        {chip ? <StatusChip kind={chip} label={status.label} /> : null}
      </View>

      <View>
        <AppText variant="secondary" color="textSecondary">
          Remaining
        </AppText>
        <AppText variant="hero" tabular adjustsFontSizeToFit numberOfLines={1}>
          {formatPaise(loan.outstandingPaise)}
        </AppText>
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
          <AppText variant="rowTitle" tabular>
            {formatPaise(loan.repaidPaise)}
          </AppText>
        </View>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Repaid"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        style={[styles.track, { backgroundColor: colors.surfaceMuted }]}
      >
        <View
          style={[
            styles.fill,
            { width: `${Math.min(100, progress * 100)}%`, backgroundColor: colors.brandPrimary },
          ]}
        />
      </View>

      <AppText color={status.tone === 'danger' ? 'dangerText' : 'textSecondary'}>
        {loan.repaymentStatus === 'REPAID'
          ? `Repaid · was due ${formatDateLong(loan.dueDate)}`
          : `${status.label} · Due ${formatDateLong(loan.dueDate)}`}
      </AppText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.s5, gap: space.s4 },
  chips: { flexDirection: 'row', gap: space.s2, flexWrap: 'wrap' },
  columns: { flexDirection: 'row', gap: space.s4 },
  column: { flex: 1, gap: 2 },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full },
});
