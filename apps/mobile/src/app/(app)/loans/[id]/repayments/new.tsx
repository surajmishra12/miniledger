import { useLocalSearchParams } from 'expo-router';

import { LoanGate } from '@/features/ledger/LoanGate';
import { RepaymentForm } from '@/features/ledger/RepaymentForm';

/** S08 Record repayment. */
export default function NewRepaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LoanGate id={id}>{(loan) => <RepaymentForm loan={loan} />}</LoanGate>;
}
