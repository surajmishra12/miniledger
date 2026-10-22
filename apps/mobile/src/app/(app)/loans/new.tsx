import { useLocalSearchParams } from 'expo-router';

import { LoanForm } from '@/features/ledger/LoanForm';

/** S06 Add loan; `?personId=&personName=` prefill from Person detail. */
export default function NewLoanScreen() {
  const { personId, personName } = useLocalSearchParams<{
    personId?: string;
    personName?: string;
  }>();
  const initialPerson =
    personId && personName ? { kind: 'existing' as const, id: personId, name: personName } : null;
  return <LoanForm mode="create" initialPerson={initialPerson} />;
}
