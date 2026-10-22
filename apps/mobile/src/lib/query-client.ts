import { QueryClient } from '@tanstack/react-query';

import { ApiError, NetworkError } from './api-client';

/** Queries retry twice on network/5xx only; mutations never auto-retry (architecture.md §9.2). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        failureCount < 2 &&
        (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)),
    },
    mutations: { retry: false },
  },
});

/** Query keys (architecture.md §9.2). */
export const queryKeys = {
  authConfig: ['authConfig'] as const,
  me: ['me'] as const,
  summary: ['summary'] as const,
  loans: (filters: object) => ['loans', filters] as const,
  loan: (id: string) => ['loan', id] as const,
  people: (filters: object) => ['people', filters] as const,
  person: (id: string) => ['person', id] as const,
};

/** After any confirmed money change: everything that shows balances. */
export async function invalidateLedger(loanId?: string, personId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.summary }),
    queryClient.invalidateQueries({ queryKey: ['loans'] }),
    queryClient.invalidateQueries({ queryKey: ['people'] }),
    loanId ? queryClient.invalidateQueries({ queryKey: queryKeys.loan(loanId) }) : null,
    personId ? queryClient.invalidateQueries({ queryKey: queryKeys.person(personId) }) : null,
  ]);
}
