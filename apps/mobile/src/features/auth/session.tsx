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
  /** Clears local credentials and caches; the notice is shown on Sign-in (e.g. after deletion). */
  forgetAccount: (notice?: string) => Promise<void>;
  /** Replaces the signed-in user after a profile change. */
  updateUser: (user: UserDto) => void;
  /** One-time message for the Sign-in screen. */
  notice: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    setState({ status: 'signedIn', user: response.user });
  }, []);

  const forgetAccount = useCallback(async (message?: string) => {
    setApiSession(null);
    await clearSession();
    queryClient.clear();
    setNotice(message ?? null);
    setState({ status: 'signedOut', user: null });
  }, []);

  const updateUser = useCallback((user: UserDto) => {
    queryClient.setQueryData(queryKeys.me, user);
    setState((current) => (current.status === 'signedIn' ? { ...current, user } : current));
  }, []);

  const signOut = useCallback(async () => {
    await logoutRequest();
    await forgetAccount();
  }, [forgetAccount]);

  const value = useMemo(
    () => ({ ...state, notice, signIn, signOut, forgetAccount, updateUser, retry }),
    [state, notice, signIn, signOut, forgetAccount, updateUser, retry],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
