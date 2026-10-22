/**
 * Safe conversion of database integers (bigint, numeric) to JSON numbers (architecture.md §4.4).
 */
import { AppError } from './errors';

export function toSafeInteger(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const text = typeof value === 'bigint' ? value.toString() : String(value);
  if (!/^-?\d+$/.test(text)) {
    throw new AppError('INTERNAL_ERROR', `Expected an integer, received ${text}`);
  }
  const result = Number(text);
  if (!Number.isSafeInteger(result)) {
    throw new AppError('INTERNAL_ERROR', 'Integer exceeds the safe range');
  }
  return result;
}
