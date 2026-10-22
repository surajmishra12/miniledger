import { notFound } from './errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route `:id` values: anything that is not a UUID is simply "not found" (architecture.md §6.3). */
export function routeId(value: string | undefined): string {
  if (!value || !UUID.test(value)) throw notFound();
  return value.toLowerCase();
}
