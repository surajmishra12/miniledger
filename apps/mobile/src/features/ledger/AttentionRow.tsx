/**
 * Home "Needs attention" row (design.md S04 v2): avatar with a tiny direction badge, the name,
 * one status line, and a neutral amount. Overdue money you lent offers an inline Remind.
 */
import { formatPaise, type LoanDto } from '@miniledger/shared';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Tappable } from '@/components/Tappable';
import { dueStatus, formatDateShort } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { pressScale } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { MIN_TOUCH_TARGET, space, type ColorTokens } from '@/theme/tokens';

const TONE_TEXT: Record<ReturnType<typeof dueStatus>['tone'], keyof ColorTokens> = {
  danger: 'dangerText',
  warning: 'warningText',
  success: 'textSecondary',
  neutral: 'textSecondary',
};

/** A polite, specific reminder the user sends from their own messaging app. */
export function reminderMessage(loan: LoanDto): string {
  const first = loan.person.name.trim().split(/\s+/)[0] ?? loan.person.name;
  const amount = formatPaise(loan.outstandingPaise);
  const due = formatDateShort(loan.dueDate, loan.asOfDate);
  return `Hi ${first}, a gentle reminder about the ${amount} I lent you (due ${due}). Could you send it when you get a chance? Thanks!`;
}

function DirectionBadge({ lent }: { lent: boolean }) {
  const { colors } = useTheme();
  const Icon = lent ? ArrowUpRight : ArrowDownLeft;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors[lent ? 'lentSurface' : 'borrowedSurface'],
          borderColor: colors.surface,
        },
      ]}
    >
      <Icon size={10} color={colors[lent ? 'lentText' : 'borrowedText']} strokeWidth={3} />
    </View>
  );
}

export const AttentionRow = memo(function AttentionRow({
  loan,
  onPress,
}: {
  loan: LoanDto;
  onPress: (loan: LoanDto) => void;
}) {
  const { colors } = useTheme();
  const lent = loan.direction === 'LENT';
  const status = dueStatus(loan);
  const partial = loan.repaymentStatus === 'PARTIAL';
  const canRemind = lent && loan.isOverdue;
  const statusLine = lent ? status.label : `You owe · ${status.label.toLowerCase()}`;
  const rail =
    status.tone === 'danger'
      ? colors.dangerText
      : status.tone === 'warning'
        ? colors.warningText
        : null;

  const remind = async () => {
    haptics.selection();
    try {
      await Share.share({ message: reminderMessage(loan) });
    } catch {
      // The share sheet was dismissed or unavailable; nothing to undo.
    }
  };

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={[
        loan.person.name,
        lent ? 'owes you' : 'you owe',
        formatPaise(loan.outstandingPaise),
        status.label,
      ].join(', ')}
      onPress={() => onPress(loan)}
      ripple
      scaleTo={pressScale.row}
      style={styles.row}
    >
      {rail ? <View style={[styles.rail, { backgroundColor: rail }]} /> : null}
      <View>
        <Avatar name={loan.person.name} />
        <DirectionBadge lent={lent} />
      </View>
      <View style={styles.middle}>
        <AppText variant="rowTitle" numberOfLines={1}>
          {loan.person.name}
        </AppText>
        <AppText variant="secondary" color={TONE_TEXT[status.tone]} numberOfLines={1}>
          {statusLine}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="rowTitle" weight="700" tabular>
          {formatPaise(loan.outstandingPaise)}
        </AppText>
        {canRemind ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remind ${loan.person.name}`}
            accessibilityHint="Opens your apps to send a reminder message"
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            onPress={() => void remind()}
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
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  remind: { minHeight: MIN_TOUCH_TARGET / 2, justifyContent: 'center' },
});
