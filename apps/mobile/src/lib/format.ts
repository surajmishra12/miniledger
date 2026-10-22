/**
 * Display helpers (design.md §1.3, §11). Deterministic; no Intl dependency for dates.
 */
import { daysBetween, type LoanDto } from '@miniledger/shared';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y ?? 0, m ?? 1, d ?? 1];
}

/** "22 Oct", or "22 Oct 2025" when not in the reference year. */
export function formatDateShort(date: string, today: string): string {
  const [y, m, d] = parts(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return `${d} ${MONTHS_SHORT[m - 1]}${sameYear ? '' : ` ${y}`}`;
}

/** "22 October 2026". */
export function formatDateLong(date: string): string {
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export type Tone = 'danger' | 'warning' | 'success' | 'neutral';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Exact due-status labels (design.md §1.3) from server-computed fields. */
export function dueStatus(
  loan: Pick<LoanDto, 'repaymentStatus' | 'isOverdue' | 'daysOverdue' | 'dueDate' | 'asOfDate'>,
): { label: string; tone: Tone } {
  if (loan.repaymentStatus === 'REPAID') return { label: 'Repaid', tone: 'success' };
  if (loan.isOverdue)
    return { label: `${plural(loan.daysOverdue, 'day')} overdue`, tone: 'danger' };
  const days = daysBetween(loan.asOfDate, loan.dueDate);
  if (days <= 0) return { label: 'Due today', tone: 'warning' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'warning' };
  return { label: `Due in ${plural(days, 'day')}`, tone: 'neutral' };
}

function graphemes(value: string): string[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'grapheme' },
      ) => { segment(input: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
      (s) => s.segment,
    );
  }
  return Array.from(value);
}

/** First grapheme of the first and last words, uppercased where the script has case. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = graphemes(words[0]!)[0] ?? '';
  const last = words.length > 1 ? (graphemes(words[words.length - 1]!)[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** Device IANA timezone, or null if unavailable. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** Today's date on the device (only for picker defaults; the server owns "today" for money). */
export function deviceToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** YYYY-MM-DD ↔ local Date for the native date picker. */
export function dateFromIso(value: string): Date {
  const [y, m, d] = parts(value);
  return new Date(y, m - 1, d);
}

export function isoFromDate(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
