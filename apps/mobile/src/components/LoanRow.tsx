import { formatPaise, type LoanDto } from '@miniledger/shared';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { dueStatus } from '@/lib/format';
import { loanReminder, shareReminder } from '@/lib/remind';
import { pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, space, type ColorTokens } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Tappable } from './Tappable';

type Props = {
  loan: LoanDto;
  /** Stable handler (rows are memoised); receives the row's loan. */
  onPress: (loan: LoanDto) => void;
  /** Person column; off inside Person detail where the person is the page. */
  showPerson?: boolean;
  /** Inline Remind on overdue money you lent (Home). */
  remind?: boolean;
};

const TONE_TEXT: Record<ReturnType<typeof dueStatus>['tone'], keyof ColorTokens> = {
  danger: 'dangerText',
  warning: 'warningText',
  success: 'textTertiary',
  neutral: 'textSecondary',
};

/** 18dp arrow badge: green ↗ money coming to you, rose ↙ money you owe. */
function DirectionBadge({ lent, size = 18 }: { lent: boolean; size?: number }) {
  const { colors } = useTheme();
  const Icon = lent ? ArrowUpRight : ArrowDownLeft;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: size > 20 ? 0 : 2,
        borderColor: colors.surface,
        backgroundColor: colors[lent ? 'lentSurface' : 'borrowedSurface'],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        size={Math.round(size * 0.55)}
        color={colors[lent ? 'lentText' : 'borrowedText']}
        strokeWidth={2.75}
      />
    </View>
  );
}

/**
 * One loan in a list (design.md S04, S05 v2): who and which way, one status line, and the
 * remaining amount in ink. Colour appears only on the small direction badge, the status line
 * and the 3dp rail on overdue / due-soon rows. Repaid rows recede.
 */
export const LoanRow = memo(function LoanRow({
  loan,
  onPress,
  showPerson = true,
  remind = false,
}: Props) {
  const { colors } = useTheme();
  const lent = loan.direction === 'LENT';
  const status = dueStatus(loan);
  const repaid = loan.repaymentStatus === 'REPAID';
  const partial = loan.repaymentStatus === 'PARTIAL';
  const canRemind = remind && lent && loan.isOverdue;
  const rail =
    status.tone === 'danger'
      ? colors.dangerText
      : status.tone === 'warning'
        ? colors.warningText
        : null;

  const title = showPerson
    ? loan.person.name
    : `${lent ? 'Lent' : 'Borrowed'} ${formatPaise(loan.principalPaise)}`;
  const statusLine =
    showPerson && !lent && !repaid ? `You owe · ${status.label.toLowerCase()}` : status.label;

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={[
        showPerson ? loan.person.name : null,
        lent ? 'lent' : 'borrowed',
        repaid
          ? `${formatPaise(loan.principalPaise)}, repaid`
          : `remaining ${formatPaise(loan.outstandingPaise)}`,
        repaid ? null : status.label,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onPress(loan)}
      ripple
      scaleTo={pressScale.row}
      style={styles.row}
    >
      {rail ? <View style={[styles.rail, { backgroundColor: rail }]} /> : null}
      {showPerson ? (
        <View>
          <Avatar name={loan.person.name} muted={repaid} />
          <View style={styles.badge}>
            <DirectionBadge lent={lent} />
          </View>
        </View>
      ) : (
        <DirectionBadge lent={lent} size={36} />
      )}
      <View style={styles.middle}>
        <AppText
          variant="rowTitle"
          numberOfLines={1}
          color={repaid ? 'textSecondary' : 'textPrimary'}
          tabular={!showPerson}
        >
          {title}
        </AppText>
        <AppText variant="secondary" color={TONE_TEXT[status.tone]} numberOfLines={1}>
          {statusLine}
        </AppText>
      </View>
      <View style={styles.right}>
        {/* Inside Person detail a repaid loan's title already carries its amount. */}
        {repaid && !showPerson ? null : (
          <AppText
            variant="rowTitle"
            weight="700"
            tabular
            color={repaid ? 'textTertiary' : 'textPrimary'}
          >
            {formatPaise(repaid ? loan.principalPaise : loan.outstandingPaise)}
          </AppText>
        )}
        {canRemind ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remind ${loan.person.name}`}
            accessibilityHint="Opens your apps to send a reminder message"
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            onPress={() => void shareReminder(loanReminder(loan))}
            style={({ pressed }) => [styles.remind, pressed && { opacity: 0.6 }]}
          >
            <AppText variant="secondary" weight="600" color="brandPrimary">
              Remind
            </AppText>
          </Pressable>
        ) : partial ? (
          <AppText variant="secondary" color="textSecondary" tabular>
            of {formatPaise(loan.principalPaise)}
          </AppText>
        ) : !showPerson && !repaid ? (
          <AppText variant="secondary" color="textSecondary">
            left
          </AppText>
        ) : null}
      </View>
    </Tappable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    minHeight: 72,
  },
  rail: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2 },
  badge: { position: 'absolute', right: -3, bottom: -3 },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  remind: { minHeight: MIN_TOUCH_TARGET / 2, justifyContent: 'center' },
});
