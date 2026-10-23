/**
 * S07 Loan details and history (design.md S07, S13).
 */
import { formatPaise, type RepaymentDto } from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCheck, ChevronRight, EllipsisVertical, Pencil, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { ActionSheet } from '@/components/ActionSheet';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SkeletonBlock } from '@/components/Skeleton';
import { useSnackbar } from '@/components/Snackbar';
import { Surface } from '@/components/Surface';
import { useSession } from '@/features/auth/session';
import { deleteLoan, deleteRepayment, settleLoan, useLoan } from '@/features/ledger/api';
import { LoanFinancials } from '@/features/ledger/LoanFinancials';
import { RECEIPT_COPY } from '@/features/receipts/capture';
import { useSavedReceipt } from '@/features/receipts/hooks';
import { ReceiptAttach } from '@/features/receipts/ReceiptAttach';
import { deleteLoanReceipts } from '@/features/receipts/storage';
import { ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';
import { formatDateLong } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { invalidateLedger, queryClient, queryKeys } from '@/lib/query-client';
import { loanReminder, shareReminder } from '@/lib/remind';
import { springLively } from '@/theme/motion';
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type Dialog =
  | { kind: 'menu' }
  | { kind: 'settle' }
  | { kind: 'delete' }
  | { kind: 'repaymentMenu'; repayment: RepaymentDto }
  | { kind: 'removeRepayment'; repayment: RepaymentDto }
  | null;

type TimelineEntry =
  | { kind: 'repayment'; repayment: RepaymentDto }
  | { kind: 'created'; date: string; amountPaise: number };

/** One step of the repayment timeline: dot and rail on the left, details on the right. */
function TimelineItem({
  entry,
  last,
  onMenu,
}: {
  entry: TimelineEntry;
  last: boolean;
  onMenu?: () => void;
}) {
  const { colors } = useTheme();
  const created = entry.kind === 'created';
  const amount = created ? entry.amountPaise : entry.repayment.amountPaise;
  const date = created ? entry.date : entry.repayment.paidOn;
  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            created
              ? { borderColor: colors.outlineStrong, backgroundColor: colors.surface }
              : { borderColor: colors.successText, backgroundColor: colors.successSurface },
          ]}
        />
        {last ? null : <View style={[styles.line, { backgroundColor: colors.outline }]} />}
      </View>
      <View style={[styles.flex, styles.stepBody]}>
        <AppText
          variant="rowTitle"
          weight="700"
          tabular
          color={created ? 'textSecondary' : 'textPrimary'}
        >
          {created ? `Loan created · ${formatPaise(amount)}` : formatPaise(amount)}
        </AppText>
        <AppText variant="secondary" color="textSecondary">
          {formatDateLong(date)}
        </AppText>
        {!created && entry.repayment.note ? (
          <AppText variant="secondary" color="textSecondary">
            {entry.repayment.note}
          </AppText>
        ) : null}
      </View>
      {onMenu ? (
        <IconButton
          icon={EllipsisVertical}
          label={`Options for repayment of ${formatPaise(amount)}`}
          onPress={onMenu}
          color="textSecondary"
        />
      ) : null}
    </View>
  );
}
/** Fully repaid. When it has just happened, the check springs in: a small ending worth feeling. */
function SettledBlock({ celebrate }: { celebrate: boolean }) {
  const { colors, reduceMotion } = useTheme();
  const pop = useSharedValue(celebrate && !reduceMotion ? 0 : 1);
  useEffect(() => {
    if (celebrate && !reduceMotion) pop.set(withDelay(120, withSpring(1, springLively)));
  }, [celebrate, reduceMotion, pop]);
  const checkStyle = useAnimatedStyle(() => ({
    opacity: pop.get(),
    transform: [{ scale: 0.4 + pop.get() * 0.6 }, { rotate: `${(1 - pop.get()) * -30}deg` }],
  }));
  return (
    <View
      accessible
      accessibilityRole="summary"
      style={[styles.settled, { backgroundColor: colors.successSurface }]}
    >
      <Animated.View style={[styles.settledCheck, { backgroundColor: colors.surface }, checkStyle]}>
        <CheckCheck size={20} color={colors.successText} strokeWidth={2.25} />
      </Animated.View>
      <View style={styles.flex}>
        <AppText variant="rowTitle" color="successText">
          All settled.
        </AppText>
        <AppText variant="secondary" color="successText">
          No balance remains on this loan.
        </AppText>
      </View>
    </View>
  );
}

