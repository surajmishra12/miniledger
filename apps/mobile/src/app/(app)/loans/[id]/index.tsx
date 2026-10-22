/**
 * S07 Loan details and history (design.md S07, S13).
 */
import { formatPaise, type RepaymentDto } from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCheck, ChevronRight, EllipsisVertical, Pencil, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
import { Divider, Surface } from '@/components/Surface';
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
import { useTheme } from '@/theme/theme-provider';
import { radius, space } from '@/theme/tokens';

type Dialog =
  | { kind: 'menu' }
  | { kind: 'settle' }
  | { kind: 'delete' }
  | { kind: 'repaymentMenu'; repayment: RepaymentDto }
  | { kind: 'removeRepayment'; repayment: RepaymentDto }
  | null;

function RepaymentRow({ repayment, onMenu }: { repayment: RepaymentDto; onMenu: () => void }) {
  return (
    <View style={styles.repayment}>
      <View style={styles.flex}>
        <AppText variant="rowTitle" weight="700" tabular>
          {formatPaise(repayment.amountPaise)}
        </AppText>
        <AppText variant="secondary" color="textSecondary">
          {formatDateLong(repayment.paidOn)}
        </AppText>
        {repayment.note ? (
          <AppText variant="secondary" color="textSecondary">
            {repayment.note}
          </AppText>
        ) : null}
      </View>
      <IconButton
        icon={EllipsisVertical}
        label={`Options for repayment of ${formatPaise(repayment.amountPaise)}`}
        onPress={onMenu}
        color="textSecondary"
      />
    </View>
  );
}

/** Fully repaid: a calm success state instead of enabled actions (design.md S07, §9.2). */
function SettledBlock() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="summary"
      style={[styles.settled, { backgroundColor: colors.successSurface }]}
    >
      <CheckCheck size={22} color={colors.successText} strokeWidth={1.75} />
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
          <SettledBlock />
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

      <LoanFinancials loan={data} />

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
        {data.repayments.length === 0 ? (
          <AppText color="textSecondary">No repayments recorded yet.</AppText>
        ) : (
          <Surface>
            {data.repayments.map((repayment, index) => (
              <View key={repayment.id}>
                {index > 0 ? <Divider /> : null}
                <RepaymentRow
                  repayment={repayment}
                  onMenu={() => setDialog({ kind: 'repaymentMenu', repayment })}
                />
              </View>
            ))}
          </Surface>
        )}
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

      <AppText variant="secondary" color="textSecondary">
        Loan date {formatDateLong(data.loanDate)}
      </AppText>

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
  settled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  repayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s3,
    paddingLeft: space.s4,
    paddingRight: space.s1,
  },
});
