/**
 * Money helpers (architecture.md §4.4).
 * All amounts are integer paise. Rupee strings are parsed with integer arithmetic only.
 */

/** ₹1,00,00,000.00 (1 crore) — the V1 maximum for a principal or a repayment. */
export const MAX_PAISE = 1_000_000_000;

const MAX_INPUT_LENGTH = 16;
const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;
const TOO_MANY_DECIMALS = /^\d+\.\d{3,}$/;

export const MONEY_MESSAGES = {
  required: 'Enter an amount',
  invalid: 'Enter a valid amount, for example 5000 or 5000.50',
  decimals: 'Use at most two decimal places',
  zero: 'Enter an amount greater than ₹0',
  tooLarge: 'Maximum amount is ₹1,00,00,000',
} as const;

export type ParseMoneyResult = { ok: true; paise: number } | { ok: false; error: string };

/** Parses a decimal rupee string (e.g. "5000.50") into integer paise (500050). */
export function parseRupeesToPaise(input: unknown): ParseMoneyResult {
  if (typeof input !== 'string') return { ok: false, error: MONEY_MESSAGES.invalid };
  if (input.length > MAX_INPUT_LENGTH) return { ok: false, error: MONEY_MESSAGES.tooLarge };

  const value = input.trim();
  if (value === '') return { ok: false, error: MONEY_MESSAGES.required };
  if (TOO_MANY_DECIMALS.test(value)) return { ok: false, error: MONEY_MESSAGES.decimals };

  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return { ok: false, error: MONEY_MESSAGES.invalid };

  const integerDigits = (match[1] ?? '').replace(/^0+(?=\d)/, '');
  // More than 8 rupee digits is always above ₹1 crore; checking first keeps Number() exact.
  if (integerDigits.length > 8) return { ok: false, error: MONEY_MESSAGES.tooLarge };

  const fraction = (match[2] ?? '').padEnd(2, '0');
  const paise = Number(integerDigits) * 100 + Number(fraction);

  if (paise === 0) return { ok: false, error: MONEY_MESSAGES.zero };
  if (paise > MAX_PAISE) return { ok: false, error: MONEY_MESSAGES.tooLarge };
  return { ok: true, paise };
}

/** Groups digits the Indian way: 1234567 → "12,34,567". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+$)/g, ',')},${lastThree}`;
}

/**
 * Formats paise for display: 12500000 → "₹1,25,000"; 25050 → "₹250.50".
 * Paise are shown only when non-zero. Deterministic, no Intl dependency.
 */
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) throw new RangeError('paise must be a safe integer');
  const sign = paise < 0 ? '-' : '';
  const absolute = Math.abs(paise);
  const rupees = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const fraction = remainder === 0 ? '' : `.${String(remainder).padStart(2, '0')}`;
  return `${sign}₹${groupIndian(String(rupees))}${fraction}`;
}

/** Converts paise to the plain rupee string used in form fields: 500050 → "5000.50". */
export function paiseToRupeesInput(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainder = paise % 100;
  return remainder === 0 ? String(rupees) : `${rupees}.${String(remainder).padStart(2, '0')}`;
}
