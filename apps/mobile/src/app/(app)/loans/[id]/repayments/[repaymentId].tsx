import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { LoanGate } from '@/features/ledger/LoanGate';
import { RepaymentForm } from '@/features/ledger/RepaymentForm';

/** S08 Edit repayment. */
export default function EditRepaymentScreen() {
  const { id, repaymentId } = useLocalSearchParams<{ id: string; repaymentId: string }>();
  return (
    <LoanGate id={id}>
      {(loan) => {
        const repayment = loan.repayments.find((r) => r.id === repaymentId);
        if (!repayment) {
          return (
            <Screen>
              <Header back />
              <EmptyState
                title="This item no longer exists."
                actionLabel="Go back"
                onAction={() => router.back()}
              />
            </Screen>
          );
        }
        return <RepaymentForm loan={loan} repayment={repayment} />;
      }}
    </LoanGate>
  );
}
