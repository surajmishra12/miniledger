import { useLocalSearchParams } from 'expo-router';

import { useSession } from '@/features/auth/session';
import { LoanForm } from '@/features/ledger/LoanForm';
import { usePendingReceipt } from '@/features/receipts/hooks';
import { ReceiptAttach } from '@/features/receipts/ReceiptAttach';
import { commitPendingReceipt } from '@/features/receipts/storage';

/** A receipt picked before the loan exists lives in the cache until the create succeeds (§8). */
function PendingReceiptField({ loanId }: { loanId: string }) {
  const receipt = usePendingReceipt(loanId);
  return (
    <ReceiptAttach
      uri={receipt.uri}
      version={receipt.version}
      onPicked={receipt.attach}
      onRemove={receipt.remove}
    />
  );
}

/** S06 Add loan; `?personId=&personName=` prefill from Person detail. */
export default function NewLoanScreen() {
  const { user } = useSession();
  const { personId, personName } = useLocalSearchParams<{
    personId?: string;
    personName?: string;
  }>();
  const initialPerson =
    personId && personName ? { kind: 'existing' as const, id: personId, name: personName } : null;
  return (
    <LoanForm
      mode="create"
      initialPerson={initialPerson}
      receiptSlot={(loanId) => <PendingReceiptField loanId={loanId} />}
      onCreated={async (loan) => ({
        // The loan is saved either way; a failed move only shows a notice on S07.
        receiptFailed: user ? !commitPendingReceipt(user.id, loan.id) : false,
      })}
    />
  );
}
