/**
 * S07 Loan details and history (design.md S07).
 */
import { formatPaise, type RepaymentDto } from '@miniledger/shared';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SkeletonBlock } from '@/components/Skeleton';
import { useSnackbar } from '@/components/Snackbar';
import { Divider, Surface } from '@/components/Surface';
import { settleLoan, useLoan } from '@/features/ledger/api';
import { LoanFinancials } from '@/features/ledger/LoanFinancials';
import { ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';
import { formatDateLong } from '@/lib/format';
import { invalidateLedger } from '@/lib/query-client';
import { space } from '@/theme/tokens';

function RepaymentRow({ repayment }: { repayment: RepaymentDto }) {
  return (
    <View style={styles.repayment}>
      <View style={styles.flex}>
        <AppText variant="rowTitle">{formatDateLong(repayment.paidOn)}</AppText>
        {repayment.note ? (
          <AppText variant="secondary" color="textSecondary">
            {repayment.note}
          </AppText>
        ) : null}
      </View>
      <AppText variant="rowTitle" tabular>
        {formatPaise(repayment.amountPaise)}
      </AppText>
    </View>
  );
}

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loan = useLoan(id);
  const snackbar = useSnackbar();
  const [confirmSettle, setConfirmSettle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = useMutation({ mutationFn: () => settleLoan(id) });

  if (loan.isPending) {
    return (
      <Screen>
        <Header back />
        <SkeletonBlock height={260} />
      </Screen>
    );
  }
  if (loan.isError) {
    const missing = loan.error instanceof ApiError && loan.error.code === 'NOT_FOUND';
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

  const doSettle = async () => {
    setError(null);
    try {
      await settle.mutateAsync();
      setConfirmSettle(false);
      await invalidateLedger(data.id, data.person.id);
      snackbar('Marked as repaid');
    } catch (e) {
      setConfirmSettle(false);
      setError(errorCopy(e));
    }
  };

  return (
    <Screen
      scroll
      footer={
        outstanding ? (
          <View style={styles.actions}>
            <Button label="Mark as repaid" onPress={() => setConfirmSettle(true)} />
          </View>
        ) : undefined
      }
    >
      <Header back title={data.person.name} />
      <LoanFinancials loan={data} />

      {error ? (
        <InlineNotice
          tone="danger"
          message={error}
          actionLabel="Try again"
          onAction={() => void doSettle()}
        />
      ) : null}

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
          Repayments
        </AppText>
        {data.repayments.length === 0 ? (
          <AppText color="textSecondary">No repayments recorded yet.</AppText>
        ) : (
          <Surface>
            {data.repayments.map((repayment, index) => (
              <View key={repayment.id}>
                {index > 0 ? <Divider /> : null}
                <RepaymentRow repayment={repayment} />
              </View>
            ))}
          </Surface>
        )}
        {!outstanding ? (
          <AppText color="successText">All settled. No balance remains on this loan.</AppText>
        ) : null}
      </View>

      <AppText variant="secondary" color="textSecondary">
        Loan date {formatDateLong(data.loanDate)}
      </AppText>

      <ConfirmDialog
        visible={confirmSettle}
        title={`Record ${formatPaise(data.outstandingPaise)} as ${lent ? 'received' : 'paid back'}?`}
        body={
          lent
            ? `This records that ${data.person.name} paid you the remaining balance today.`
            : `This records that you paid ${data.person.name} the remaining balance today.`
        }
        confirmLabel="Mark as repaid"
        loading={settle.isPending}
        onCancel={() => setConfirmSettle(false)}
        onConfirm={() => void doSettle()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.s3 },
  actions: { gap: space.s3 },
  repayment: { flexDirection: 'row', alignItems: 'center', gap: space.s3, padding: space.s4 },
});
