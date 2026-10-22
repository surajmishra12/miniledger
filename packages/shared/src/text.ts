/**
 * Text helpers (architecture.md §4.1, §6.5).
 * Length limits count Unicode code points, matching PostgreSQL varchar(n).
 */

export const PERSON_NAME_MAX = 80;
export const DISPLAY_NAME_MAX = 60;
export const NOTE_MAX = 500;

/** Number of Unicode code points (not UTF-16 units). */
export function codePointLength(value: string): number {
  return [...value].length;
}

/** NFC-normalizes, trims and collapses internal whitespace to single spaces. */
export function normalizeText(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** Key used for person matching, search and sorting. */
export function nameKey(value: string): string {
  return normalizeText(value).toLowerCase();
}
