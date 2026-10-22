import { formatPaise, type LoanDto } from '@miniledger/shared';
import { StyleSheet, View } from 'react-native';

import { dueStatus, formatDateLong } from '@/lib/format';
import { pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { StatusChip, type ChipKind } from './StatusChip';
import { Tappable } from './Tappable';

type Props = { loan: LoanDto; onPress: () => void; showPerson?: boolean };

const TONE_CHIP: Partial<Record<string, ChipKind>> = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
};

/**
 * Person, direction, remaining balance and due status (design.md S05, §2.7).
 * Overdue and due-soon rows carry a status rail; repaid rows are quieter.
 */
export function LoanRow({ loan, onPress, showPerson = true }: Props) {
  const { colors } = useTheme();
  const status = dueStatus(loan);
  const lent = loan.direction === 'LENT';
  const partial = loan.repaymentStatus === 'PARTIAL';
  const repaid = loan.repaymentStatus === 'REPAID';
  const chip = TONE_CHIP[status.tone];
  const rail =
    status.tone === 'danger'
      ? colors.dangerText
      : status.tone === 'warning'
        ? colors.warningText
        : null;

  const spoken = [
    showPerson ? loan.person.name : null,
    lent ? 'lent' : 'borrowed',
    repaid
      ? `${formatPaise(loan.principalPaise)}, repaid`
      : `remaining ${formatPaise(loan.outstandingPaise)}`,
    repaid ? null : status.label,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      ripple
      scaleTo={pressScale.row}
      style={styles.row}
    >
      {rail ? <View style={[styles.rail, { backgroundColor: rail }]} /> : null}
      {showPerson ? <Avatar name={loan.person.name} muted={repaid} /> : null}
      <View style={styles.middle}>
        <AppText
          variant="rowTitle"
          numberOfLines={2}
          color={repaid ? 'textSecondary' : 'textPrimary'}
        >
          {showPerson ? loan.person.name : `Due ${formatDateLong(loan.dueDate)}`}
        </AppText>
        <View style={styles.meta}>
          <StatusChip kind={lent ? 'lent' : 'borrowed'} label={lent ? 'Lent' : 'Borrowed'} />
          {chip ? (
            <StatusChip kind={chip} label={status.label} />
          ) : (
            <AppText variant="secondary" color="textSecondary">
              {status.label}
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.amounts}>
        <AppText
          variant="rowTitle"
          weight="700"
          tabular
          color={repaid ? 'textSecondary' : 'textPrimary'}
        >
          {formatPaise(repaid ? loan.principalPaise : loan.outstandingPaise)}
        </AppText>
        {partial ? (
          <AppText variant="secondary" color="textSecondary" tabular>
            of {formatPaise(loan.principalPaise)}
          </AppText>
        ) : null}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    minHeight: 76,
  },
  rail: { position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2 },
  middle: { flex: 1, gap: space.s1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
});
