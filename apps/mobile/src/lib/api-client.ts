/**
 * The only way the app talks to the API (architecture.md §9.2).
 * - Adds the bearer token and a request ID.
 * - Refreshes the session once (single-flight) on UNAUTHENTICATED and retries the same request.
 * - Times out after 75 s; reports "slow" after 3 s.
 * - Validates every response with the shared Zod schema.
 */
import { tokenPairDtoSchema, type ErrorCode } from '@miniledger/shared';
import { randomUUID } from 'expo-crypto';
import type { z } from 'zod';

import { API_URL } from './config';
import { markSlow } from './connectivity';
import { clearSession, saveSession, type StoredSession } from './session-store';

const TIMEOUT_MS = 75_000;
const SLOW_MS = 3_000;
const REFRESH_EARLY_MS = 30_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'UNKNOWN',
    message: string,
    readonly fieldErrors: Record<string, string> = {},
    readonly details: Record<string, unknown> = {},
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** No response at all: offline, DNS failure or timeout. The outcome of a mutation is unknown. */
export class NetworkError extends Error {
  constructor(readonly kind: 'offline' | 'timeout') {
    super(kind === 'timeout' ? 'The request timed out.' : 'Network unavailable.');
    this.name = 'NetworkError';
  }
}

let session: StoredSession | null = null;
let refreshInFlight: Promise<string> | null = null;
let onSessionEnded: (() => void) | null = null;

export function setApiSession(next: StoredSession | null) {
  session = next;
}

export function setSessionEndedHandler(handler: (() => void) | null) {
  onSessionEnded = handler;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Public endpoints (sign-in) skip the bearer token. */
  auth?: boolean;
};

async function send(path: string, options: RequestOptions, token?: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let finishSlow: (() => void) | null = null;
  const slowTimer = setTimeout(() => {
    finishSlow = markSlow();
  }, SLOW_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': randomUUID(),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError(controller.signal.aborted ? 'timeout' : 'offline');
  } finally {
    clearTimeout(timeout);
    clearTimeout(slowTimer);
    (finishSlow as (() => void) | null)?.();
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get('retry-after'));
  try {
    const body = (await response.json()) as {
      error?: {
        code?: ErrorCode;
        message?: string;
        fieldErrors?: Record<string, string>;
        details?: Record<string, unknown>;
      };
    };
    const error = body.error ?? {};
    return new ApiError(
      response.status,
      error.code ?? 'UNKNOWN',
      error.message ?? 'Request failed',
      error.fieldErrors ?? {},
      error.details ?? {},
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  } catch {
    return new ApiError(response.status, 'UNKNOWN', `Request failed (${response.status})`);
  }
}

async function endSession() {
  session = null;
  await clearSession();
  onSessionEnded?.();
}

/** One refresh at a time; concurrent callers share the same promise. */
async function refreshAccessToken(): Promise<string> {
  if (!session) throw new ApiError(401, 'REFRESH_TOKEN_INVALID', 'Not signed in');
  if (!refreshInFlight) {
    const current = session;
    refreshInFlight = (async () => {
      const response = await send('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: current.refreshToken },
        auth: false,
      });
      if (!response.ok) {
        const error = await toApiError(response);
        if (error.code === 'REFRESH_TOKEN_INVALID') await endSession();
        throw error;
      }
      const pair = tokenPairDtoSchema.parse(await response.json());
      session = { userId: current.userId, ...pair };
      await saveSession(session);
      return pair.accessToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function currentAccessToken(): Promise<string> {
  if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Not signed in');
  const expiresAt = new Date(session.accessTokenExpiresAt).getTime();
  if (expiresAt - Date.now() < REFRESH_EARLY_MS) return refreshAccessToken();
  return session.accessToken;
}

/** Calls the API and validates the JSON response with `schema` (or returns undefined for 204). */
export async function api<S extends z.ZodType>(
  path: string,
  schema: S | null,
  options: RequestOptions = {},
): Promise<z.output<S>> {
  const useAuth = options.auth !== false;
  let response = await send(path, options, useAuth ? await currentAccessToken() : undefined);

  if (response.status === 401 && useAuth) {
    const error = await toApiError(response);
    if (error.code !== 'UNAUTHENTICATED') throw error;
    // Same request (and same client ID) after one refresh (architecture.md §9.2).
    response = await send(path, options, await refreshAccessToken());
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204 || schema === null) return undefined as z.output<S>;
  return schema.parse(await response.json());
}

/** Signs out locally even if the server call fails (offline). */
export async function logoutRequest(): Promise<void> {
  try {
    if (session) await api('/auth/logout', null, { method: 'POST' });
  } catch {
    // Local sign-out always proceeds.
  }
}
