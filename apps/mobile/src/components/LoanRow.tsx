import { formatPaise, type LoanDto } from '@miniledger/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { dueStatus } from '@/lib/format';
import { useTheme } from '@/theme/theme-provider';
import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { StatusChip } from './StatusChip';

type Props = { loan: LoanDto; onPress: () => void; showPerson?: boolean };

/** Person, direction, remaining balance and due status (design.md S05). */
export function LoanRow({ loan, onPress, showPerson = true }: Props) {
  const { colors } = useTheme();
  const status = dueStatus(loan);
  const lent = loan.direction === 'LENT';
  const partial = loan.repaymentStatus === 'PARTIAL';
  const chip =
    status.tone === 'danger'
      ? ('danger' as const)
      : status.tone === 'warning'
        ? ('warning' as const)
        : status.tone === 'success'
          ? ('success' as const)
          : null;

  const spoken = [
    loan.person.name,
    lent ? 'lent' : 'borrowed',
    `remaining ${formatPaise(loan.outstandingPaise)}`,
    status.label,
  ].join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      android_ripple={{ color: `${colors.textPrimary}14` }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {showPerson ? <Avatar name={loan.person.name} /> : null}
      <View style={styles.middle}>
        <AppText variant="rowTitle" numberOfLines={2}>
          {showPerson ? loan.person.name : lent ? 'Lent' : 'Borrowed'}
        </AppText>
        <View style={styles.meta}>
          {showPerson ? (
            <StatusChip kind={lent ? 'lent' : 'borrowed'} label={lent ? 'Lent' : 'Borrowed'} />
          ) : null}
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
        <AppText variant="rowTitle" tabular>
          {formatPaise(loan.outstandingPaise)}
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
