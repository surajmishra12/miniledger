/**
 * Server state for the ledger (architecture.md §9.2). Money changes are never optimistic:
 * caches are invalidated only after the server confirms.
 */
import {
  loanDetailDtoSchema,
  loanDtoSchema,
  loanListResponseSchema,
  loanMutationResponseSchema,
  peopleListResponseSchema,
  personDtoSchema,
  settleResponseSchema,
  summaryDtoSchema,
  type CreateLoanInput,
  type CreateRepaymentInput,
  type LoanSort,
  type PatchLoanInput,
  type PatchPersonInput,
  type PatchRepaymentInput,
} from '@miniledger/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { queryString } from '@/lib/query-string';

export type LoanFilters = {
  direction?: 'LENT' | 'BORROWED';
  status?: 'outstanding' | 'overdue' | 'repaid';
  search?: string;
  personId?: string;
  sort: LoanSort;
};

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => api('/summary', summaryDtoSchema),
  });
}

export function useLoanList(filters: LoanFilters, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.loans(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api(
        `/loans${queryString({ ...filters, limit: pageSize, cursor: pageParam })}`,
        loanListResponseSchema,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: queryKeys.loan(id),
    queryFn: () => api(`/loans/${id}`, loanDetailDtoSchema),
  });
}

export function usePeople(filters: { search?: string; archived?: boolean }) {
  return useQuery({
    queryKey: queryKeys.people(filters),
    queryFn: () =>
      api(
        `/people${queryString({ search: filters.search, archived: filters.archived ? 'true' : undefined })}`,
        peopleListResponseSchema,
      ),
  });
}

export function usePerson(id: string) {
  return useQuery({
    queryKey: queryKeys.person(id),
    queryFn: () => api(`/people/${id}`, personDtoSchema),
  });
}

// ---- Mutations (plain functions; screens wrap them in useMutation) ----

export const createLoan = (body: CreateLoanInput) =>
  api('/loans', loanDtoSchema, { method: 'POST', body });

export const updateLoan = (id: string, body: PatchLoanInput) =>
  api(`/loans/${id}`, loanDtoSchema, { method: 'PATCH', body });

export const deleteLoan = (id: string) => api(`/loans/${id}`, null, { method: 'DELETE' });

export const settleLoan = (id: string) =>
  api(`/loans/${id}/settle`, settleResponseSchema, { method: 'POST', body: {} });

export const createRepayment = (loanId: string, body: CreateRepaymentInput) =>
  api(`/loans/${loanId}/repayments`, loanMutationResponseSchema, { method: 'POST', body });

export const updateRepayment = (loanId: string, repaymentId: string, body: PatchRepaymentInput) =>
  api(`/loans/${loanId}/repayments/${repaymentId}`, loanMutationResponseSchema, {
    method: 'PATCH',
    body,
  });

export const deleteRepayment = (loanId: string, repaymentId: string) =>
  api(`/loans/${loanId}/repayments/${repaymentId}`, null, { method: 'DELETE' });

export const createPerson = (body: { id: string; name: string }) =>
  api('/people', personDtoSchema, { method: 'POST', body });

export const updatePerson = (id: string, body: PatchPersonInput) =>
  api(`/people/${id}`, personDtoSchema, { method: 'PATCH', body });

export const deletePerson = (id: string) => api(`/people/${id}`, null, { method: 'DELETE' });
