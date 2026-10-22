import { formatPaise, type LoanDto } from '@miniledger/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { dueStatus, formatDateLong } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { StatusChip, type ChipKind } from './StatusChip';

type Props = { loan: LoanDto; onPress: () => void; showPerson?: boolean };

const TONE_CHIP: Partial<Record<string, ChipKind>> = {
  danger: 'danger',
  warning: 'warning',
  success: 'success',
};

/**
 * Person, direction, remaining balance and due status (design.md S05).
 * Direction always appears as a labelled chip with its arrow (§2.3); the amount stays neutral.
 */
export function LoanRow({ loan, onPress, showPerson = true }: Props) {
  const { ripple } = useTheme();
  const status = dueStatus(loan);
  const lent = loan.direction === 'LENT';
  const partial = loan.repaymentStatus === 'PARTIAL';
  const repaid = loan.repaymentStatus === 'REPAID';
  const chip = TONE_CHIP[status.tone];

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      android_ripple={{ color: ripple }}
      style={styles.row}
    >
      {showPerson ? <Avatar name={loan.person.name} /> : null}
      <View style={styles.middle}>
        <AppText variant="rowTitle" numberOfLines={2}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    minHeight: 72,
  },
  middle: { flex: 1, gap: space.s1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
});
