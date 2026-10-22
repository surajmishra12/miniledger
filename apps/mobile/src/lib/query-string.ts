/** Builds "?a=1&b=x" from defined values (React Native's URLSearchParams is incomplete). */
export function queryString(params: Record<string, string | number | boolean | null | undefined>) {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}
