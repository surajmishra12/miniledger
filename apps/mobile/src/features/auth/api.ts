import { authConfigDtoSchema, challengeDtoSchema, verifyResponseSchema } from '@miniledger/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';

/** S02 chooses phone vs email from the server (design.md S02). */
export function useAuthConfig() {
  return useQuery({
    queryKey: queryKeys.authConfig,
    queryFn: () => api('/auth/config', authConfigDtoSchema, { auth: false }),
    staleTime: Infinity,
  });
}

export const requestOtp = (identifier: string) =>
  api('/auth/otp/request', challengeDtoSchema, {
    method: 'POST',
    body: { identifier },
    auth: false,
  });

export const verifyOtp = (body: { challengeId: string; code: string; timezone?: string }) =>
  api('/auth/otp/verify', verifyResponseSchema, { method: 'POST', body, auth: false });

export const requestDeletionCode = () =>
  api('/auth/reauth/request', challengeDtoSchema, { method: 'POST', body: {} });

export const deleteAccount = (body: { challengeId: string; code: string }) =>
  api('/me', null, { method: 'DELETE', body });
