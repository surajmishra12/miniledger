import { router } from 'expo-router';

export type LoansFilter = {
  direction?: 'LENT' | 'BORROWED';
  status?: 'outstanding' | 'overdue' | 'repaid';
};

/**
 * Switches to the Loans tab with filters applied (design.md §5.1 cross-tab links).
 * `f` is a nonce so tapping the same tile twice re-applies the filter.
 */
export function openLoans(filter: LoansFilter = {}) {
  router.navigate({
    pathname: '/loans',
    params: {
      direction: filter.direction ?? 'ALL',
      status: filter.status ?? 'all',
      f: String(Date.now()),
    },
  });
}
