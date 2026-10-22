/**
 * Sign-in identifier normalization (architecture.md §7.2).
 */

const INDIAN_MOBILE = /^(?:\+?91)?([6-9]\d{9})$/;
const EMAIL_MAX = 254;
// Pragmatic address check; delivery is the real verification.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const IDENTIFIER_MESSAGES = {
  phone: 'Enter a 10-digit mobile number',
  email: 'Enter a valid email address',
} as const;

/** "+91 98765-43210" → "+919876543210"; returns null when not a valid Indian mobile number. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  const match = INDIAN_MOBILE.exec(compact);
  return match ? `+91${match[1]}` : null;
}

/** Trims and lower-cases; returns null when the address is not plausible. */
export function normalizeEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.length === 0 || value.length > EMAIL_MAX) return null;
  return EMAIL_PATTERN.test(value) ? value : null;
}

/** "+919876543210" → "+91 ••••••3210" */
export function maskPhone(phone: string): string {
  return `+91 ••••••${phone.slice(-4)}`;
}

/** "suraj@example.com" → "s•••@example.com" */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}•••@${domain}`;
}
