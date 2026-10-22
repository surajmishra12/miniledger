import type { LoanDetailDto } from '@miniledger/shared';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { InlineNotice } from '@/components/InlineNotice';
import { Screen } from '@/components/Screen';
import { SkeletonBlock } from '@/components/Skeleton';
import { ApiError } from '@/lib/api-client';
import { errorCopy } from '@/lib/error-copy';

import { useLoan } from './api';

/**
 * Freezes the first loaded value: a background refetch must not reset a form mid-edit.
 * Conflicts are caught by the server (`version`, `AMOUNT_EXCEEDS_OUTSTANDING`).
 */
function Snapshot({
  value,
  children,
}: {
  value: LoanDetailDto;
  children: (loan: LoanDetailDto) => ReactNode;
}) {
  const [snapshot] = useState(value);
  return children(snapshot);
}

/** Loads a loan for a pushed form; shows loading, missing and error states (design.md §9). */
export function LoanGate({
  id,
  children,
}: {
  id: string;
  children: (loan: LoanDetailDto) => ReactNode;
}) {
  const loan = useLoan(id);
  if (loan.isSuccess) return <Snapshot value={loan.data}>{children}</Snapshot>;
  const missing = loan.error instanceof ApiError && loan.error.code === 'NOT_FOUND';
  return (
    <Screen>
      <Header back />
      {loan.isPending ? (
        <SkeletonBlock height={260} />
      ) : missing ? (
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
