import { useLocalSearchParams } from 'expo-router';

import { LoanForm } from '@/features/ledger/LoanForm';
import { LoanGate } from '@/features/ledger/LoanGate';

/** S06 Edit loan. */
export default function EditLoanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <LoanGate id={id}>
      {(loan) => (
        <LoanForm mode="edit" loan={{ ...loan, repaymentCount: loan.repayments.length }} />
      )}
    </LoanGate>
  );
}
