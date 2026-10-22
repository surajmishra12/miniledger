/**
 * Structured, redacted logging (architecture.md §10.1).
 * Request bodies, tokens, OTP codes and identifiers in log objects never reach the output.
 */
import { pino, type Logger } from 'pino';

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body',
  '*.refreshToken',
  '*.accessToken',
  '*.code',
  '*.identifier',
];

/** `pretty` gives readable local logs (development only); production logs stay JSON. */
export function createLogger(level: string, options: { pretty?: boolean } = {}): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(options.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });
}

export type { Logger };