export default function LoanDetailScreen() {
  const { id, receiptFailed } = useLocalSearchParams<{ id: string; receiptFailed?: string }>();
  const { colors } = useTheme();
  const { user } = useSession();
  const loan = useLoan(id);
  const receipt = useSavedReceipt(user?.id, id);
  const snackbar = useSnackbar();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);

  // Celebrate only the transition from open to settled while this screen is showing.
  const outstandingNow = loan.data?.outstandingPaise;
  const [lastOutstanding, setLastOutstanding] = useState(outstandingNow);
  const [celebrate, setCelebrate] = useState(false);
  if (outstandingNow !== lastOutstanding) {
    setLastOutstanding(outstandingNow);
    setCelebrate(outstandingNow === 0 && (lastOutstanding ?? 0) > 0);
  }

  // A loan that no longer exists takes its device-only receipt with it (§8).
  const missing = loan.error instanceof ApiError && loan.error.code === 'NOT_FOUND';
  useEffect(() => {
    if (missing && user) deleteLoanReceipts(user.id, id);
  }, [missing, user, id]);

  const settle = useMutation({ mutationFn: () => settleLoan(id) });
  const remove = useMutation({ mutationFn: () => deleteLoan(id) });
  const removeRepayment = useMutation({
    mutationFn: (repaymentId: string) => deleteRepayment(id, repaymentId),
  });

  if (loan.isPending) {
    return (
      <Screen>
        <Header back />
        <SkeletonBlock height={40} width="60%" />
        <SkeletonBlock height={236} />
        <SkeletonBlock height={26} width="40%" />
        <SkeletonBlock height={72} />
      </Screen>
    );
  }
  if (loan.isError) {
    return (
      <Screen>
        <Header back />
        {missing ? (
          <EmptyState
            title="This item no longer exists."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        ) : (
          <InlineNotice
            tone="offline"
            message={errorCopy(loan.error)}
            actionLabel="Retry"
            onAction={() => void loan.refetch()}
          />
        )}
      </Screen>
    );
  }

  const data = loan.data;
  const lent = data.direction === 'LENT';
  const outstanding = data.outstandingPaise > 0;

  /** Runs a confirmed action; failures stay on screen as a persistent notice. */
  const run = async (action: () => Promise<unknown>, success: string) => {
    setError(null);
    try {
      await action();
      setDialog(null);
      haptics.success();
      await invalidateLedger(data.id, data.person.id);
      snackbar(success);
    } catch (e) {
      setDialog(null);
      setError(errorCopy(e));
      if (e instanceof ApiError && e.code === 'NOT_FOUND') void loan.refetch();
    }
  };

  const doDelete = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
      setDialog(null);
      if (user) deleteLoanReceipts(user.id, data.id);
      queryClient.removeQueries({ queryKey: queryKeys.loan(data.id) });
      await invalidateLedger(undefined, data.person.id);
      router.back();
      snackbar('Loan deleted');
    } catch (e) {
      setDialog(null);
      setError(errorCopy(e));
    }
  };

  return (
    <Screen
      scroll
      onRefresh={() => void loan.refetch()}
      refreshing={loan.isRefetching}
      footer={
        outstanding ? (
          <View style={styles.actions}>
            <Button
              label="Record repayment"
              onPress={() => router.push(`/loans/${data.id}/repayments/new`)}
            />
            <Button
              variant="secondary"
              label="Mark as repaid"
              onPress={() => setDialog({ kind: 'settle' })}
            />
          </View>
        ) : (
          <SettledBlock celebrate={celebrate} />
        )
      }
    >
      <Header
        back
        right={
          <IconButton
            icon={EllipsisVertical}
            label="More options"
            onPress={() => setDialog({ kind: 'menu' })}
          />
        }
      />
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Opens this person's loans"
        onPress={() => router.push(`/people/${data.person.id}`)}
        style={({ pressed }) => [styles.person, pressed && { opacity: 0.7 }]}
      >
        <AppText variant="title" accessibilityRole="header" numberOfLines={2} style={styles.flex}>
          {data.person.name}
        </AppText>
        <ChevronRight size={24} color={colors.textSecondary} strokeWidth={1.75} />
      </Pressable>

      <LoanFinancials
        loan={data}
        onRemind={lent && outstanding ? () => void shareReminder(loanReminder(data)) : undefined}
      />

      {receiptFailed === '1' && !receipt.uri ? (
        <InlineNotice tone="danger" message={RECEIPT_COPY.saveFailed} />
      ) : null}
      {error ? <InlineNotice tone="danger" message={error} /> : null}

      {data.note ? (
        <View style={styles.section}>
          <AppText variant="secondary" color="textSecondary">
            Note
          </AppText>
          <AppText>{data.note}</AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="section" accessibilityRole="header">
          Repayment history
        </AppText>
        <Surface>
          <View style={styles.timeline}>
            {data.repayments.length === 0 ? (
              <AppText color="textSecondary" style={styles.noRepayments}>
                No repayments recorded yet.
              </AppText>
            ) : null}
            {data.repayments.map((repayment) => (
              <TimelineItem
                key={repayment.id}
                entry={{ kind: 'repayment', repayment }}
                last={false}
                onMenu={() => setDialog({ kind: 'repaymentMenu', repayment })}
              />
            ))}
            <TimelineItem
              entry={{ kind: 'created', date: data.loanDate, amountPaise: data.principalPaise }}
              last
            />
          </View>
        </Surface>
      </View>

      <ReceiptAttach
        uri={receipt.uri}
        version={receipt.version}
        onPicked={(file) => {
          receipt.attach(file);
          snackbar('Receipt saved on this device');
        }}
        onRemove={() => {
          receipt.remove();
          snackbar('Receipt removed');
        }}
        onOpen={() => router.push(`/loans/${data.id}/receipt`)}
      />

      <ActionSheet
        visible={dialog?.kind === 'menu'}
        title="Loan"
        onClose={() => setDialog((d) => (d?.kind === 'menu' ? null : d))}
        actions={[
          {
            label: 'Edit loan',
            icon: Pencil,
            onPress: () => router.push(`/loans/${data.id}/edit`),
          },
          {
            label: 'Delete loan',
            icon: Trash2,
            destructive: true,
            onPress: () => setDialog({ kind: 'delete' }),
          },
        ]}
      />
      <ActionSheet
        visible={dialog?.kind === 'repaymentMenu'}
        title="Repayment"
        onClose={() => setDialog((d) => (d?.kind === 'repaymentMenu' ? null : d))}
        actions={
          dialog?.kind === 'repaymentMenu'
            ? [
                {
                  label: 'Edit',
                  icon: Pencil,
                  onPress: () => router.push(`/loans/${data.id}/repayments/${dialog.repayment.id}`),
                },
                {
                  label: 'Remove',
                  icon: Trash2,
                  destructive: true,
                  onPress: () =>
                    setDialog({ kind: 'removeRepayment', repayment: dialog.repayment }),
                },
              ]
            : []
        }
      />

      <ConfirmDialog
        visible={dialog?.kind === 'settle'}
        title={`Record ${formatPaise(data.outstandingPaise)} as ${lent ? 'received' : 'paid back'}?`}
        body={
          lent
            ? `This records that ${data.person.name} paid you the remaining balance today.`
            : `This records that you paid ${data.person.name} the remaining balance today.`
        }
        confirmLabel="Mark as repaid"
        loading={settle.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => void run(() => settle.mutateAsync(), 'Marked as repaid')}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'delete'}
        title="Delete this loan?"
        body="This will remove its repayment history and update your totals."
        confirmLabel="Delete loan"
        destructive
        loading={remove.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => void doDelete()}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'removeRepayment'}
        title="Remove this repayment?"
        body="The remaining balance will increase."
        confirmLabel="Remove"
        destructive
        loading={removeRepayment.isPending}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== 'removeRepayment') return;
          const repaymentId = dialog.repayment.id;
          void run(() => removeRepayment.mutateAsync(repaymentId), 'Repayment removed');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.s2, minHeight: 48 },
  section: { gap: space.s3 },
  actions: { gap: space.s3 },
  noRepayments: { paddingBottom: space.s4 },
  settledCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  timeline: { paddingTop: space.s4, paddingBottom: space.s2, paddingLeft: space.s4 },
  step: { flexDirection: 'row', gap: space.s3, paddingRight: space.s1 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 5 },
  line: { width: 2, flex: 1, marginTop: 4, marginBottom: -1, borderRadius: 1 },
  stepBody: { paddingBottom: space.s4, gap: 2 },
});
