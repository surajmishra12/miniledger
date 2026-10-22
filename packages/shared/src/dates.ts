/**
 * Calendar-date helpers (architecture.md §4.5).
 * Dates are `YYYY-MM-DD` strings with no time of day; arithmetic uses UTC midnight.
 */

export const DATE_MIN = '2000-01-01';
export const DATE_MAX = '2099-12-31';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export const DATE_MESSAGES = {
  invalid: 'Enter a valid date',
  range: 'Choose a date between 2000 and 2099',
  future: "Date can't be in the future",
} as const;

function parts(value: string): [number, number, number] | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True for a real calendar date in YYYY-MM-DD format (leap years included). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const p = parts(value);
  if (!p) return false;
  const [year, month, day] = p;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** True for a calendar date within the supported range 2000-01-01 … 2099-12-31. */
export function isSupportedDate(value: unknown): value is string {
  return isCalendarDate(value) && value >= DATE_MIN && value <= DATE_MAX;
}

function toUtcMs(value: string): number {
  const p = parts(value);
  if (!p) throw new RangeError(`Invalid date: ${value}`);
  return Date.UTC(p[0], p[1] - 1, p[2]);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** Adds (or subtracts) whole days to a date. */
export function addDays(value: string, days: number): string {
  return new Date(toUtcMs(value) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
