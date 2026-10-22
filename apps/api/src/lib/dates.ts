/**
 * Server-side calendar helpers (architecture.md §4.5). Only the server decides "today".
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** Today's date (YYYY-MM-DD) in an IANA timezone. */
export function todayIn(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const SUPPORTED_ZONES = new Map(
  Intl.supportedValuesOf('timeZone').map((zone) => [zone.toLowerCase(), zone]),
);

/**
 * Validated IANA name with canonical casing, or null when the runtime does not know the zone.
 * The supplied name is kept (not ICU's resolved alias), so "Asia/Kolkata" never becomes the
 * legacy "Asia/Calcutta".
 */
export function canonicalTimeZone(value: string): string | null {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    return null;
  }
  return SUPPORTED_ZONES.get(value.toLowerCase()) ?? value;
}

/** YYYY-MM-DD → Date at UTC midnight, for Prisma @db.Date columns. */
export function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Prisma @db.Date value → YYYY-MM-DD. */
export function fromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
