/**
 * Session lifecycle (design.md S01, architecture.md §7.3):
 * restore from secure storage → refresh if needed → load /me; network errors never sign out.
 */
import { userDtoSchema, type UserDto, type VerifyResponse } from '@miniledger/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  api,
  ApiError,
  logoutRequest,
  setApiSession,
  setSessionEndedHandler,
} from '@/lib/api-client';
import { deviceTimeZone } from '@/lib/format';
import { queryClient, queryKeys } from '@/lib/query-client';
import { clearSession, loadSession, saveSession } from '@/lib/session-store';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn' | 'offline';

type SessionValue = {
  status: SessionStatus;
  user: UserDto | null;
  signIn: (response: VerifyResponse) => Promise<void>;
  signOut: () => Promise<void>;
  /** Clears everything after server-side account deletion. */
  forgetAccount: () => Promise<void>;
  retry: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

/** Keeps the account timezone in step with the device (architecture.md §4.5). */
function syncTimezone(user: UserDto) {
  const timezone = deviceTimeZone();
  if (timezone && timezone !== user.timezone) {
    void api('/me', userDtoSchema, { method: 'PATCH', body: { timezone } })
      .then((updated) => queryClient.setQueryData(queryKeys.me, updated))
      .catch(() => undefined);
  }
}

async function restore(): Promise<{ status: SessionStatus; user: UserDto | null }> {
  const stored = await loadSession();
  if (!stored) return { status: 'signedOut', user: null };
  setApiSession(stored);
  try {
    const user = await api('/me', userDtoSchema);
    queryClient.setQueryData(queryKeys.me, user);
    syncTimezone(user);
    return { status: 'signedIn', user };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'REFRESH_TOKEN_INVALID' || error.code === 'UNAUTHENTICATED')
    ) {
      setApiSession(null);
      await clearSession();
      return { status: 'signedOut', user: null };
    }
    // Offline or server unreachable: keep credentials and offer Retry.
    return { status: 'offline', user: null };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: SessionStatus; user: UserDto | null }>({
    status: 'loading',
    user: null,
  });

  useEffect(() => {
    let active = true;
    setSessionEndedHandler(() => {
      queryClient.clear();
      setState({ status: 'signedOut', user: null });
    });
    void restore().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
      setSessionEndedHandler(null);
    };
  }, []);

  const retry = useCallback(() => {
    setState({ status: 'loading', user: null });
    void restore().then(setState);
  }, []);

  const signIn = useCallback(async (response: VerifyResponse) => {
    const stored = { userId: response.user.id, ...response.tokens };
    await saveSession(stored);
    setApiSession(stored);
    queryClient.clear();
    queryClient.setQueryData(queryKeys.me, response.user);
    syncTimezone(response.user);
    setState({ status: 'signedIn', user: response.user });
  }, []);

  const forgetAccount = useCallback(async () => {
    setApiSession(null);
    await clearSession();
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }, []);

  const signOut = useCallback(async () => {
    await logoutRequest();
    await forgetAccount();
  }, [forgetAccount]);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, forgetAccount, retry }),
    [state, signIn, signOut, forgetAccount, retry],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
