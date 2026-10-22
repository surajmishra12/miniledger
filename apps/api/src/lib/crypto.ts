/**
 * Keyed hashing and random secrets (architecture.md §7.2–7.3).
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA-256 as lowercase hex. */
export function hmacHex(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function digestsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Six-digit OTP from a CSPRNG. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** 256-bit opaque bearer secret, base64url (43 chars). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}
